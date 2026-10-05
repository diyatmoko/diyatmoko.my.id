#!/usr/bin/env bash
# Run once on your own computer, with GitHub CLI and administrator SSH access.
set -Eeuo pipefail
umask 077

fail() { printf 'Setup failed: %s\n' "$*" >&2; exit 1; }
prompt() {
  local answer
  read -r -p "$2${3:+ [$3]}: " answer
  printf -v "$1" '%s' "${answer:-$3}"
}
for tool in gh ssh scp ssh-keygen base64; do command -v "$tool" >/dev/null || fail "Install prerequisite: $tool"; done
cd "$(dirname "${BASH_SOURCE[0]}")/.."
repository=${GITHUB_REPOSITORY:-diyatmoko/diyatmoko.my.id}
[[ $repository =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]] || fail 'Invalid repository name.'
gh auth status >/dev/null 2>&1 || fail 'Run gh auth login using the repository owner, then rerun setup.'
[[ $(gh api "repos/$repository" --jq '.permissions.admin') == true ]] || fail 'The active GitHub account needs repository admin access to configure its environment and secrets.'

printf 'One-time setup for %s. Private keys remain outside the repository.\n' "$repository"
prompt host 'VPS IPv4 address or DNS hostname' ''
prompt admin 'Existing administrator SSH username' 'ubuntu'
prompt port 'SSH port' '22'
prompt site_url 'Public HTTPS origin' 'https://diyatmoko.my.id'
prompt bind_port 'Portfolio loopback port on VPS' '18080'
prompt proxy_network 'Docker network attached to public Nginx (blank for host Nginx)' ''
[[ $host =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || fail 'Enter an IPv4 address or DNS hostname.'
[[ $admin =~ ^[a-z_][a-z0-9_-]*$ ]] || fail 'Invalid administrator username.'
[[ $port =~ ^[0-9]{1,5}$ ]] && ((10#$port >= 1 && 10#$port <= 65535)) || fail 'Invalid SSH port.'
[[ $bind_port =~ ^[0-9]{4,5}$ ]] && ((10#$bind_port >= 1024 && 10#$bind_port <= 65535)) || fail 'Invalid portfolio port.'
[[ $site_url =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?$ ]] || fail 'Enter an HTTPS origin without a trailing slash or path.'
[[ -z $proxy_network || $proxy_network =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || fail 'Invalid Docker network name.'

key_directory="${XDG_CONFIG_HOME:-$HOME/.config}/diyatmoko-portfolio/$host-$port"
mkdir -p "$key_directory"
chmod 700 "$key_directory"
known_hosts="$key_directory/known_hosts"
touch "$known_hosts"
chmod 600 "$known_hosts"
admin_options=(-p "$port" -o StrictHostKeyChecking=ask -o "UserKnownHostsFile=$known_hosts" -o ConnectTimeout=10)
printf 'Check the SSH host fingerprint against the VPS console before accepting a new host.\n'
ssh "${admin_options[@]}" "$admin@$host" 'if [ "$(id -u)" = 0 ]; then command -v docker >/dev/null; else sudo -n true; fi'

# Create a main-only deployment environment, preserving an existing environment.
error_file=$(mktemp "$key_directory/gh-error.XXXXXXXX")
trap 'rm -f -- "$error_file"' EXIT
if ! environment_policy=$(gh api "repos/$repository/environments/production" --jq '.deployment_branch_policy.custom_branch_policies' 2>"$error_file"); then
  if [[ $(cat "$error_file") == *'HTTP 404'* ]]; then
    environment_policy=missing
  else
    cat "$error_file" >&2
    fail 'Cannot read the production environment. Existing settings were preserved.'
  fi
fi
if [[ $environment_policy == missing ]]; then
  printf '%s\n' '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' |
    gh api --method PUT "repos/$repository/environments/production" --input - >/dev/null
elif [[ $environment_policy != true ]]; then
  fail 'The existing production environment has a different branch policy. Set Selected branches → main in GitHub, preserving its other protections, then rerun setup.'
fi
other_policies=$(gh api --paginate "repos/$repository/environments/production/deployment-branch-policies" --jq '.branch_policies[] | select(.name != "main" or (.type != null and .type != "branch")) | .name')
[[ -z $other_policies ]] || fail 'The existing production environment permits other branches/tags. Restrict it to branch main before storing VPS secrets.'
policy_names=$(gh api --paginate "repos/$repository/environments/production/deployment-branch-policies" --jq '.branch_policies[] | .name')
if ! printf '%s\n' "$policy_names" | grep -Fxq main; then
  printf '%s\n' '{"name":"main","type":"branch"}' |
    gh api --method POST "repos/$repository/environments/production/deployment-branch-policies" --input - >/dev/null
fi

key="$key_directory/id_ed25519"
if [[ ! -f $key ]]; then ssh-keygen -q -t ed25519 -N '' -C "github-actions:$repository" -f "$key"; fi
[[ -f $key.pub ]] || fail 'The existing deployment key has no public-key file.'
public_key_base64=$(base64 < "$key.pub" | tr -d '\r\n')
ssh "${admin_options[@]}" "$admin@$host" \
  "if [ \"\$(id -u)\" = 0 ]; then bash -s -- '$public_key_base64' '$bind_port' '$proxy_network'; else sudo -n bash -s -- '$public_key_base64' '$bind_port' '$proxy_network'; fi" < deploy/bootstrap-vps.sh

deploy_options=(-i "$key" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$known_hosts" -o ConnectTimeout=10)
ssh -p "$port" "${deploy_options[@]}" "portfolio-deploy@$host" 'docker info >/dev/null'
scp -P "$port" "${deploy_options[@]}" deploy/vps-rollout.sh "portfolio-deploy@$host:/opt/diyatmoko-portfolio/bin/rollout.sh"
ssh -p "$port" "${deploy_options[@]}" "portfolio-deploy@$host" 'chmod 700 /opt/diyatmoko-portfolio/bin/rollout.sh'
effective_config=$(ssh -p "$port" "${deploy_options[@]}" "portfolio-deploy@$host" 'cat /opt/diyatmoko-portfolio/config')
while IFS='=' read -r setting value; do
  case $setting in
    PORTFOLIO_BIND_PORT) bind_port=$value ;;
    PORTFOLIO_PROXY_NETWORK) proxy_network=$value ;;
  esac
done <<< "$effective_config"

printf '%s' "$host" | gh secret set VPS_HOST --repo "$repository" --env production
printf '%s' portfolio-deploy | gh secret set VPS_USER --repo "$repository" --env production
gh secret set VPS_SSH_KEY --repo "$repository" --env production < "$key"
gh secret set VPS_KNOWN_HOSTS --repo "$repository" --env production < "$known_hosts"
gh variable set VPS_PORT --repo "$repository" --body "$port"
gh variable set SITE_URL --repo "$repository" --body "$site_url"

printf '\nSSH and GitHub configuration completed.\nRun: Actions → Portfolio CI & VPS → Run workflow → main → operation: deploy.\n'
if [[ -n $proxy_network ]]; then
  printf 'Public Nginx upstream: http://diyatmoko-portfolio:8080 on network %s. Use Docker DNS resolver 127.0.0.11.\n' "$proxy_network"
else
  printf 'Host Nginx upstream: http://127.0.0.1:%s.\n' "$bind_port"
fi
printf 'Complete the domain/TLS virtual host once using deploy/nginx-vps.conf.example and DEPLOYMENT.md.\n'
printf 'To enable subsequent automatic main deployments: gh variable set VPS_AUTO_DEPLOY --repo %s --body true\n' "$repository"
