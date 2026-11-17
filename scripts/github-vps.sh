#!/usr/bin/env bash
# GitHub-hosted runner -> pinned-host SSH -> dedicated VPS Compose project.
set -Eeuo pipefail
umask 077

fail() { printf 'SSH deployment failed: %s\n' "$*" >&2; exit 1; }
[[ ${1:-} == deploy || ${1:-} == rollback ]] || fail 'Expected deploy or rollback.'
operation=$1
if [[ -z ${VPS_SSH_KEY:-} && -n ${VPS_SSH_KEY_B64:-} ]]; then
  VPS_SSH_KEY=$(printf '%s' "$VPS_SSH_KEY_B64" | base64 --decode) || fail 'VPS_SSH_KEY_B64 is not valid base64.'
fi
VPS_KNOWN_HOSTS=${VPS_KNOWN_HOSTS:-${VPS_HOST_KEY:-}}
for setting in VPS_HOST VPS_USER VPS_SSH_KEY VPS_KNOWN_HOSTS; do
  [[ -n ${!setting:-} ]] || fail "Set production environment secret $setting."
done
[[ $VPS_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || fail 'VPS_HOST must be an IPv4 address or DNS hostname.'
[[ $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ]] || fail 'Invalid VPS_USER.'
port=${VPS_PORT:-22}
[[ $port =~ ^[0-9]{1,5}$ ]] && ((10#$port >= 1 && 10#$port <= 65535)) || fail 'Invalid VPS_PORT.'
if [[ $operation == deploy ]]; then
  [[ ${2:-} =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || fail 'A validated release ID is required.'
  for file in image.tar.gz image.tar.gz.sha256; do [[ -f release-image/$file ]] || fail "Missing release-image/$file"; done
fi

temporary=$(mktemp -d "${RUNNER_TEMP:-/tmp}/portfolio-ssh.XXXXXXXX")
printf '%s\n' "$VPS_SSH_KEY" > "$temporary/key"
printf '%s\n' "$VPS_KNOWN_HOSTS" > "$temporary/known_hosts"
chmod 600 "$temporary/key" "$temporary/known_hosts"
common=(-i "$temporary/key" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$temporary/known_hosts" -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
ssh_options=(-p "$port" "${common[@]}")
remote="$VPS_USER@$VPS_HOST"
cleanup() {
  local status=$?
  trap - EXIT
  rm -rf -- "$temporary"
  exit "$status"
}
trap cleanup EXIT

# The deploy key is pinned to a forced-command gate on the VPS
# (mesthi-infra platform/edge/deploy-gates/portfolio-ssh-gate). Only two
# requests exist, and the rollout script and Compose files are root-owned on
# the VPS: CI sends nothing but the validated image archive.
if [[ $operation == deploy ]]; then
  tar -C release-image -cf - image.tar.gz image.tar.gz.sha256 | ssh "${ssh_options[@]}" "$remote" "deploy $2"
else
  ssh "${ssh_options[@]}" "$remote" rollback < /dev/null
fi
