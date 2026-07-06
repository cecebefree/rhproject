#!/bin/bash
# redhouse-monitor.sh — P2-028: Monitoring + Alerting for Redhouse Supabase
# Checks DB health, auth failures, error rates. Sends alerts via webhook.

set -eo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
DB_HOST="127.0.0.1"
DB_PORT="54322"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
LOG_FILE="logs/monitor-$(date +%Y%m%d).log"

mkdir -p logs

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
  local severity="$1" title="$2" message="$3"
  log "ALERT [$severity]: $title — $message"
  if [ -n "$ALERT_WEBHOOK" ]; then
    curl -s -X POST -H "Content-Type: application/json"       -d "{\"severity\":\"$severity\",\"title\":\"$title\",\"message\":\"$message\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"       "$ALERT_WEBHOOK" > /dev/null 2>&1 || true
  fi
}

log "=== Redhouse Monitor Start ==="

# Check 1: DB connectivity
log "Check 1: Database connectivity"
if docker exec supabase_db_rhproject-new pg_isready -U postgres > /dev/null 2>&1; then
  log "  OK: Database is reachable"
else
  send_alert "CRITICAL" "Database Down" "PostgreSQL is not responding on port $DB_PORT"
fi

# Check 2: Auth failure rate (last 5 minutes)
log "Check 2: Auth failure rate (last 5 min)"
AUTH_FAILURES=$(docker exec supabase_db_rhproject-new psql -U postgres -d postgres -t -c   "SELECT COUNT(*) FROM auth.audit_log_entries WHERE created_at > NOW() - INTERVAL '5 minutes' AND payload->>'action' LIKE '%failed%';" 2>/dev/null | tr -d ' ')
log "  Auth failures in last 5 min: $AUTH_FAILURES"
if [ "$AUTH_FAILURES" -gt 10 ]; then
  send_alert "WARNING" "Auth Failure Spike" "$AUTH_FAILURES auth failures in the last 5 minutes"
fi

# Check 3: Total users
log "Check 3: Total users"
TOTAL_USERS=$(docker exec supabase_db_rhproject-new psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM auth.users;" | tr -d ' ')
log "  Total auth users: $TOTAL_USERS"

# Check 4: Profiles without consent (RULE 4 violation)
log "Check 4: Profiles without consent"
NO_CONSENT=$(docker exec supabase_db_rhproject-new psql -U postgres -d postgres -t -c   "SELECT COUNT(*) FROM profiles WHERE consent_given = FALSE AND registration_status = 'approved';" | tr -d ' ')
log "  Approved profiles without consent: $NO_CONSENT"
if [ "$NO_CONSENT" -gt 0 ]; then
  send_alert "WARNING" "Consent Violation" "$NO_CONSENT approved profiles missing consent_given"
fi

# Check 5: RLS enabled on critical tables
log "Check 5: RLS status"
RLS_DISABLED=$(docker exec supabase_db_rhproject-new psql -U postgres -d postgres -t -c   "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles','courses','chapters','enrollments','chapter_progress','devotional_config','devotional_item','tenant_devotional','tenant_lms','tenant_mobile') AND rowsecurity = FALSE;" | tr -d ' ')
log "  Tables with RLS disabled: $RLS_DISABLED"
if [ "$RLS_DISABLED" -gt 0 ]; then
  send_alert "CRITICAL" "RLS Disabled" "$RLS_DISABLED critical tables have RLS disabled"
fi

# Check 6: Disk usage
log "Check 6: Disk usage"
DISK_USAGE=$(docker exec supabase_db_rhproject-new df -h /var/lib/postgresql/data 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
log "  Disk usage: ${DISK_USAGE}%"
if [ "$DISK_USAGE" -gt 80 ]; then
  send_alert "WARNING" "High Disk Usage" "Disk usage is at ${DISK_USAGE}%"
fi

log "=== Redhouse Monitor Complete ==="
log "Dashboard: http://127.0.0.1:54323"
