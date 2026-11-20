#!/usr/bin/env bash
# Creates the release keystore that signs every internal APK, and (optionally)
# stores the four GitHub Actions secrets the mobile-android workflow needs.
#
#   bash mobile/scripts/create-keystore.sh [--set-secrets owner/repo] [output-dir]
#
# Writes khelspot-release.jks and password.txt (both private to you) to
# output-dir, default ~/khelspot-keys. The password is never printed.
# Back up BOTH files OFFLINE. If they are lost, installed copies of the app
# can't be updated and every tester must uninstall and reinstall.
set -euo pipefail

REPO=""
if [ "${1:-}" = "--set-secrets" ]; then
  REPO="${2:?usage: --set-secrets owner/repo}"
  shift 2
fi
OUT_DIR="${1:-$HOME/khelspot-keys}"
KS="$OUT_DIR/khelspot-release.jks"
PW="$OUT_DIR/password.txt"
ALIAS="khelspot"

if [ -e "$KS" ]; then
  echo "A keystore already exists at $KS. Not overwriting it." >&2
  exit 1
fi
command -v keytool >/dev/null || { echo "keytool not found: install JDK 17 and put it on PATH." >&2; exit 1; }

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
umask 077
openssl rand -base64 32 | tr -d '/+=\n' | head -c 32 > "$PW"

keytool -genkeypair -storetype PKCS12 \
  -keystore "$KS" -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass:file "$PW" -keypass:file "$PW" \
  -dname "CN=KhelSpot, O=KhelSpot, L=Lahore, C=PK" >/dev/null 2>&1
chmod 600 "$KS" "$PW"
echo "Keystore: $KS"
echo "Password: saved in $PW (not printed)"
echo "SHA-256 certificate fingerprint:"
keytool -list -keystore "$KS" -storepass:file "$PW" -alias "$ALIAS" 2>/dev/null | grep -i "SHA-256\|SHA256" || true

if [ -n "$REPO" ]; then
  command -v gh >/dev/null || { echo "gh CLI not found." >&2; exit 1; }
  base64 -w0 "$KS" | gh secret set ANDROID_KEYSTORE_BASE64 -R "$REPO"
  gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO" < "$PW"
  gh secret set ANDROID_KEY_PASSWORD -R "$REPO" < "$PW"
  printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS -R "$REPO"
  echo "Secrets set on $REPO."
else
  echo
  echo "Add the secrets with the gh CLI:"
  echo "  base64 -w0 \"$KS\" | gh secret set ANDROID_KEYSTORE_BASE64"
  echo "  gh secret set ANDROID_KEYSTORE_PASSWORD < \"$PW\""
  echo "  gh secret set ANDROID_KEY_PASSWORD < \"$PW\""
  echo "  printf $ALIAS | gh secret set ANDROID_KEY_ALIAS"
fi
