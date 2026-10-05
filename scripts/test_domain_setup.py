"""Test failure handling before modifying a shared production Nginx."""
import importlib.util
import json
from pathlib import Path
import subprocess
import shutil
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("domain_setup", Path(__file__).with_name("setup-domain.py"))
domain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(domain)


class DomainSetupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.conf = self.root / "conf"
        self.conf.mkdir()
        self.target = self.conf / "diyatmoko-portfolio.conf"
        self.other = self.conf / "ai.mesthi.com.conf"
        self.other.write_text("server { listen 80; server_name ai.mesthi.com; }\n")
        self.other_original = self.other.read_bytes()

    def test_syntax_failure_restores_previous_config_without_reloading(self):
        original = (domain.MARKER + "\nprevious configuration\n").encode()
        self.target.write_bytes(original)
        self.target.chmod(0o640)
        calls = []
        def validate():
            calls.append("validate")
            if len(calls) == 1:
                raise domain.SetupError("invalid new syntax")
        with self.assertRaisesRegex(domain.SetupError, "invalid new syntax"):
            domain.install_config(self.target, domain.render("http"), validate, lambda: calls.append("reload"), lambda: None)
        self.assertEqual(self.target.read_bytes(), original)
        self.assertEqual(self.target.stat().st_mode & 0o777, 0o640)
        self.assertNotIn("reload", calls)
        self.assertEqual(self.other.read_bytes(), self.other_original)

    def test_first_install_failure_removes_only_the_new_file(self):
        count = 0
        def validate():
            nonlocal count
            count += 1
            if count == 1:
                raise domain.SetupError("invalid new syntax")
        with self.assertRaises(domain.SetupError):
            domain.install_config(self.target, domain.render("http"), validate, lambda: None, lambda: None)
        self.assertFalse(self.target.exists())
        self.assertEqual(self.other.read_bytes(), self.other_original)

    def test_wrong_upstream_after_reload_restores_and_reloads_previous_config(self):
        original = (domain.MARKER + "\nold route\n").encode()
        self.target.write_bytes(original)
        snapshots = []
        def verify():
            raise domain.SetupError("wrong release")
        with self.assertRaisesRegex(domain.SetupError, "wrong release"):
            domain.install_config(self.target, domain.render("http"), lambda: None, lambda: snapshots.append(self.target.read_bytes()), verify)
        self.assertEqual(len(snapshots), 2)
        self.assertEqual(snapshots[1], original)
        self.assertEqual(self.other.read_bytes(), self.other_original)

    def test_unknown_file_is_preserved(self):
        self.target.write_text("user managed route\n")
        with self.assertRaisesRegex(domain.SetupError, "not managed"):
            domain.check_existing(self.conf, self.target)
        self.assertEqual(self.target.read_text(), "user managed route\n")

    def test_multiline_duplicate_domain_is_rejected(self):
        duplicate = self.conf / "existing.conf"
        duplicate.write_text("server { server_name\n ai.mesthi.com\n diyatmoko.my.id; }\n")
        with self.assertRaisesRegex(domain.SetupError, "already declares"):
            domain.check_existing(self.conf, self.target)
        self.assertFalse(self.target.exists())

    def test_commented_domain_does_not_block_a_new_route(self):
        self.other.write_text("# server_name diyatmoko.my.id;\nserver { server_name ai.mesthi.com; }\n")
        domain.check_existing(self.conf, self.target)

    def test_target_symlink_is_rejected(self):
        self.target.symlink_to(self.other)
        with self.assertRaisesRegex(domain.SetupError, "symbolic link"):
            domain.check_existing(self.conf, self.target)
        self.assertEqual(self.other.read_bytes(), self.other_original)

    def fixture(self):
        webroot, certificates, app = (self.root / name for name in ("webroot", "certificates", "app"))
        for folder in (webroot, certificates, app):
            folder.mkdir()
        (app / "config").write_text("PORTFOLIO_BIND_PORT=18081\nPORTFOLIO_PROXY_NETWORK=edge\n")
        info = {
            "State": {"Running": True},
            "Mounts": [{"Type": "bind", "Destination": destination, "Source": str(source)} for destination, source in zip(("/etc/nginx/conf.d", "/var/www/certbot", "/etc/letsencrypt"), (self.conf, webroot, certificates))],
            "NetworkSettings": {"Ports": {"80/tcp": [{"HostIp": "0.0.0.0", "HostPort": "80"}], "443/tcp": [{"HostIp": "0.0.0.0", "HostPort": "443"}]}, "Networks": {"edge": {}}},
        }
        sha = "a" * 40
        release = {"repository": "diyatmoko/diyatmoko.my.id", "sha": sha, "release_id": sha + "-1-1"}
        calls = []
        def runner(args, **kwargs):
            calls.append(args)
            if args[:2] == ["docker", "inspect"]:
                return json.dumps([info])
            if args[0] == "curl":
                return json.dumps(release)
            return "configuration test successful"
        return app, certificates, info, release, calls, runner

    def test_foreign_repository_upstream_is_rejected_before_route_creation(self):
        app, _, _, release, _, runner = self.fixture()
        release["repository"] = "arumora-id/ai.mesthi.com"
        with patch.object(domain, "run", side_effect=runner), self.assertRaisesRegex(domain.SetupError, "valid portfolio release"):
            domain.DomainSetup("nginx", app)
        self.assertFalse(self.target.exists())

    def test_missing_shared_network_is_rejected(self):
        app, _, info, _, _, runner = self.fixture()
        info["NetworkSettings"]["Networks"] = {"other": {}}
        with patch.object(domain, "run", side_effect=runner), self.assertRaisesRegex(domain.SetupError, "proxy network"):
            domain.DomainSetup("nginx", app)
        self.assertFalse(self.target.exists())

    def test_active_release_port_is_used_after_rollback(self):
        app, _, _, release, calls, runner = self.fixture()
        (app / "config").write_text("PORTFOLIO_BIND_PORT=19000\nPORTFOLIO_PROXY_NETWORK=wrong\n")
        (app / "state").write_text(release["release_id"] + "\n")
        folder = app / "releases" / release["release_id"]
        folder.mkdir(parents=True)
        (folder / ".env").write_text("PORTFOLIO_BIND_PORT=18081\nPORTFOLIO_PROXY_NETWORK=edge\n")
        with patch.object(domain, "run", side_effect=runner):
            domain.DomainSetup("nginx", app)
        self.assertIn("http://127.0.0.1:18081/release.json", calls[1])

    def test_active_release_mismatch_is_rejected(self):
        app, _, _, release, _, runner = self.fixture()
        active = "b" * 40 + "-2-1"
        (app / "state").write_text(active + "\n")
        folder = app / "releases" / active
        folder.mkdir(parents=True)
        (folder / ".env").write_text((app / "config").read_text())
        with patch.object(domain, "run", side_effect=runner), self.assertRaisesRegex(domain.SetupError, "active VPS release"):
            domain.DomainSetup("nginx", app)

    def test_https_without_certificate_preserves_http_route(self):
        app, _, _, _, _, runner = self.fixture()
        self.target.write_text(domain.render("http"))
        original = self.target.read_bytes()
        with patch.object(domain, "run", side_effect=runner):
            setup = domain.DomainSetup("nginx", app)
            with self.assertRaisesRegex(domain.SetupError, "certificate and private key"):
                setup.configure("https")
        self.assertEqual(self.target.read_bytes(), original)

    def test_wrong_certificate_hostname_is_rejected(self):
        app, certificates, _, _, _, runner = self.fixture()
        folder = certificates / "live" / domain.DOMAIN
        folder.mkdir(parents=True)
        (folder / "fullchain.pem").write_text("fixture certificate")
        (folder / "privkey.pem").write_text("fixture key")
        with patch.object(domain, "run", side_effect=runner):
            setup = domain.DomainSetup("nginx", app)
        with patch.object(domain, "run", return_value=f"Hostname {domain.DOMAIN} does NOT match certificate"), self.assertRaisesRegex(domain.SetupError, "does not cover"):
            setup.check_certificate()

    @unittest.skipUnless(shutil.which("openssl"), "OpenSSL is a setup prerequisite")
    def test_real_certificate_hostname_and_expiry_are_checked_separately(self):
        app, certificates, _, _, _, runner = self.fixture()
        folder = certificates / "live" / domain.DOMAIN
        folder.mkdir(parents=True)
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-keyout", str(folder / "privkey.pem"), "-out", str(folder / "fullchain.pem"), "-subj", "/CN=diyatmoko.my.id", "-addext", "subjectAltName=DNS:diyatmoko.my.id"], check=True, capture_output=True)
        with patch.object(domain, "run", side_effect=runner):
            setup = domain.DomainSetup("nginx", app)
        setup.check_certificate()
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2", "-keyout", str(folder / "privkey.pem"), "-out", str(folder / "fullchain.pem"), "-subj", "/CN=wrong.example", "-addext", "subjectAltName=DNS:wrong.example"], check=True, capture_output=True)
        with self.assertRaisesRegex(domain.SetupError, "does not cover"):
            setup.check_certificate()

    def test_conflicting_server_name_warning_is_a_failure(self):
        setup = object.__new__(domain.DomainSetup)
        setup.nginx = "nginx"
        result = subprocess.CompletedProcess([], 0, "", f'nginx: [warn] conflicting server name "{domain.DOMAIN}" on 0.0.0.0:80, ignored\n')
        with patch.object(domain.subprocess, "run", return_value=result), self.assertRaisesRegex(domain.SetupError, "another virtual host"):
            setup.validate()

    def test_renewal_scopes_certificate_and_preserves_consent(self):
        setup = object.__new__(domain.DomainSetup)
        setup.cert_root, setup.webroot = self.root / "certs", self.root / "webroot"
        setup.check_certificate = lambda: None
        with patch.object(domain, "run") as runner:
            setup.certificate(renew=True)
        args = runner.call_args.args[0]
        self.assertEqual(args[args.index("--cert-name") + 1], domain.DOMAIN)
        self.assertNotIn("--agree-tos", args)
        self.assertNotIn("--force-renewal", args)
        self.assertNotIn("-it", args)


if __name__ == "__main__":
    unittest.main()
