#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by TaeHyun79
################################################################################

# `pnpm test:device`: the Maestro flows in maestro/integration/ on the pinned emulator, against the mock APK that
# `pnpm build:mock-apk` built (README.md, "Device runs"). Each run writes its JUnit report and screenshots into its own
# folder under device-results/, named by the date and the commit.
set -euo pipefail
cd "$(dirname "$0")/.."

readonly APP_ID=com.bonnieandclaude.snunow
readonly APK=android/app/build/outputs/apk/release/app-release.apk
readonly MAESTRO_VERSION=2.11.0
ADB=${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb
JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export JAVA_HOME
export PATH=$HOME/.maestro/bin:$PATH
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

fail() {
  echo "test:device: $*" >&2
  exit 1
}

[[ -f $APK ]] || fail "no APK at $APK: run pnpm build:mock-apk first"

count=$("$ADB" devices | awk 'NR > 1 && NF' | wc -l | tr -d ' ')
((count == 1)) || fail "exactly one device must be connected, found $count"
abi=$("$ADB" shell getprop ro.product.cpu.abi | tr -d '\r')
api=$("$ADB" shell getprop ro.build.version.sdk | tr -d '\r')
[[ $abi == arm64-v8a && $api == 36 ]] || fail "the device must be arm64-v8a on API 36, found $abi on API $api"
command -v maestro >/dev/null || fail 'no Maestro CLI in ~/.maestro/bin (README.md, "Maestro")'
version=$(maestro --version | tail -n 1)
[[ $version == "$MAESTRO_VERSION" ]] || fail "Maestro must be $MAESTRO_VERSION, found $version"

for scale in window_animation_scale transition_animation_scale animator_duration_scale; do
  "$ADB" shell settings put global "$scale" 0
done

"$ADB" uninstall "$APP_ID" >/dev/null 2>&1 || true
"$ADB" install "$APK"

run=device-results/$(date +%Y-%m-%dT%H%M%S)-$(git rev-parse --short HEAD)
mkdir -p "$run"
echo "test:device: results in mobile/$run"
maestro test --format junit --output "$run/report.xml" --test-output-dir "$run" maestro/integration
