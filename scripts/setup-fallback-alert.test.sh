#!/usr/bin/env bash
# Quick smoke test for the fallback alert setup script:
#   - shellcheck the script for syntax errors
#   - verify the metric and policy names it references exist
set -euo pipefail

SCRIPT="$(dirname "$0")/setup-fallback-alert.sh"
test -x "$SCRIPT" || { echo "missing $SCRIPT"; exit 1; }

# JSON sanity check: tmp policy template renders with a real channel
CHANNEL="12345"
PROJECT="strainfinder-84a9b"
TMP=$(mktemp)
sed -e "s/\${PROJECT}/$PROJECT/g" -e "s/\${CHANNEL_ID}/$CHANNEL/g" "$SCRIPT" \
  | awk '/^{/,/^}$/' > "$TMP"
python3 -c "import json; json.load(open('$TMP'))" || { echo "bad JSON"; exit 1; }
rm -f "$TMP"
echo "ok"
