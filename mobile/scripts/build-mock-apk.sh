#!/usr/bin/env bash
################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by TaeHyun79
################################################################################

# `pnpm build:mock-apk`: the release APK that `pnpm test:device` runs (README.md, "Device runs"). With no server
# address and no Google web client ID the app signs in by its mock and answers from its own mock data. The rest comes
# from `.env`: Kakao's SDK refuses to start with an empty KAKAO_NATIVE_APP_KEY. Expo's template signs a release build
# with its debug key, the one the dev APK is signed with.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! grep -Eq '^KAKAO_NATIVE_APP_KEY=.+' .env 2>/dev/null; then
  echo 'build:mock-apk: KAKAO_NATIVE_APP_KEY is not set in mobile/.env' >&2
  exit 1
fi

JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
export JAVA_HOME
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
# Empty, not unset: @expo/env takes a value from .env only for a variable that is undefined.
export EXPO_PUBLIC_MAIN_SERVER_URL='' EXPO_PUBLIC_SOCKET_SERVER_URL='' EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID='' INVITE_LINK_HOST=''
unset ANDROID_X86_64

pnpm expo prebuild --platform android --clean
(cd android && ./gradlew assembleRelease)
echo 'build:mock-apk: android/app/build/outputs/apk/release/app-release.apk'
