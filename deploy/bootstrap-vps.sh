#!/usr/bin/env bash
# Invoked by scripts/setup-vps.sh over an existing administrator SSH connection.
set -Eeuo pipefail
umask 077

fail() { printf 'Setup failed: %s\n' "$*" >&2; exit 1; }
[[ $(id -u) == 0 ]] || fail 'Run through root or passwordless sudo.'
[[ $# == 3 ]] || fail 'Expected public-key base64, loopback port, and optional proxy network.'
public_key=$(printf '%s' "$1" | base64 --decode)
bind_port=$2
proxy_network=$3
[[ $public_key =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ .*)?$ ]] || fail 'An Ed25519 public key is required.'
[[ $bind_port =~ ^[0-9]{4,5}$ ]] && ((10#$bind_port >= 1024 && 10#$bind_port <= 65535)) || fail 'Invalid loopback port.'
[[ -z $proxy_network || $proxy_network =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || fail 'Invalid Docker network.'
[[ $(uname -m) == x86_64 ]] || fail 'This workflow targets x86_64/amd64; ARM requires an ARM runner/image.'

for tool in docker curl flock sha256sum ss useradd usermod install; do
  command -v "$tool" >/dev/null || fail "Missing prerequisite: $tool"
done
docker info >/dev/null
compose_help=$(docker compose up --help)
[[ $compose_help == *--wait-timeout* ]] || fail 'Update Docker Compose to a version supporting --wait-timeout.'
if [[ -n $proxy_network ]]; then docker network inspect "$proxy_network" >/dev/null; fi

root=/opt/diyatmoko-portfolio
deploy_user=portfolio-deploy
# On a fresh setup, catch port conflicts before creating the deployment account.
if [[ ! -f $root/state ]] && [[ -n $(ss -H -ltn "sport = :$bind_port") ]]; then
  fail "Port $bind_port is already in use. Choose another port."
fi
if ! id "$deploy_user" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$deploy_user"
fi
[[ $(getent passwd "$deploy_user" | cut -d: -f6) == /home/portfolio-deploy ]] || fail 'Existing account has an unexpected home directory.'
usermod -aG docker "$deploy_user"
install -d -m 700 -o "$deploy_user" -g "$deploy_user" "/home/$deploy_user/.ssh"
authorized_keys="/home/$deploy_user/.ssh/authorized_keys"
touch "$authorized_keys"
key_line="restrict $public_key"
if ! grep -Fqx "$key_line" "$authorized_keys"; then printf '%s\n' "$key_line" >> "$authorized_keys"; fi
chmod 600 "$authorized_keys"
chown "$deploy_user:$deploy_user" "$authorized_keys"
install -d -m 750 -o "$deploy_user" -g "$deploy_user" "$root" "$root/incoming" "$root/releases" "$root/bin"
# Preserve live configuration on subsequent runs; change it deliberately on the VPS.
if [[ ! -f $root/config ]]; then
  printf 'PORTFOLIO_BIND_PORT=%s\nPORTFOLIO_PROXY_NETWORK=%s\n' "$bind_port" "$proxy_network" > "$root/config"
  chmod 600 "$root/config"
  chown "$deploy_user:$deploy_user" "$root/config"
fi
printf 'VPS prepared: %s; user: %s. Existing Nginx and TLS settings were preserved.\n' "$root" "$deploy_user"
