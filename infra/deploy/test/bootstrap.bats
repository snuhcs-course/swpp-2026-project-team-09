#!/usr/bin/env bats
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# Runs bootstrap.sh on a pretend machine under $BATS_TEST_TMPDIR: the team folder, systemd's unit folder and, through
# bootstrap-fakes.sh on PATH, apt, git and systemctl. A [[ ]] check ends in `|| false` because bash before 4.1, which
# macOS has, does not fail a test on a [[ ]] that is not its last command.

CONTRACT=(
  COMPOSE_PROFILES DEPLOY_STATUS_DIR DEPLOY_APK_DIR
  POSTGRES_PASSWORD MAIN_DB_PASSWORD MATCH_DB_PASSWORD ACCESS_TOKEN_PRIVATE_KEY ACCESS_TOKEN_PUBLIC_KEY WORKER_TOKEN
  MATCH_SERVER_TOKEN
  PUBLIC_URL GOOGLE_APP_CLIENT_ID GOOGLE_ADMIN_CLIENT_ID ANDROID_CERTIFICATE_FINGERPRINTS ROUND_INTERVAL_SECONDS
  KAKAO_REST_API_KEY INITIAL_ADMINISTRATOR_EMAILS DEMO_ACCOUNT_EMAILS
)

# ls rather than stat, whose options differ between GNU and macOS.
group_of() {
  # shellcheck disable=SC2012
  ls -ld "$1" | awk '{ print $4 }'
}

# A group of the current user other than the one new files get anyway, so that a test sees the bootstrap set it.
other_group() {
  local default group candidates
  default=$(group_of "$BATS_TEST_TMPDIR")
  candidates=$(id -Gn)
  # root, as in a container, belongs to root alone but may hand a file to any group.
  if [[ $(id -u) == 0 ]]; then
    candidates+=" $(cut -d : -f 1 /etc/group)"
  fi
  for group in $candidates; do
    if [[ $group != "$default" ]]; then
      echo "$group"
      return
    fi
  done
  echo "$default"
}

setup() {
  REPOSITORY=$(cd "$BATS_TEST_DIRNAME/../../.." && pwd)
  BOOTSTRAP=$REPOSITORY/infra/deploy/bootstrap.sh
  export FAKE_STATE=$BATS_TEST_TMPDIR/machine FAKE_REPOSITORY=$REPOSITORY
  mkdir -p "$FAKE_STATE" "$BATS_TEST_TMPDIR/bin" "$BATS_TEST_TMPDIR/srv/team" "$BATS_TEST_TMPDIR/etc/systemd/system"
  for command in apt-get dpkg-query git systemctl install; do
    ln -s "$BATS_TEST_DIRNAME/bootstrap-fakes.sh" "$BATS_TEST_TMPDIR/bin/$command"
  done
  PATH=$BATS_TEST_TMPDIR/bin:$PATH

  export BOOTSTRAP_TEAM_DIR=$BATS_TEST_TMPDIR/srv/team BOOTSTRAP_UNIT_DIR=$BATS_TEST_TMPDIR/etc/systemd/system
  BOOTSTRAP_TEAM_GROUP=$(other_group)
  export BOOTSTRAP_TEAM_GROUP
  CHECKOUT=$BOOTSTRAP_TEAM_DIR/snu-now
  SETTINGS=$BOOTSTRAP_TEAM_DIR/snu-now-secrets/snu-now.env
}

bootstrap() {
  run "$BOOTSTRAP"
  echo "$output"
  [ "$status" -eq 0 ]
}

value_of() {
  sed -n "s/^$1=//p" "$SETTINGS"
}

# A key's value back as PEM text on several lines.
pem_of() {
  value_of "$1" | sed 's/^"//; s/"$//' | awk '{ gsub(/\\n/, "\n"); print }'
}

example_value_of() {
  sed -n "s/^$1=//p" "$REPOSITORY/main-server/.env.example"
}

