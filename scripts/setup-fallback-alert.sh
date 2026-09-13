#!/usr/bin/env bash
# One-time setup for the OpenRouter → Groq fallback alert.
#
# Creates:
#   1. An email notification channel (idempotent: skip if exists)
#   2. A log-based metric that counts ai-fallback.ts warning lines
#   3. An alert policy that fires when the rate > 1 in 5 minutes
#
# Run this once after the first deploy of the new functions, or any
# time you set up a fresh project. Safe to re-run.
#
# Why this exists: ai-fallback.ts logs a WARN line every time
# OpenRouter fails transiently and we route the call to Groq instead.
# Sustained fallbacks mean OpenRouter is in a wider outage or the
# cache is not absorbing as much repeat traffic as expected. Without
# an alert, you'd only notice when users start complaining about 5xx
# responses.
#
# The metric takes up to 10 minutes to propagate after creation, so the
# alert policy creation retries with a backoff.
#
# Historical note: earlier versions of this script created
# `groq_to_deepinfra_fallbacks` (Groq primary),
# `deepinfra_to_groq_fallbacks` (DeepInfra primary), and
# `together_to_groq_fallbacks` (Together.ai primary). All three
# metrics are dormant. This script creates `openrouter_to_groq_fallbacks`
# for the current OpenRouter primary direction. Delete the dormant
# metrics with:
#   gcloud logging metrics delete groq_to_deepinfra_fallbacks --project=$PROJECT
#   gcloud logging metrics delete deepinfra_to_groq_fallbacks --project=$PROJECT
#   gcloud logging metrics delete together_to_groq_fallbacks --project=$PROJECT

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-strainfinder-84a9b}"
EMAIL="${STRAINEASE_ALERT_EMAIL:-me@juliancruzsanchez.com}"
CHANNEL_DISPLAY="JC email (StrainEase ops)"

echo "Project: $PROJECT"
echo "Alert email: $EMAIL"
echo

# 1. Notification channel
echo "[1/3] Creating email notification channel..."
CHANNELS_JSON=$(gcloud alpha monitoring channels list \
  --project="$PROJECT" --format=json 2>/dev/null || echo "[]")
CHANNEL_ID=$(echo "$CHANNELS_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    labels = c.get('labels', {})
    if (
        c.get('type') == 'email'
        and labels.get('email_address') == '$EMAIL'
    ):
        print(c['name'].split('/')[-1])
        break
" 2>/dev/null || true)

if [ -z "$CHANNEL_ID" ]; then
  CHANNEL_ID=$(gcloud alpha monitoring channels create \
    --project="$PROJECT" \
    --display-name="$CHANNEL_DISPLAY" \
    --type=email \
    --channel-labels=email_address="$EMAIL" \
    --format="value(name)" 2>&1 | tail -1 | awk -F'/' '{print $NF}')
  echo "    created channel $CHANNEL_ID"
else
  echo "    reusing existing channel $CHANNEL_ID"
fi

# 2. Log-based metric
echo "[2/3] Creating log-based metric..."
gcloud logging metrics create openrouter_to_groq_fallbacks \
  --project="$PROJECT" \
  --description="Count of OpenRouter → Groq fallback warnings from ai-fallback.ts. Fires when OpenRouter is rate-limited or 5xx-ing and we route to Groq instead." \
  --log-filter='resource.type="cloud_run_revision" AND textPayload=~"ai-fallback: openrouter failed transiently, falling through to groq"' \
  2>&1 | tail -1 || echo "    metric already exists, continuing"

# 3. Alert policy (with retry for metric propagation)
echo "[3/3] Creating alert policy (retries for metric propagation)..."
TMP_POLICY=$(mktemp -t strainease-alert.XXXXXX.json)
cat > "$TMP_POLICY" <<POLICY
{
  "displayName": "OpenRouter → Groq fallback rate spike",
  "documentation": {
    "content": "Fires when more than 1 OpenRouter → Groq fallback happens in 5 minutes. OpenRouter is the metered primary; sustained fallbacks mean either OpenRouter is in a wider outage or the cache is not absorbing as much repeat traffic as expected. Investigate: check Cloud Logging for the underlying HttpsError message, check OpenRouter status, and review descriptionCache / compareCache hit rates in the same period. Permanent fixes: tighten cache key scope, raise the Firestore TTL, or switch the primary to a different model on OpenRouter.",
    "mimeType": "text/markdown"
  },
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "fallback count > 1 in 5 min",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/openrouter_to_groq_fallbacks\" AND resource.type=\"cloud_run_revision\"",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 1,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "alertStrategy": { "autoClose": "1800s" },
  "notificationChannels": [
    "projects/${PROJECT}/notificationChannels/${CHANNEL_ID}"
  ],
  "severity": "WARNING",
  "enabled": true
}
POLICY

# Retry up to 10 times with 30s sleep; metric creation can take time
# to propagate through Cloud Monitoring.
ATTEMPTS=10
DELAY=30
for i in $(seq 1 $ATTEMPTS); do
  if gcloud alpha monitoring policies create \
      --project="$PROJECT" \
      --policy-from-file="$TMP_POLICY" 2>&1 | tail -1; then
    break
  fi
  if [ "$i" -eq "$ATTEMPTS" ]; then
    echo "    policy creation failed after $ATTEMPTS attempts"
    echo "    re-run this script in a few minutes once the metric propagates"
    exit 1
  fi
  echo "    metric not yet propagated, sleeping ${DELAY}s (attempt $i/$ATTEMPTS)..."
  sleep "$DELAY"
done

rm -f "$TMP_POLICY"
echo
echo "Done. Verify with:"
echo "  gcloud alpha monitoring policies list --project=$PROJECT"
echo
echo "Note: earlier runs created 'groq_to_deepinfra_fallbacks',"
echo "'deepinfra_to_groq_fallbacks', and 'together_to_groq_fallbacks'"
echo "metrics that no longer fire. Delete them with:"
echo "  gcloud logging metrics delete groq_to_deepinfra_fallbacks --project=$PROJECT"
echo "  gcloud logging metrics delete deepinfra_to_groq_fallbacks --project=$PROJECT"
echo "  gcloud logging metrics delete together_to_groq_fallbacks --project=$PROJECT"
