#!/usr/bin/env python3
# Managed by diyatmoko/diyatmoko.my.id scripts/setup-domain.py
"""One-time public Nginx/ACME setup; normal releases remain in GitHub Actions."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

DOMAIN = "diyatmoko.my.id"
MARKER = "# Managed by diyatmoko/diyatmoko.my.id scripts/setup-domain.py"
CERTBOT_IMAGE = "certbot/certbot:v5.8.0"
DEFAULT_ROOT = Path("/opt/diyatmoko-portfolio")


class SetupError(Exception):
    pass


def run(args, *, capture=True, diagnostics=False):
    result = subprocess.run(args, text=True, capture_output=capture, check=False)
    if result.returncode:
        detail = (result.stderr or result.stdout or "").strip() if capture else ""
        raise SetupError(f"Command failed: {args[0]} {args[1]}\n{detail}")
    if diagnostics:
        return "\n".join(filter(None, (result.stdout, result.stderr))).strip()
    return (result.stdout or "").strip()


def atomic_write(path, content, mode=0o644):
    descriptor, temporary = tempfile.mkstemp(prefix=".portfolio-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def render(phase):
    challenge = """    location ^~ /.well-known/acme-challenge/ {
        auth_basic off;
        root /var/www/certbot;
        default_type text/plain;
        try_files $uri =404;
    }
