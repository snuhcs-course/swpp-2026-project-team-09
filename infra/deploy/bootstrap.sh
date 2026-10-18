#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
# 2026-10-18  Opus 5.5   prompted by TaeHyun79
################################################################################

# Readies a course server for the deploy timer. Run as root, once and again whenever: it never overwrites the settings
# file, never fills in what a person must and never deploys (infra/deploy/README.md).
set -euo pipefail

# The team group is the team folder's own, unless BOOTSTRAP_TEAM_GROUP names it. The tests move the two folders.
TEAM_DIR=${BOOTSTRAP_TEAM_DIR:-/srv/team}
TEAM_GROUP=${BOOTSTRAP_TEAM_GROUP:-$(stat -c %G "$TEAM_DIR")}
UNIT_DIR=${BOOTSTRAP_UNIT_DIR:-/etc/systemd/system}
if [[ $TEAM_GROUP == root ]]; then
  echo "bootstrap: $TEAM_DIR belongs to root; run again with BOOTSTRAP_TEAM_GROUP set to the team's group" >&2
  exit 1
fi

REPOSITORY=https://github.com/snuhcs-course/swpp-2026-project-team-09.git
# git, curl and jq for the clone and the deploy run, which a minimal image may lack.
PACKAGES=(docker.io docker-compose-v2 docker-buildx git curl jq)
UNITS=(snu-now-deploy.service snu-now-deploy.timer snu-now-demo-refresh.service snu-now-demo-refresh.timer
  snu-now-redeploy.service)

CHECKOUT=$TEAM_DIR/snu-now
SECRETS_DIR=$TEAM_DIR/snu-now-secrets
BACKUP_DIR=$TEAM_DIR/snu-now-backups
STATUS_DIR=$TEAM_DIR/snu-now-status
APK_DIR=$TEAM_DIR/snu-now-apk
ENV_FILE=$SECRETS_DIR/snu-now.env

log() {
  printf 'bootstrap: %s\n' "$*"
}

# The set-group-ID bit hands the team group on to whatever is made inside.
make_folder() {
  mkdir -p "$1"
  chgrp "$TEAM_GROUP" "$1"
  chmod "$2" "$1"
}

make_folders() {
  local folder
  # The dumps hold Users' data and password hashes, and /srv/team's default ACL overrides the umask, so their folder,
  # like the secrets folder, is closed to others.
  for folder in "$CHECKOUT" "$STATUS_DIR" "$APK_DIR"; do
    make_folder "$folder" 2775
  done
  for folder in "$SECRETS_DIR" "$BACKUP_DIR"; do
    make_folder "$folder" 2770
  done
}

install_packages() {
  local package missing=()
  for package in "${PACKAGES[@]}"; do
    if [[ $(dpkg-query --show --showformat="\${Status}" "$package" 2>/dev/null) != 'install ok installed' ]]; then
      missing+=("$package")
    fi
  done
  if ((${#missing[@]} > 0)); then
    log "installing ${missing[*]}"
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install --yes "${missing[@]}"
  fi
}

clone() {
  if [[ ! -d $CHECKOUT/.git ]]; then
    log "cloning development into $CHECKOUT"
    git clone --branch development "$REPOSITORY" "$CHECKOUT"
  fi
  # For every user, root included, whoever owns the files. Not grep -q, which could stop git with SIGPIPE.
  if ! git config --system --get-all safe.directory | grep -xF -- "$CHECKOUT" >/dev/null; then
    git config --system --add safe.directory "$CHECKOUT"
  fi
}

install_units() {
  local unit changed=false
  for unit in "${UNITS[@]}"; do
    if ! cmp -s "$CHECKOUT/infra/deploy/$unit" "$UNIT_DIR/$unit"; then
      log "installing $UNIT_DIR/$unit"
      install -m 0644 "$CHECKOUT/infra/deploy/$unit" "$UNIT_DIR/$unit"
      changed=true
    fi
  done
  if $changed; then
    systemctl daemon-reload
  fi
  systemctl enable --now snu-now-deploy.timer snu-now-demo-refresh.timer
}

# PEM text on one line, with \n where the lines break, as main-server's `pnpm keys:generate` prints it.
one_line() {
  awk 'NR > 1 { printf "\\n" } { printf "%s", $0 }'
}

write_settings() {
  local postgres_password main_db_password match_db_password worker_token match_server_token private_pem private_key
  local public_key
  postgres_password=$(openssl rand -hex 32)
  main_db_password=$(openssl rand -hex 32)
  match_db_password=$(openssl rand -hex 32)
  worker_token=$(openssl rand -hex 32)
  match_server_token=$(openssl rand -hex 32)
  private_pem=$(openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve)
  private_key=$(printf '%s\n' "$private_pem" | one_line)
  public_key=$(printf '%s\n' "$private_pem" | openssl pkey -pubout | one_line)

  # Written aside and moved in, so that a run cut short leaves no half file for the next run to keep.
  cat >"$ENV_FILE.partial" <<EOF
# Written by infra/deploy/bootstrap.sh. infra/deploy/snu-now.env.example says what each value is.
COMPOSE_PROFILES=demo
DEPLOY_STATUS_DIR=$STATUS_DIR
DEPLOY_APK_DIR=$APK_DIR
POSTGRES_PASSWORD=$postgres_password
MAIN_DB_PASSWORD=$main_db_password
MATCH_DB_PASSWORD=$match_db_password
ACCESS_TOKEN_PRIVATE_KEY="$private_key"
ACCESS_TOKEN_PUBLIC_KEY="$public_key"
WORKER_TOKEN=$worker_token
MATCH_SERVER_TOKEN=$match_server_token
PUBLIC_URL=http://swpp26t09.147-46-242-174.sslip.io
GOOGLE_APP_CLIENT_ID=1021723676612-aria1ohmdms787sqbvldtt8484fnf04c.apps.googleusercontent.com
GOOGLE_ADMIN_CLIENT_ID=1021723676612-23lpoe5ue36rr2a07uora5ai4qckoe87.apps.googleusercontent.com
ANDROID_CERTIFICATE_FINGERPRINTS=FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
ROUND_INTERVAL_SECONDS=60
KAKAO_REST_API_KEY=CHANGE_ME
INITIAL_ADMINISTRATOR_EMAILS=CHANGE_ME
DEMO_ACCOUNT_EMAILS=CHANGE_ME
EOF
  chgrp "$TEAM_GROUP" "$ENV_FILE.partial"
  chmod 0660 "$ENV_FILE.partial"
  mv "$ENV_FILE.partial" "$ENV_FILE"
}

install_packages
make_folders
clone
if [[ -e $ENV_FILE ]]; then
  log "keeping $ENV_FILE as it is"
else
  log "writing $ENV_FILE"
  write_settings
fi
install_units
if grep -q CHANGE_ME "$ENV_FILE"; then
  log "fill in each CHANGE_ME in $ENV_FILE: until then every deploy run stops at secrets-missing"
fi
