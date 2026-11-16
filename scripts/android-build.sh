#!/bin/sh
set -eu
cd "$(dirname "$0")/../android"
# Android Studio bundles a supported JDK; no system-wide Java installation needed.
if [ -z "${JAVA_HOME:-}" ] && [ -d '/Applications/Android Studio.app/Contents/jbr/Contents/Home' ]; then
  export JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home'
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
case "${1:-release}" in
  debug) ./gradlew assembleDebug ;;
  release)
    if [ -z "${SIMPLY_ANDROID_KEYSTORE:-}" ] && [ ! -f keystore.properties ]; then
      echo 'Release signing ontbreekt. Zie docs/testen-en-lanceren.md. Gebruik npm run android:build:debug om eerst lokaal te testen.' >&2
      exit 1
    fi
    ./gradlew bundleRelease ;;
  *) echo 'Gebruik: android-build.sh debug|release' >&2; exit 1 ;;
esac
