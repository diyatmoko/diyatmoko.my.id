#!/usr/bin/env bash
# Runs on the VPS. State and release configurations stay together for rollback.
set -Eeuo pipefail
umask 077

fail() { printf 'Deployment failed: %s\n' "$*" >&2; exit 1; }
valid_release() { [[ $1 =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; }
root=${PORTFOLIO_ROOT:-/opt/diyatmoko-portfolio}
[[ $root =~ ^/[a-zA-Z0-9_/-]+$ && $root != / ]] || fail 'Invalid deployment directory.'
[[ -d $root/incoming && -d $root/releases && -f $root/config ]] || fail 'Run the one-time VPS setup first.'
[[ ${1:-} == deploy || ${1:-} == rollback ]] || fail 'Expected deploy or rollback.'
operation=$1
incoming=''
target=''
current=''
previous=''
switching=false
bind_port=18080
proxy_network=''

exec 9>"$root/deploy.lock"
flock -n 9 || fail 'Another deployment is running on this VPS.'

read_state() {
  current=''; previous=''
  if [[ -f $root/state ]]; then
    IFS= read -r current < "$root/state" || true
    previous=$(sed -n '2p' "$root/state")
    valid_release "$current" || fail 'Invalid current release in state.'
    [[ -z $previous ]] || valid_release "$previous" || fail 'Invalid previous release in state.'
  fi
}

compose() {
  local release=$1
  shift
  valid_release "$release" || return 1
  local folder="$root/releases/$release"
  local args=(--project-name diyatmoko-portfolio-vps --project-directory "$folder" --env-file "$folder/.env" -f "$folder/compose.yaml")
  if [[ -f $folder/proxy.yaml ]]; then args+=(-f "$folder/proxy.yaml"); fi
  docker compose "${args[@]}" "$@"
}

healthy() {
  local release=$1 port body
  port=$(sed -n 's/^PORTFOLIO_BIND_PORT=//p' "$root/releases/$release/.env")
  [[ $port =~ ^[0-9]{4,5}$ ]] || return 1
  body=$(curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$port/") || return 1
  [[ $body == *'Yanuar Diyatmoko'* ]] || return 1
  curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$port/health.txt" >/dev/null || return 1
  body=$(curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$port/release.json") || return 1
  [[ $body == *"\"sha\":\"${release:0:40}\""* && $body == *"\"release_id\":\"$release\""* ]]
}

restore() {
  if [[ -n $current ]]; then
    printf 'Restoring release %s\n' "$current"
    compose "$current" up -d --no-build --pull never --wait --wait-timeout 60 && healthy "$current"
  elif [[ -n $target ]]; then
    # The first release has no predecessor; remove only this dedicated Compose project.
    compose "$target" down
  fi
}

finish() {
  local status=$?
  trap - EXIT HUP INT TERM
  set +e
  if $switching; then
    # An atomic state rename may already have committed the release before a signal.
    local committed=''
    if [[ -f $root/state ]]; then IFS= read -r committed < "$root/state"; fi
    if [[ $committed != "$target" ]]; then
      compose "$target" logs --tail 40 >&2
      if restore; then
        rm -f "$root/pending"
        printf 'Previous state restored.\n' >&2
        if [[ $operation == deploy && $target != "$current" && $target != "$previous" ]]; then
          if docker image rm "diyatmoko-portfolio:$target" >/dev/null 2>&1; then rm -rf -- "$root/releases/$target"; fi
        fi
      else
        printf 'Automatic recovery failed; inspect the VPS before another rollout.\n' >&2
        status=1
      fi
    fi
  fi
  if [[ -n $incoming ]]; then rm -rf -- "$incoming"; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

for tool in docker curl flock sha256sum; do command -v "$tool" >/dev/null || fail "Missing prerequisite: $tool"; done
read_state
# Recover an interrupted switch on the next invocation, including a host/runner crash.
if [[ -f $root/pending ]]; then
  IFS= read -r interrupted < "$root/pending" || true
  valid_release "$interrupted" || fail 'Invalid pending release.'
  if [[ $interrupted != "$current" ]]; then
    target=$interrupted
    restore || fail 'An interrupted deployment could not be recovered.'
  fi
  rm -f "$root/pending"
  target=''
fi

if [[ $operation == deploy ]]; then
  [[ $# == 3 ]] || fail 'Expected deploy, incoming directory, release ID.'
  upload_name=${2#"$root/incoming/"}
  [[ $2 == "$root/incoming/"* && $upload_name =~ ^[a-zA-Z0-9_-]+$ && ! -L $2 ]] || fail 'Invalid incoming directory.'
  incoming=$2; target=$3
  valid_release "$target" || fail 'Invalid release ID.'
  [[ ! -e $root/releases/$target ]] || fail 'This release ID already exists. Rerun with a new attempt.'
  for file in image.tar.gz image.tar.gz.sha256 compose.yaml compose.proxy.yaml; do
    [[ -f $incoming/$file && ! -L $incoming/$file ]] || fail "Missing release file: $file"
  done
  expected=$(awk 'NR == 1 { print $1 }' "$incoming/image.tar.gz.sha256")
  [[ $expected =~ ^[0-9a-f]{64}$ ]] || fail 'Invalid image checksum.'
  actual=$(sha256sum "$incoming/image.tar.gz"); actual=${actual%% *}
  [[ $actual == "$expected" ]] || fail 'Image checksum mismatch; the running release was preserved.'

  while IFS='=' read -r key value || [[ -n $key ]]; do
    case $key in
      PORTFOLIO_BIND_PORT) bind_port=$value ;;
      PORTFOLIO_PROXY_NETWORK) proxy_network=$value ;;
      ''|'#'*) ;;
      *) fail "Unknown setting in VPS config: $key" ;;
    esac
  done < "$root/config"
  [[ $bind_port =~ ^[0-9]{4,5}$ ]] && ((10#$bind_port >= 1024 && 10#$bind_port <= 65535)) || fail 'Invalid port in VPS config.'
  [[ -z $proxy_network || $proxy_network =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || fail 'Invalid proxy network in VPS config.'
  if [[ -n $proxy_network ]]; then docker network inspect "$proxy_network" >/dev/null; fi

  image="diyatmoko-portfolio:$target"
  docker load --input "$incoming/image.tar.gz"
  revision=$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ $revision == "${target:0:40}" ]] || fail 'Image revision does not match the validated commit.'
  architecture=$(docker image inspect "$image" --format '{{.Architecture}}')
  [[ $architecture == amd64 && $(uname -m) == x86_64 ]] || fail 'This release requires an x86_64 VPS.'

  folder="$root/releases/$target"
  mkdir "$folder"
  cp "$incoming/compose.yaml" "$folder/compose.yaml"
  printf 'PORTFOLIO_IMAGE=%s\nPORTFOLIO_BIND_PORT=%s\nPORTFOLIO_PROXY_NETWORK=%s\n' "$image" "$bind_port" "$proxy_network" > "$folder/.env"
  if [[ -n $proxy_network ]]; then cp "$incoming/compose.proxy.yaml" "$folder/proxy.yaml"; fi
  compose "$target" config --quiet
else
  [[ $# == 1 ]] || fail 'Rollback takes no additional arguments.'
  [[ -n $previous && -d $root/releases/$previous ]] || fail 'No previous successful release is available.'
  target=$previous
fi

# Record intent before recreating the service. An unsuccessful switch restores current.
printf '%s\n' "$target" > "$root/pending.tmp"
mv "$root/pending.tmp" "$root/pending"
switching=true
compose "$target" up -d --no-build --pull never --wait --wait-timeout 60
healthy "$target" || fail 'The candidate did not pass the VPS HTTP smoke check.'
printf '%s\n%s\n' "$target" "$current" > "$root/state.tmp"
mv "$root/state.tmp" "$root/state"
switching=false
rm -f "$root/pending"
printf '%s successful. Current release: %s\n' "$operation" "$target"
if [[ -n $incoming && -f $incoming/rollout.sh ]]; then
  cp "$incoming/rollout.sh" "$root/bin/rollout.sh.tmp"
  chmod 700 "$root/bin/rollout.sh.tmp"
  mv "$root/bin/rollout.sh.tmp" "$root/bin/rollout.sh"
fi

# Retain the current and previous images, and delete only this application's older tags.
read_state
for folder in "$root/releases/"*; do
  [[ -d $folder ]] || continue
  release=${folder##*/}
  valid_release "$release" || continue
  [[ $release != "$current" && $release != "$previous" ]] || continue
  if docker image rm "diyatmoko-portfolio:$release" >/dev/null 2>&1; then rm -rf -- "$folder"; fi
done
