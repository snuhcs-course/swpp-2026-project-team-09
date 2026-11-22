#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-11-16  Fable 5.2  prompted by TaeHyun79
# 2026-11-23  Fable 5.2  prompted by AhnJinYoung
################################################################################

# The commands of the User Acceptance Test (cycle 2) on swpp-a (main-server/README.md: UAT data), from a shell on the
# server:
#
#   sudo /srv/team/snu-now/infra/deploy/uat.sh setup       # the whole session as its first step needs it
#   sudo /srv/team/snu-now/infra/deploy/uat.sh reset a1    # one tester back to the start (a1, a2 or a3)
#   sudo /srv/team/snu-now/infra/deploy/uat.sh s2-cancel   # cancels "[UAT] Event", where the sheet has it cancelled
#   sudo /srv/team/snu-now/infra/deploy/uat.sh status      # where every account stands
#
# It runs the main server's uat-seed inside its running container.

set -euo pipefail

CHECKOUT=${DEPLOY_CHECKOUT:-/srv/team/snu-now}
ENV_FILE=${DEPLOY_ENV_FILE:-/srv/team/snu-now-secrets/snu-now.env}
DOCKER=${DOCKER:-docker}

if (($# < 1 || $# > 2)); then
  echo 'Usage: uat.sh setup | reset a1|a2|a3 | s2-cancel | status' >&2
  exit 2
fi

cd "$CHECKOUT"
exec "$DOCKER" compose --env-file "$ENV_FILE" --file compose.yaml --file compose.deploy.yaml \
  exec -T main-server node dist/uat-seed "$@"
