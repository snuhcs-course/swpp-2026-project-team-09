#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-11-16  Fable 5.2  prompted by TaeHyun79
################################################################################

# Prepares a scenario of the User Acceptance Test on swpp-a (main-server/README.md: UAT data), from a shell on the
# server: `sudo /srv/team/snu-now/infra/deploy/uat.sh risk1`, and likewise risk2 to risk5, and risk4-cancel where the
# sheet has an Administrator cancel Risk 4's event. It runs the main server's uat-seed inside its running container.

set -euo pipefail

CHECKOUT=${DEPLOY_CHECKOUT:-/srv/team/snu-now}
ENV_FILE=${DEPLOY_ENV_FILE:-/srv/team/snu-now-secrets/snu-now.env}
DOCKER=${DOCKER:-docker}

if (($# != 1)); then
  echo 'Usage: uat.sh risk1 | risk2 | risk3 | risk4 | risk5 | risk4-cancel' >&2
  exit 2
fi

cd "$CHECKOUT"
exec "$DOCKER" compose --env-file "$ENV_FILE" --file compose.yaml --file compose.deploy.yaml \
  exec -T main-server node dist/uat-seed "$1"