"""
    proxy = """    location / {
        resolver 127.0.0.11 valid=5s ipv6=off;
        set $portfolio_upstream diyatmoko-portfolio:8080;
        proxy_pass http://$portfolio_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
"""
    http = f"{MARKER}\n# Portfolio phase: {phase}\nserver {{\n    listen 80;\n    listen [::]:80;\n    server_name {DOMAIN};\n\n{challenge}"
    if phase == "http":
        return http + proxy + "}\n"
    return http + f"    location / {{ return 301 https://{DOMAIN}$request_uri; }}\n}}\n\nserver {{\n    listen 443 ssl;\n    listen [::]:443 ssl;\n    server_name {DOMAIN};\n    ssl_certificate /etc/letsencrypt/live/{DOMAIN}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/{DOMAIN}/privkey.pem;\n    ssl_protocols TLSv1.2 TLSv1.3;\n\n" + proxy + "}\n"


def check_existing(conf_dir, target):
    if target.is_symlink():
        raise SetupError(f"Refusing a symbolic link at {target}.")
    if target.exists() and not target.read_text().startswith(MARKER + "\n"):
        raise SetupError(f"Existing file is not managed by this helper: {target}. Review it first.")
    for candidate in conf_dir.rglob("*.conf"):
        if candidate == target:
            continue
        content = re.sub(r"#[^\n]*", "", candidate.read_text())
        for names in re.findall(r"\bserver_name\s+([^;]+);", content):
            if DOMAIN in [name.strip("\"'") for name in names.split()]:
                raise SetupError(f"An existing virtual host already declares {DOMAIN}: {candidate}. Review that file first.")


def install_config(target, content, validate, reload_nginx, verify):
    previous = target.read_bytes() if target.exists() else None
    previous_mode = target.stat().st_mode & 0o777 if target.exists() else 0o644
    atomic_write(target, content.encode())
    reloaded = False
    try:
        validate()
        reloaded = True
        reload_nginx()
        verify()
    except BaseException:
        if previous is None:
            target.unlink(missing_ok=True)
        else:
            atomic_write(target, previous, previous_mode)
        try:
            validate()
            if reloaded:
                reload_nginx()
        except SetupError as recovery_error:
            raise SetupError(f"Previous configuration was restored on disk; Nginx recovery requires attention: {recovery_error}")
        raise


class DomainSetup:
    def __init__(self, nginx, app_root, ca_file=None):
        self.nginx, self.app_root, self.ca_file = nginx, app_root, ca_file
        info = json.loads(run(["docker", "inspect", nginx]))[0]
        if not info["State"]["Running"]:
            raise SetupError("The public Nginx container is not running.")
        mounts = {m["Destination"]: m for m in info["Mounts"]}
        paths = []
        for destination in ("/etc/nginx/conf.d", "/var/www/certbot", "/etc/letsencrypt"):
            mount = mounts.get(destination)
            if not mount or mount["Type"] != "bind" or not Path(mount["Source"]).is_dir():
                raise SetupError(f"Expected an existing directory bind mount at {destination}.")
            paths.append(Path(mount["Source"]))
        self.conf_dir, self.webroot, self.cert_root = paths
        self.target = self.conf_dir / "diyatmoko-portfolio.conf"
        self.ports = {}
        for port in (80, 443):
            mappings = info["NetworkSettings"]["Ports"].get(f"{port}/tcp") or []
            ipv4 = [int(m["HostPort"]) for m in mappings if m["HostIp"] in ("0.0.0.0", "127.0.0.1", "")]
            if len(set(ipv4)) != 1:
                raise SetupError(f"Expected one IPv4 host port for public Nginx port {port}.")
            self.ports[port] = ipv4[0]
        config_path = app_root / "config"
        state_path = app_root / "state"
        active_release = None
        if state_path.exists():
            state_lines = state_path.read_text().splitlines()
            active_release = state_lines[0] if state_lines else ""
            if not re.fullmatch(r"[0-9a-f]{40}-[0-9]+-[0-9]+", active_release):
                raise SetupError("Invalid active release in the VPS state.")
            config_path = app_root / "releases" / active_release / ".env"
        config = dict(line.split("=", 1) for line in config_path.read_text().splitlines() if "=" in line)
        network = config.get("PORTFOLIO_PROXY_NETWORK", "")
        if not network or network not in info["NetworkSettings"]["Networks"]:
            raise SetupError("The portfolio proxy network must also be attached to the public Nginx container. Rerun setup-vps.sh with that network.")
        port = config.get("PORTFOLIO_BIND_PORT", "")
        if not port.isdigit() or not 1024 <= int(port) <= 65535:
            raise SetupError("Invalid portfolio loopback port in the VPS configuration.")
        self.release = json.loads(run(["curl", "--fail", "--silent", "--show-error", "--noproxy", "*", "--max-time", "10", f"http://127.0.0.1:{port}/release.json"]))
        if self.release.get("repository") != "diyatmoko/diyatmoko.my.id" or not re.fullmatch(r"[0-9a-f]{40}-[0-9]+-[0-9]+", self.release.get("release_id", "")):
            raise SetupError("The loopback upstream does not identify a valid portfolio release.")
        if self.release.get("sha") != self.release["release_id"][:40]:
            raise SetupError("The portfolio release identity is inconsistent.")
        if active_release and self.release["release_id"] != active_release:
            raise SetupError("The loopback upstream does not match the active VPS release.")
        check_existing(self.conf_dir, self.target)
        self.validate()

    def validate(self):
        output = run(["docker", "exec", self.nginx, "nginx", "-t"], diagnostics=True)
        # Nginx reports conflicting names as warnings, rather than syntax failures.
        if f'conflicting server name "{DOMAIN}"' in output:
            raise SetupError("Nginx reports another virtual host for the portfolio domain.")

    def reload(self):
        run(["docker", "exec", self.nginx, "nginx", "-s", "reload"])

    def fetch(self, phase, path, *, local=True):
        protocol, port = ("https", self.ports[443]) if phase == "https" else ("http", self.ports[80])
        if not local:
            port = 443 if phase == "https" else 80
        args = ["curl", "--fail", "--silent", "--show-error", "--noproxy", "*", "--max-time", "5", "--header", "Cache-Control: no-cache"]
        if local:
            args += ["--resolve", f"{DOMAIN}:{port}:127.0.0.1"]
        if phase == "https" and self.ca_file:
            args += ["--cacert", str(self.ca_file)]
        return run(args + [f"{protocol}://{DOMAIN}:{port}{path}"])

    def verify(self, phase, *, public=False):
        last_error = None
        for attempt in range(8):
            try:
                observed = json.loads(self.fetch(phase, "/release.json", local=not public))
                if observed != self.release or self.fetch(phase, "/health.txt", local=not public) != "ok":
                    raise SetupError("The public virtual host is not serving the deployed portfolio release.")
                return
            except (SetupError, json.JSONDecodeError) as error:
                last_error = error
                if attempt < 7:
                    time.sleep(1)
        raise SetupError(f"Public virtual host verification failed: {last_error}")

    def check_certificate(self):
        certificate = self.cert_root / "live" / DOMAIN / "fullchain.pem"
        key = certificate.with_name("privkey.pem")
        if not certificate.is_file() or not key.is_file():
            raise SetupError("A certificate and private key are required before installing the HTTPS virtual host.")
        run(["openssl", "x509", "-in", str(certificate), "-noout", "-checkend", "86400"])
        output = run(["openssl", "x509", "-in", str(certificate), "-noout", "-checkhost", DOMAIN])
        if f"Hostname {DOMAIN} does match certificate" not in output:
            raise SetupError("The installed certificate does not cover the portfolio domain.")

    def configure(self, phase):
        if phase == "https":
            self.check_certificate()
        elif self.target.exists() and "# Portfolio phase: https\n" in self.target.read_text():
            raise SetupError("The domain already uses HTTPS. Run setup or renew to retain HTTPS.")
        def verify_config():
            self.verify(phase)
            if phase != "http":
                return
            challenge_dir = self.webroot / ".well-known" / "acme-challenge"
            challenge_dir.mkdir(parents=True, exist_ok=True)
            descriptor, token = tempfile.mkstemp(prefix="portfolio-check-", dir=challenge_dir)
            try:
                with os.fdopen(descriptor, "w") as output:
                    output.write(Path(token).name)
                os.chmod(token, 0o644)
                if self.fetch("http", "/.well-known/acme-challenge/" + Path(token).name) != Path(token).name:
                    raise SetupError("The ACME challenge path is not reachable through Nginx.")
            finally:
                Path(token).unlink(missing_ok=True)
        install_config(self.target, render(phase), self.validate, self.reload, verify_config)
        print(f"Verified {phase.upper()} routing for {DOMAIN}; release {self.release['release_id']}.")

    def certificate(self, renew=False):
        args = ["docker", "run", "--rm"]
        if not renew:
            args.append("-it")
        args += ["-v", f"{self.cert_root}:/etc/letsencrypt", "-v", f"{self.webroot}:/var/www/certbot", CERTBOT_IMAGE]
        if renew:
            args += ["renew", "--non-interactive", "--cert-name", DOMAIN, "--no-random-sleep-on-renew"]
        else:
            args += ["certonly", "--webroot", "-w", "/var/www/certbot", "--cert-name", DOMAIN, "-d", DOMAIN, "--keep-until-expiring"]
            print("Certbot will request email/account consent if registration is needed. Complete its prompts in this terminal.", flush=True)
        run(args, capture=False)
        self.check_certificate()


def install_renewal():
    directory = Path("/usr/local/lib/diyatmoko-portfolio")
    service = Path("/etc/systemd/system/diyatmoko-portfolio-cert-renew.service")
    timer = service.with_suffix(".timer")
    for path in (service, timer):
        if path.is_symlink() or (path.exists() and not path.read_text().startswith(MARKER + "\n")):
            raise SetupError(f"Unmanaged renewal unit exists: {path}.")
    directory.mkdir(mode=0o755, parents=True, exist_ok=True)
    if directory.is_symlink() or directory.stat().st_uid != 0 or directory.stat().st_mode & 0o022:
        raise SetupError("The renewal helper directory must be owned by root and not writable by other users.")
    installed = directory / "setup-domain.py"
    if installed.is_symlink() or (installed.exists() and installed.read_text().splitlines()[1:2] != [MARKER]):
        raise SetupError(f"Unmanaged renewal helper exists: {installed}.")
    atomic_write(installed, Path(__file__).read_bytes(), 0o755)
    atomic_write(service, (MARKER + "\n[Unit]\nDescription=Renew the diyatmoko.my.id portfolio certificate\nAfter=docker.service network-online.target\nWants=network-online.target\n\n[Service]\nType=oneshot\nExecStart=/usr/bin/python3 /usr/local/lib/diyatmoko-portfolio/setup-domain.py renew\nTimeoutStartSec=600\n").encode())
    atomic_write(timer, (MARKER + "\n[Unit]\nDescription=Check the diyatmoko.my.id certificate twice daily\n\n[Timer]\nOnCalendar=*-*-* 03,15:17:00\nRandomizedDelaySec=1h\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n").encode())
    run(["systemctl", "daemon-reload"])
    run(["systemctl", "enable", "--now", timer.name])
    print("Certificate renewal timer enabled: diyatmoko-portfolio-cert-renew.timer")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", nargs="?", choices=("setup", "http", "https", "renew"), default="setup")
    parser.add_argument("--nginx", default="nginx")
    parser.add_argument("--app-root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--ca-file", type=Path, help="Optional trusted CA file, for the isolated CI TLS test")
    options = parser.parse_args()
    if os.geteuid() != 0:
        raise SetupError("Run this one-time domain setup with sudo.")
    for executable in ("docker", "curl", "openssl"):
        if not shutil.which(executable):
            raise SetupError(f"Missing prerequisite: {executable}")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", options.nginx) or not options.app_root.is_absolute():
        raise SetupError("Invalid container name or deployment directory.")
    if options.phase in ("setup", "renew") and (options.nginx != "nginx" or options.app_root != DEFAULT_ROOT or options.ca_file):
        raise SetupError("Certificate setup/renewal requires the production defaults; overrides are available only for routing tests.")
    with (options.app_root / "deploy.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SetupError("Another rollout or domain setup is running; wait for it to finish.")
        setup = DomainSetup(options.nginx, options.app_root, options.ca_file)
        if options.phase == "setup":
            if not setup.target.exists() or "# Portfolio phase: https\n" not in setup.target.read_text():
                setup.configure("http")
            setup.certificate()
            setup.configure("https")
            install_renewal()
            setup.verify("https", public=True)
            print(f"HTTPS enabled. Open https://{DOMAIN}/ and verify its public release.json.")
        elif options.phase == "renew":
            setup.certificate(renew=True)
            setup.validate()
            setup.reload()
            setup.verify("https")
        else:
            setup.configure(options.phase)


if __name__ == "__main__":
    try:
        main()
    except (SetupError, OSError, ValueError) as error:
        print(f"Domain setup failed: {error}", file=sys.stderr)
        sys.exit(1)
