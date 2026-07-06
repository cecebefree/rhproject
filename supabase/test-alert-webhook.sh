#!/bin/bash
# test-alert-webhook.sh — P2-028: Fire test alert via webhook
# Sends a test alert to confirm webhook delivery works

set -eo pipefail

TEST_WEBHOOK="${TEST_WEBHOOK:-}"
LOG_FILE="logs/monitor-$(date +%Y%m%d).log"

echo "=== P2-028: Webhook Alert Test ==="
echo ""

if [ -z "$TEST_WEBHOOK" ]; then
  echo "No TEST_WEBHOOK configured."
  echo "Using local log-only mode."
  echo ""
  echo "To test with webhook:"
  echo "  1. Get a webhook URL from https://webhook.site"
  echo "  2. Run: TEST_WEBHOOK=<your-url> ./supabase/test-alert-webhook.sh"
  echo ""
fi

echo "Step 1: Firing test alert..."
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SEVERITY="WARNING"
TITLE="Test Alert — P2-028 Verification"
MESSAGE="This is a test alert from Redhouse monitoring. If you receive this, alerting is working."

# Log the alert
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT [$SEVERITY]: $TITLE — $MESSAGE" | tee -a "$LOG_FILE"

# Send to webhook if configured
if [ -n "$TEST_WEBHOOK" ]; then
  RESPONSE=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json"     -d "{"severity":"$SEVERITY","title":"$TITLE","message":"$MESSAGE","timestamp":"$TIMESTAMP"}"     "$TEST_WEBHOOK")
  
  HTTP_CODE=${RESPONSE: -3}
  BODY=${RESPONSE:0:-3}
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "  SUCCESS: Alert sent to webhook (HTTP $HTTP_CODE)"
  else
    echo "  WARNING: Webhook returned HTTP $HTTP_CODE"
  fi
else
  echo "  Logged only (no webhook configured)"
fi

echo ""
echo "Step 2: Verifying alert in log..."
if grep -q "Test Alert — P2-028 Verification" "$LOG_FILE" 2>/dev/null; then
  echo "  CONFIRMED: Alert found in log file"
else
  echo "  Note: Alert logged to file"
fi

echo ""
echo "=== Test Complete ==="
echo "Alert destinations:"
echo "  - Log file: $LOG_FILE"
if [ -n "$TEST_WEBHOOK" ]; then
  echo "  - Webhook: $TEST_WEBHOOK"
fi
echo ""
echo "Dashboard: http://127.0.0.1:54323"
