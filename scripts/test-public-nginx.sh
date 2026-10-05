#!/usr/bin/env bash
# Real Docker smoke test for the public domain helper, isolated from production.
set -Eeuo pipefail
[[ ${GITHUB_ACTIONS:-} == true ]] || { printf 'Run this isolated test in GitHub Actions, not on the production VPS.\n' >&2; exit 1; }
fixture=$(mktemp -d)
network="portfolio-public-test-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
public_container="$network"
backend=''
network_created=false
public_created=false
backend_connected=false
cleanup() {
  local status=$?
  trap - EXIT
  set +e
  if $public_created; then docker rm -f "$public_container" >/dev/null 2>&1; fi
  if $backend_connected; then docker network disconnect "$network" "$backend" >/dev/null 2>&1; fi
  if $network_created; then docker network rm "$network" >/dev/null 2>&1; fi
  rm -rf -- "$fixture"
  exit "$status"
}
trap cleanup EXIT
backend=$(docker compose -p diyatmoko-portfolio-vps -f deploy/compose.vps.yaml ps -q portfolio)
[[ -n $backend ]] || { printf 'Missing tested portfolio container.\n' >&2; exit 1; }
chmod 755 "$fixture"
mkdir -p "$fixture/config" "$fixture/webroot/.well-known/acme-challenge" "$fixture/certs" "$fixture/app"
printf 'PORTFOLIO_BIND_PORT=18080\nPORTFOLIO_PROXY_NETWORK=%s\n' "$network" > "$fixture/app/config"
printf 'server { listen 80; server_name other.example; location / { return 200 "unrelated site"; } }\n' > "$fixture/config/other.conf"
original=$(sha256sum "$fixture/config/other.conf")
docker network create "$network" >/dev/null
network_created=true
docker network connect --alias diyatmoko-portfolio "$network" "$backend"
backend_connected=true
docker create --name "$public_container" --network "$network" \
  -p 127.0.0.1:18082:80 -p 127.0.0.1:18443:443 \
  -v "$fixture/config:/etc/nginx/conf.d:ro" \
  -v "$fixture/webroot:/var/www/certbot:ro" \
  -v "$fixture/certs:/etc/letsencrypt:ro" nginx:1.28-alpine >/dev/null
public_created=true
docker start "$public_container" >/dev/null
ready=false
for attempt in {1..15}; do
  if body=$(curl --fail --silent --max-time 2 --resolve other.example:18082:127.0.0.1 http://other.example:18082/) && [[ $body == 'unrelated site' ]]; then
    ready=true
    break
  fi
  sleep 1
done
$ready || { printf 'The isolated public Nginx did not become ready.\n' >&2; exit 1; }
sudo python3 scripts/setup-domain.py http --nginx "$public_container" --app-root "$fixture/app"
http_config=$(sha256sum "$fixture/config/diyatmoko-portfolio.conf")
if sudo python3 scripts/setup-domain.py https --nginx "$public_container" --app-root "$fixture/app"; then
  printf 'HTTPS must fail before its certificate exists.\n' >&2
  exit 1
fi
[[ $(sha256sum "$fixture/config/diyatmoko-portfolio.conf") == "$http_config" ]]
mkdir -p "$fixture/certs/live/diyatmoko.my.id"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 \
  -keyout "$fixture/certs/live/diyatmoko.my.id/privkey.pem" \
  -out "$fixture/certs/live/diyatmoko.my.id/fullchain.pem" \
  -subj '/CN=diyatmoko.my.id' -addext 'subjectAltName=DNS:diyatmoko.my.id' >/dev/null 2>&1
sudo python3 scripts/setup-domain.py https --nginx "$public_container" --app-root "$fixture/app" \
  --ca-file "$fixture/certs/live/diyatmoko.my.id/fullchain.pem"
curl --fail --silent --show-error --resolve other.example:18082:127.0.0.1 http://other.example:18082/ | grep -Fx 'unrelated site'
[[ $(sha256sum "$fixture/config/other.conf") == "$original" ]]
printf 'challenge-after-https' > "$fixture/webroot/.well-known/acme-challenge/after-https"
curl --fail --silent --show-error --resolve diyatmoko.my.id:18082:127.0.0.1 \
  http://diyatmoko.my.id:18082/.well-known/acme-challenge/after-https | grep -Fx challenge-after-https
curl --silent --show-error --resolve diyatmoko.my.id:18082:127.0.0.1 \
  --dump-header "$fixture/redirect" --output /dev/null http://diyatmoko.my.id:18082/
tr -d '\r' < "$fixture/redirect" | grep -Fx 'Location: https://diyatmoko.my.id/'
docker run --rm certbot/certbot:v5.8.0 --version
printf 'Public HTTP/HTTPS, release identity, ACME path, unrelated virtual host, and Certbot image checks passed.\n'
