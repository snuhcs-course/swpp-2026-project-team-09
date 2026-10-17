#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# Stands in for git, docker and curl in the deploy tests, linked under each name on PATH.
# Every call is appended to $FAKE_CALLS; the answers come from the FAKE_* variables the test sets.
set -euo pipefail

printf '%s %s\n' "$(basename "$0")" "$*" >>"$FAKE_CALLS"

case "$(basename "$0")" in
  git)
    case "$1" in
      fetch) exit "${FAKE_FETCH_STATUS:-0}" ;;
      rev-parse) echo "$FAKE_TIP" ;;
    esac
    ;;
  curl)
    for arg; do
      case "$arg" in
        https://api.github.com/*)
          cat "$FAKE_CHECK_RUNS"
          exit "${FAKE_GITHUB_STATUS:-0}"
          ;;
        */health/ready) exit "${FAKE_READY_STATUS:-0}" ;;
        */socket.io/*) printf '%s' "$FAKE_HANDSHAKE" ;;
      esac
    done
    ;;
  docker)
    case " $* " in
      *" ps "*) if [[ -n "${FAKE_DB_RUNNING:-}" ]]; then echo 4f2c9d1e7a3b; fi ;;
      *" pg_dumpall "*) echo '-- PostgreSQL database cluster dump' ;;
      *" up "*)
        cat "$FAKE_COMPOSE_OUTPUT" >&2
        exit "${FAKE_UP_STATUS:-0}"
        ;;
    esac
    ;;
esac
