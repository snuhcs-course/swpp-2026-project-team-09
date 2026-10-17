#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# Stands in for each command of bootstrap.sh that changes the machine, linked under that command's name. Every call is
# logged to $FAKE_STATE/calls, and what a later call reads back (installed packages, safe directories) is kept beside
# it, so that a second run sees the machine the first one left.
set -euo pipefail

name=$(basename "$0")
printf '%s\n' "$name $*" >>"$FAKE_STATE/calls"

case $name in
  dpkg-query)
    package=${*: -1}
    if grep -qxF "$package" "$FAKE_STATE/packages" 2>/dev/null; then
      echo 'install ok installed'
    else
      echo "dpkg-query: no packages found matching $package" >&2
      exit 1
    fi
    ;;
  apt-get)
    if [[ $1 == install ]]; then
      for argument in "${@:2}"; do
        [[ $argument == -* ]] || echo "$argument" >>"$FAKE_STATE/packages"
      done
    fi
    ;;
  git)
    if [[ $1 == clone ]]; then
      checkout=${*: -1}
      mkdir -p "$checkout/.git" "$checkout/infra/deploy"
      cp "$FAKE_REPOSITORY"/infra/deploy/snu-now-*.service "$FAKE_REPOSITORY"/infra/deploy/snu-now-*.timer \
        "$checkout/infra/deploy/"
    elif [[ "$*" == 'config --system --get-all safe.directory' ]]; then
      cat "$FAKE_STATE/safe-directories" 2>/dev/null || exit 1
    elif [[ "$1 $2 $3 ${4:-}" == 'config --system --add safe.directory' ]]; then
      echo "$5" >>"$FAKE_STATE/safe-directories"
    fi
    ;;
  install)
    mode=
    while [[ $1 == -* ]]; do
      if [[ $1 == -m ]]; then
        mode=$2
        shift
      fi
      shift
    done
    cp "$1" "$2"
    [[ -z $mode ]] || chmod "$mode" "$2"
    ;;
esac
