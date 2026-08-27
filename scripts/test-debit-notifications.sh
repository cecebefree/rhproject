#!/bin/bash
set -e

echo "Day 5: Debit Orders + Notifications Tests"
echo ""

# Setup
STUDENT_ID="${STUDENT_ID:-$(uuidgen)}"
INVOICE_ID="${INVOICE_ID:-$(uuidgen)}"

# Test 1: Create debit order
echo "Test 1: Create debit order (monthly)..."
DEBIT_ORDER=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/create_debit_order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "p_student_id": "'$STUDENT_ID'",
    "p_invoice_id": "'$INVOICE_ID'",
    "p_amount": 5000,
    "p_frequency": "monthly",
    "p_start_date": "'$(date +%Y-%m-%d)'",
    "p_end_date": "'$(date -d "+1 year" +%Y-%m-%d)'",
    "p_bank_account_id": "bank_acc_123"
  }')

DEBIT_ORDER_ID=$(echo $DEBIT_ORDER | jq -r '.[0].debit_order_id')
DO_STATUS=$(echo $DEBIT_ORDER | jq -r '.[0].status')

if [ "$DO_STATUS" == "pending" ]; then
  echo "PASS Test 1: Debit order created ($DEBIT_ORDER_ID)"
else
  echo "FAIL Test 1: Expected status 'pending', got '$DO_STATUS'"
  exit 1
fi

# Test 2: Activate debit order
echo "Test 2: Activate debit order..."
ACTIVATE=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/activate_debit_order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "p_debit_order_id": "'$DEBIT_ORDER_ID'",
    "p_mandate_reference": "mandate_12345"
  }')

ACTIVATED_STATUS=$(echo $ACTIVATE | jq -r '.[0].status')

if [ "$ACTIVATED_STATUS" == "active" ]; then
  echo "PASS Test 2: Debit order activated"
else
  echo "FAIL Test 2: Expected status 'active', got '$ACTIVATED_STATUS'"
  exit 1
fi

# Test 3: Send payment_succeeded notification
echo "Test 3: Send payment_succeeded notification..."
NOTIFICATION=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/send_notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "p_student_id": "'$STUDENT_ID'",
    "p_notification_type_id": "payment_succeeded",
    "p_metadata": {
      "student_name": "Test Student",
      "amount": "R5,000.00"
    }
  }')

NOTIFICATION_ID=$(echo $NOTIFICATION | jq -r '.[0].notification_id')
NOTIF_STATUS=$(echo $NOTIFICATION | jq -r '.[0].status')

if [ "$NOTIF_STATUS" == "pending" ]; then
  echo "PASS Test 3: Notification queued ($NOTIFICATION_ID)"
else
  echo "FAIL Test 3: Expected status 'pending', got '$NOTIF_STATUS'"
  exit 1
fi

# Test 4: Send debit_order_created notification
echo "Test 4: Send debit_order_created notification..."
DO_NOTIF=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/send_notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "p_student_id": "'$STUDENT_ID'",
    "p_notification_type_id": "debit_order_created",
    "p_metadata": {
      "student_name": "Test Student",
      "amount": "R5,000.00",
      "frequency": "monthly"
    }
  }')

DO_NOTIF_ID=$(echo $DO_NOTIF | jq -r '.[0].notification_id')
DO_NOTIF_STATUS=$(echo $DO_NOTIF | jq -r '.[0].status')

if [ "$DO_NOTIF_STATUS" == "pending" ]; then
  echo "PASS Test 4: Debit order notification queued ($DO_NOTIF_ID)"
else
  echo "FAIL Test 4: Expected status 'pending', got '$DO_NOTIF_STATUS'"
  exit 1
fi

# Test 5: Mark notification as read
echo "Test 5: Mark notification as read..."
READ=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/mark_notification_read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"p_notification_id": "'$NOTIFICATION_ID'"}')

READ_STATUS=$(echo $READ | jq -r '.[0].status')

if [ "$READ_STATUS" == "read" ]; then
  echo "PASS Test 5: Notification marked as read"
else
  echo "FAIL Test 5: Expected status 'read', got '$READ_STATUS'"
  exit 1
fi

# Test 6: Get unread notification count
echo "Test 6: Get unread notification count..."
COUNT=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/get_unread_notification_count \
  -H "Authorization: Bearer $ADMIN_JWT")

UNREAD_COUNT=$(echo $COUNT | jq -r '.[0].count')

if [ "$UNREAD_COUNT" -ge 0 ]; then
  echo "PASS Test 6: Unread count = $UNREAD_COUNT"
else
  echo "FAIL Test 6: Invalid count"
  exit 1
fi

# Test 7: Verify debit order history
echo "Test 7: Verify debit order history..."
HISTORY=$(curl -s -X GET "http://localhost:54321/rest/v1/debit_order_history?debit_order_id=eq.$DEBIT_ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_JWT")

HISTORY_COUNT=$(echo $HISTORY | jq 'length')

if [ "$HISTORY_COUNT" -ge 2 ]; then
  echo "PASS Test 7: Debit order history has $HISTORY_COUNT entries (created, activated)"
else
  echo "FAIL Test 7: Expected 2+ history entries, got $HISTORY_COUNT"
  exit 1
fi

# Test 8: Cancel debit order
echo "Test 8: Cancel debit order..."
CANCEL=$(curl -s -X POST http://localhost:54321/rest/v1/rpc/cancel_debit_order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "p_debit_order_id": "'$DEBIT_ORDER_ID'",
    "p_reason": "Customer requested cancellation"
  }')

CANCELLED_STATUS=$(echo $CANCEL | jq -r '.[0].status')

if [ "$CANCELLED_STATUS" == "cancelled" ]; then
  echo "PASS Test 8: Debit order cancelled"
else
  echo "FAIL Test 8: Expected status 'cancelled', got '$CANCELLED_STATUS'"
  exit 1
fi

echo ""
echo "All 8 tests completed!"
