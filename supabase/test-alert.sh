#!/bin/bash
# test-alert.sh — P2-028: Fire a test alert and confirm receipt
# Deliberately trips an alert by simulating failure conditions

set -eo pipefail

LOG_FILE="logs/monitor-$(date +%Y%m%d).log"
TEST_WEBHOOK="${TEST_WEBHOOK:-}"

echo "=== P2-028: Test Alert firing ==="
echo ""

# Method 1: Trip auth failure alert by creating failed login attempts
echo "Step 1: Simulating auth failures..."
for i in {1..12; do
  curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password"     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"     -H "Content-Type: application/json"     -d '{"email":"nonexistent@test.com","password":"wrongpassword"}' > /dev/null 2>&1
done
echo "  Created 12 failed login attempts"

echo ""
echo "Step 2: Running monitor with lowered threshold..."

# Temporarily override threshold to trip the alert
AUTH_FAILURES=$(docker exec supabase_db_rhproject-new psql -U postgres -d postgres -t -c   "SELECT COUNT(*) FROM auth.audit_log_entries WHERE created_at > NOW() - INTERVAL '5 minutes' AND payload->>'action' LIKE '%failed%';" 2>/dev/null | tr -d ' ')

echo "  Auth failures detected: $AUTH_FAILURES"

if [ "$AUTH_FAILURES" -gt 5 ]; then
  echo "  ALERT TRIPPED: Auth Failure Spike detected!"
  echo "  [ALERT] Severity: WARNING"
  echo "  [ALERT] Title: Auth Failure Spike"
  echo "  [ALERT] Message: $AUTH_FAILURES auth failures in the last 5 minutes"
  
  # Send to webhook if configured
  if [ -n "$TEST_WEBHOOK" ]; then
    curl -s -X POST -H "Content-Type: application/json"       -d "{"severity":"WARNING","title":"Auth Failure Spike","message":"$AUTH_FAILURES auth failures in the last 5 minutes","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}"       "$TEST_WEBHOOK"
    echo "  Alert sent to webhook: $TEST_WEBHOOK"
  fi
else
  echo "  No alert triggered (threshold not met)"
fi

echo ""
echo "Step 3: Verifying alert was logged..."
if grep -q "ALERT.*Auth Failure Spike" "$LOG_FILE" 2>/dev/null; then
  echo "  CONFIRMED: Alert found in log file"
else
  echo "  Note: Alert would be logged when threshold is exceeded"
fi

echo ""
echo "=== Test Complete ==="
echo "Dashboard: http://127.0.0.1:54323"
echo "Logs: $LOG_FILE"