@test "a fresh settings file holds every variable of the contract; the generated values are present, non-empty and distinct; exactly KAKAO_REST_API_KEY, INITIAL_ADMINISTRATOR_EMAILS and DEMO_ACCOUNT_EMAILS are CHANGE_ME; PUBLIC_URL, the two Google client ids, the fingerprints and COMPOSE_PROFILES have the spec's fixed values" {
  bootstrap

  [ "$(grep -v -e '^#' -e '^$' "$SETTINGS" | sed 's/=.*//' | sort)" = "$(printf '%s\n' "${CONTRACT[@]}" | sort)" ]

  for name in POSTGRES_PASSWORD MAIN_DB_PASSWORD MATCH_DB_PASSWORD WORKER_TOKEN MATCH_SERVER_TOKEN; do
    # Hex, so that a password goes into DATABASE_URL as it is.
    [[ $(value_of "$name") =~ ^[0-9a-f]{64}$ ]] || false
  done
  [ -n "$(value_of ACCESS_TOKEN_PRIVATE_KEY)" ]
  [ -n "$(value_of ACCESS_TOKEN_PUBLIC_KEY)" ]
  [ "$(for name in POSTGRES_PASSWORD MAIN_DB_PASSWORD MATCH_DB_PASSWORD WORKER_TOKEN MATCH_SERVER_TOKEN \
    ACCESS_TOKEN_PRIVATE_KEY ACCESS_TOKEN_PUBLIC_KEY; do value_of "$name"; done | sort -u | grep -c .)" -eq 7 ]

  [ "$(grep CHANGE_ME "$SETTINGS" | sort)" = "$(printf '%s\n' DEMO_ACCOUNT_EMAILS=CHANGE_ME \
    INITIAL_ADMINISTRATOR_EMAILS=CHANGE_ME KAKAO_REST_API_KEY=CHANGE_ME)" ]

  [ "$(value_of PUBLIC_URL)" = http://swpp26t09.147-46-242-174.sslip.io ]
  [ "$(value_of COMPOSE_PROFILES)" = demo ]
  for name in GOOGLE_APP_CLIENT_ID GOOGLE_ADMIN_CLIENT_ID ANDROID_CERTIFICATE_FINGERPRINTS; do
    [ -n "$(example_value_of "$name")" ]
    [ "$(value_of "$name")" = "$(example_value_of "$name")" ]
  done
  [ "$(value_of DEPLOY_STATUS_DIR)" = "$BOOTSTRAP_TEAM_DIR/snu-now-status" ]
  [ "$(value_of DEPLOY_APK_DIR)" = "$BOOTSTRAP_TEAM_DIR/snu-now-apk" ]
  [ "$(value_of ROUND_INTERVAL_SECONDS)" = 60 ]
}

@test "the key pair is a P-256 pair in one-line PEM form that openssl reads back as PKCS8 private and SPKI public keys, and the public key matches the private" {
  bootstrap

  local private=$BATS_TEST_TMPDIR/private.pem public=$BATS_TEST_TMPDIR/public.pem
  grep -qx 'ACCESS_TOKEN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n[^"]*\\n-----END PRIVATE KEY-----"' "$SETTINGS"
  grep -qx 'ACCESS_TOKEN_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n[^"]*\\n-----END PUBLIC KEY-----"' "$SETTINGS"
  pem_of ACCESS_TOKEN_PRIVATE_KEY >"$private"
  pem_of ACCESS_TOKEN_PUBLIC_KEY >"$public"

  openssl pkcs8 -nocrypt -in "$private" -out /dev/null
  openssl pkey -pubin -in "$public" -noout
  openssl pkey -in "$private" -noout -text | grep -q 'ASN1 OID: prime256v1'
  [ "$(openssl pkey -in "$private" -pubout)" = "$(cat "$public")" ]
}

@test "a second run leaves an existing settings file byte for byte as it was" {
  bootstrap
  # As a person fills it in, keeping the file itself.
  sed 's/CHANGE_ME/filled-in/' "$SETTINGS" >"$BATS_TEST_TMPDIR/filled"
  cat "$BATS_TEST_TMPDIR/filled" >"$SETTINGS"

  bootstrap

  cmp "$BATS_TEST_TMPDIR/filled" "$SETTINGS"
}

@test "with fakes for apt-get, git, systemctl and install, a first run installs the three packages, clones, installs the five units and enables only the two timers; a second run on a prepared machine installs nothing again and fails nothing" {
  local calls=$FAKE_STATE/calls packages package unit
  bootstrap

  grep -qx 'apt-get update' "$calls"
  packages=" $(grep '^apt-get install ' "$calls") "
  for package in docker.io docker-compose-v2 docker-buildx; do
    [[ $packages == *" $package "* ]] || false
  done
  grep -qx "git clone --branch development https://github.com/snuhcs-course/swpp-2026-project-team-09.git $CHECKOUT" \
    "$calls"
  grep -qx "git config --system --add safe.directory $CHECKOUT" "$calls"
  for unit in snu-now-deploy.service snu-now-deploy.timer snu-now-demo-refresh.service snu-now-demo-refresh.timer \
    snu-now-redeploy.service; do
    cmp "$REPOSITORY/infra/deploy/$unit" "$BOOTSTRAP_UNIT_DIR/$unit"
  done
  [ "$(grep '^systemctl ' "$calls")" = "$(printf '%s\n' 'systemctl daemon-reload' \
    'systemctl enable --now snu-now-deploy.timer snu-now-demo-refresh.timer')" ]

  rm "$calls"
  bootstrap

  run grep -E '^(apt-get|install) |^git (clone|config --system --add) ' "$calls"
  [ "$status" -eq 1 ]
}

@test "the folders are created with the team group, the secrets and backups folders closed to others, the rest group-writable and readable by others" {
  local folder
  bootstrap

  for folder in snu-now snu-now-status snu-now-apk; do
    [[ $(ls -ld "$BOOTSTRAP_TEAM_DIR/$folder") == drwxrwsr-x* ]] || false
    [ "$(group_of "$BOOTSTRAP_TEAM_DIR/$folder")" = "$BOOTSTRAP_TEAM_GROUP" ]
  done
  # The dumps hold Users' data and password hashes.
  for folder in snu-now-secrets snu-now-backups; do
    [[ $(ls -ld "$BOOTSTRAP_TEAM_DIR/$folder") == drwxrws---* ]] || false
    [ "$(group_of "$BOOTSTRAP_TEAM_DIR/$folder")" = "$BOOTSTRAP_TEAM_GROUP" ]
  done
}

@test "the unit files carry the schedule of the spec's \"Timers\" and the deploy service points its environment at the settings file, the status folder and the backups folder of the contract" {
  local units=$BOOTSTRAP_UNIT_DIR
  bootstrap

  grep -qx 'OnBootSec=2min' "$units/snu-now-deploy.timer"
  grep -qx 'OnUnitInactiveSec=1min' "$units/snu-now-deploy.timer"
  grep -qx 'OnCalendar=\*-\*-\* 19:00:00 UTC' "$units/snu-now-demo-refresh.timer"
  grep -qx 'WantedBy=timers.target' "$units/snu-now-deploy.timer"
  grep -qx 'WantedBy=timers.target' "$units/snu-now-demo-refresh.timer"

  grep -qx 'ExecStart=/bin/bash /srv/team/snu-now/infra/deploy/deploy.sh' "$units/snu-now-deploy.service"
  grep -qx 'Environment=DEPLOY_CHECKOUT=/srv/team/snu-now' "$units/snu-now-deploy.service"
  grep -qx 'Environment=DEPLOY_ENV_FILE=/srv/team/snu-now-secrets/snu-now.env' "$units/snu-now-deploy.service"
  grep -qx 'Environment=DEPLOY_STATUS_DIR=/srv/team/snu-now-status' "$units/snu-now-deploy.service"
  grep -qx 'Environment=DEPLOY_BACKUP_DIR=/srv/team/snu-now-backups' "$units/snu-now-deploy.service"

  grep -qx 'WorkingDirectory=/srv/team/snu-now' "$units/snu-now-demo-refresh.service"
  grep -qx 'ExecStart=/usr/bin/docker compose --env-file /srv/team/snu-now-secrets/snu-now.env --file compose.yaml --file compose.deploy.yaml --profile demo restart demo-seed' \
    "$units/snu-now-demo-refresh.service"
}

@test "the redeploy service writes the request file into the deploy service's status folder, then starts the deploy service without waiting for it, and nothing enables it" {
  local units=$BOOTSTRAP_UNIT_DIR status_dir
  bootstrap

  status_dir=$(sed -n 's/^Environment=DEPLOY_STATUS_DIR=//p' "$units/snu-now-deploy.service")
  [ "$(grep '^ExecStart=' "$units/snu-now-redeploy.service")" = "$(printf '%s\n' \
    "ExecStart=/usr/bin/touch $status_dir/redeploy" \
    'ExecStart=/usr/bin/systemctl --no-block start snu-now-deploy.service')" ]
  grep -qx 'Type=oneshot' "$units/snu-now-redeploy.service"
  run grep -x '\[Install\]' "$units/snu-now-redeploy.service"
  [ "$status" -eq 1 ]
}

@test "the settings example names the variables of a fresh settings file, each under a comment of its own" {
  local example=$REPOSITORY/infra/deploy/snu-now.env.example
  bootstrap

  [ "$(grep -v -e '^#' -e '^$' "$example" | sed 's/=.*//' | sort)" = \
    "$(grep -v -e '^#' -e '^$' "$SETTINGS" | sed 's/=.*//' | sort)" ]
  awk '/^[A-Z_]+=/ && previous !~ /^# / { print "bare: " $0; bare = 1 } { previous = $0 } END { exit bare }' "$example"
}

@test "a team group of root stops the bootstrap before it changes anything" {
  BOOTSTRAP_TEAM_GROUP=root run "$BOOTSTRAP"

  [ "$status" -ne 0 ]
  [ ! -e "$FAKE_STATE/calls" ]
  [ -z "$(ls -A "$BOOTSTRAP_TEAM_DIR")" ]
}

@test "the settings file belongs to the team group and is closed to others" {
  bootstrap

  [[ $(ls -l "$SETTINGS") == -rw-rw----* ]] || false
  [ "$(group_of "$SETTINGS")" = "$BOOTSTRAP_TEAM_GROUP" ]
}
