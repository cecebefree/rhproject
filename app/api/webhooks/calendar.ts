/**
 * Calendar Webhook Handler — Cal.com + Zoom → Supabase
 * =====================================================
 * Endpoint: POST /api/webhooks/calendar?source=calcom|zoom
 *
 * Handles incoming calendar webhooks with:
 *   - Cal.com: booking.created, booking.updated, booking.cancelled
 *   - Zoom: meeting.started, meeting.ended
 *   - Provider-specific signature verification
 *   - Idempotent processing via RPC
 *   - Structured error handling with audit logging
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   CALCOM_WEBHOOK_SECRET        - Cal.com webhook signing secret
 *   ZOOM_WEBHOOK_SECRET          - Zoom webhook secret token
 *   NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    - Service role key (bypasses RLS)
 *
 * @module app/api/webhooks/calendar
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cal.com webhook payload
 * @see https://cal.com/docs/core-features/webhooks
 */
interface CalComWebhookPayload {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_UPDATED' | 'BOOKING_CANCELLED';
  createdAt: string;
  payload: {
    eventTypeId: number;
    eventTitle: string;
    eventDescription?: string;
    eventStartTime: string;
    eventEndTime: string;
    eventLocation?: string;
    eventTimezone?: string;
    attendeeEmail: string;
    attendeeName: string;
    attendeeTimeZone?: string;
    bookingId: number;
    uid: string;
    organiserEmail: string;
    [key: string]: unknown;
  };
}

/**
 * Zoom webhook payload
 * @see https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/webhook
 */
interface ZoomWebhookPayload {
  event: 'meeting.started' | 'meeting.ended' | 'meeting.created' | 'meeting.updated' | 'meeting.deleted';
  event_ts: number;
  data?: {
    object: {
      id: string;
      host_id: string;
      topic: string;
      start_time?: string;
      end_time?: string;
      duration?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Webhook processing result
 */
interface WebhookResult {
  success: boolean;
  message: string;
  event_id?: string;
}

/**
 * Audit entry for webhook failures
 */
interface AuditEntry {
  provider: string;
  webhook_event_type?: string;
  event_id?: string;
  error: string;
  error_code?: string;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const CALCOM_WEBHOOK_SECRET = process.env.CALCOM_WEBHOOK_SECRET ?? '';
const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ══════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verify Cal.com webhook signature (HMAC-SHA256)
 *
 * Cal.com sends the signature in the x-cal-signature-256 header.
 * We compute HMAC-SHA256(payload, secret) and compare.
 *
 * @param payloadRaw - Raw request body string
 * @param signature - Value from x-cal-signature-256 header
 * @param secret - Webhook signing secret
 * @returns true if signature is valid
 */
function verifyCalComSignature(
  payloadRaw: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(payloadRaw, 'utf8')
      .digest('hex');

    if (computed.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Verify Zoom webhook signature (HMAC-SHA256)
 *
 * Zoom sends the signature in the x-zm-signature header.
 * Format: v0={timestamp},{hash}
 *
 * @param payloadRaw - Raw request body string
 * @param signature - Value from x-zm-signature header
 * @param secret - Webhook secret token
 * @returns true if signature is valid
 */
function verifyZoomSignature(
  payloadRaw: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  try {
    const parts = signature.split(',');
    if (parts.length !== 2 || !parts[0].startsWith('v0=')) return false;

    const timestamp = parts[0].substring(3);
    const hash = parts[1];

    const message = `${timestamp}.${payloadRaw}`;
    const computed = crypto
      .createHmac('sha256', secret)
      .update(message, 'utf8')
      .digest('hex');

    return computed === hash;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Log webhook failure to Supabase audit_log + calendar_webhook_logs
 */
async function logWebhookError(
  supabase: ReturnType<typeof createClient>,
  entry: AuditEntry,
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      table_name: 'calendar_webhooks',
      operation: entry.error_code ?? 'WEBHOOK_ERROR',
      new_values: entry,
      user_id: null,
    });
  } catch (err) {
    console.error('[CalendarWebhook] Failed to log audit entry:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Resolve org + calendar from email
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve organization_id and calendar_id from a user email.
 * Returns null if user not found.
 */
async function resolveOrgAndCalendar(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ org_id: string; calendar_id: string } | null> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('email', email)
    .single();

  if (userError || !user) return null;

  const { data: calendar, error: calError } = await supabase
    .from('calendar')
    .select('id')
    .eq('organization_id', user.organization_id)
    .limit(1)
    .single();

  if (calError || !calendar) return null;

  return {
    org_id: user.organization_id,
    calendar_id: calendar.id,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CAL.COM WEBHOOK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/calendar?source=calcom
 *
 * Handles Cal.com booking events:
 *   - BOOKING_CREATED → sync_calendar_event + generate_meeting_link
 *   - BOOKING_UPDATED → sync_calendar_event
 *   - BOOKING_CANCELLED → cancel_calendar_event
 */
async function handleCalComWebhook(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const payloadRaw = await req.text();

    if (!payloadRaw) {
      return NextResponse.json(
        { success: false, message: 'Empty request body' },
        { status: 400 },
      );
    }

    const signature = req.headers.get('x-cal-signature-256') ?? '';

    // Verify signature
    if (!verifyCalComSignature(payloadRaw, signature, CALCOM_WEBHOOK_SECRET)) {
      console.warn('[CalendarWebhook] Invalid Cal.com signature');

      const supabaseForAudit = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      });
      await logWebhookError(supabaseForAudit, {
        provider: 'cal_com',
        error: 'Signature verification failed',
        error_code: 'WEBHOOK_SIGNATURE_FAILED',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 401 },
      );
    }

    const body: CalComWebhookPayload = JSON.parse(payloadRaw);
    const { triggerEvent, payload: eventData } = body;

    // Initialize Supabase (service_role for webhook bypass)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Resolve org + calendar from organiser email
    const orgAndCalendar = await resolveOrgAndCalendar(supabase, eventData.organiserEmail);
    if (!orgAndCalendar) {
      console.error('[CalendarWebhook] Organiser not found:', eventData.organiserEmail);
      return NextResponse.json(
        { success: false, message: 'Organiser not found' },
        { status: 404 },
      );
    }

    const { org_id, calendar_id } = orgAndCalendar;
    const externalEventId = eventData.uid;

    if (triggerEvent === 'BOOKING_CANCELLED') {
      // ── Cancel ──────────────────────────────────────────────────────────
      const { data: syncEvent } = await supabase
        .from('calendar_sync_events')
        .select('id')
        .eq('external_event_id', externalEventId)
        .single();

      if (syncEvent) {
        const { error } = await supabase.rpc('cancel_calendar_event', {
          p_sync_event_id: syncEvent.id,
          p_cancellation_reason: 'Cal.com booking cancelled',
        });

        if (error) {
          console.error('[CalendarWebhook] Cancel RPC error:', error);
          return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 },
          );
        }
      }
    } else {
      // ── Create or Update ────────────────────────────────────────────────
      const attendees = [
        {
          email: eventData.attendeeEmail,
          name: eventData.attendeeName,
          status: triggerEvent === 'BOOKING_CREATED' ? 'pending' : 'accepted',
        },
        {
          email: eventData.organiserEmail,
          name: 'Organiser',
          status: 'accepted',
        },
      ];

      const { data: result, error } = await supabase.rpc('sync_calendar_event', {
        p_org_id: org_id,
        p_calendar_id: calendar_id,
        p_external_event_id: externalEventId,
        p_event_title: eventData.eventTitle,
        p_event_description: eventData.eventDescription || null,
        p_event_start: new Date(eventData.eventStartTime).toISOString(),
        p_event_end: new Date(eventData.eventEndTime).toISOString(),
        p_event_timezone: eventData.eventTimezone || 'UTC',
        p_location: eventData.eventLocation || null,
        p_attendees: JSON.stringify(attendees),
        p_meeting_link_type: null,
        p_external_updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[CalendarWebhook] Sync RPC error:', error);
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 },
        );
      }

      // Generate meeting link on creation
      if (result?.[0]?.sync_event_id && triggerEvent === 'BOOKING_CREATED') {
        const syncEventId = result[0].sync_event_id;

        const { error: linkError } = await supabase.rpc('generate_meeting_link', {
          p_sync_event_id: syncEventId,
          p_provider: 'google_meet',
          p_host_email: eventData.organiserEmail,
          p_guest_emails: [eventData.attendeeEmail],
        });

        if (linkError) {
          // Don't fail webhook on link generation error
          console.warn('[CalendarWebhook] Meeting link generation error:', linkError);
        }
      }
    }

    return NextResponse.json(
      { success: true, message: 'Webhook processed', event_id: externalEventId },
      { status: 200 },
    );
  } catch (err) {
    console.error('[CalendarWebhook] Cal.com error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ZOOM WEBHOOK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/calendar?source=zoom
 *
 * Handles Zoom meeting events:
 *   - meeting.started → update meeting_links.started_at
 *   - meeting.ended → update meeting_links.ended_at + status
 */
async function handleZoomWebhook(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const payloadRaw = await req.text();

    if (!payloadRaw) {
      return NextResponse.json(
        { success: false, message: 'Empty request body' },
        { status: 400 },
      );
    }

    const signature = req.headers.get('x-zm-signature') ?? '';

    // Verify signature (if secret configured)
    if (ZOOM_WEBHOOK_SECRET && !verifyZoomSignature(payloadRaw, signature, ZOOM_WEBHOOK_SECRET)) {
      console.warn('[CalendarWebhook] Invalid Zoom signature');

      const supabaseForAudit = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      });
      await logWebhookError(supabaseForAudit, {
        provider: 'zoom',
        error: 'Signature verification failed',
        error_code: 'WEBHOOK_SIGNATURE_FAILED',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 401 },
      );
    }

    const body: ZoomWebhookPayload = JSON.parse(payloadRaw);
    const { event, data } = body;

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Missing event type' },
        { status: 400 },
      );
    }

    // Initialize Supabase (service_role for webhook bypass)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const meetingId = data?.object?.id;

    if (meetingId && (event === 'meeting.started' || event === 'meeting.ended')) {
      // Find meeting link by provider meeting ID
      const { data: meetingLink } = await supabase
        .from('meeting_links')
        .select('id, calendar_sync_event_id')
        .eq('meeting_id', meetingId)
        .eq('provider', 'zoom')
        .single();

      if (!meetingLink) {
        console.warn('[CalendarWebhook] Meeting link not found for Zoom ID:', meetingId);
      } else {
        if (event === 'meeting.started') {
          await supabase
            .from('meeting_links')
            .update({ started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', meetingLink.id);
        } else if (event === 'meeting.ended') {
          await supabase
            .from('meeting_links')
            .update({
              ended_at: new Date().toISOString(),
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', meetingLink.id);
        }
      }
    }

    // Log webhook
    await supabase.from('calendar_webhook_logs').insert({
      webhook_source: 'zoom',
      webhook_event_type: event,
      webhook_payload: body,
      processing_status: 'success',
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: 'Zoom webhook processed' },
      { status: 200 },
    );
  } catch (err) {
    console.error('[CalendarWebhook] Zoom error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/webhooks/calendar?source=calcom|zoom
 *
 * Routes to provider-specific handler based on query param.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source') || 'calcom';

    let result: NextResponse;

    switch (source) {
      case 'calcom':
        result = await handleCalComWebhook(req as NextRequest);
        break;
      case 'zoom':
        result = await handleZoomWebhook(req as NextRequest);
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Unknown source. Use ?source=calcom or ?source=zoom' },
          { status: 400 },
        );
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CalendarWebhook] Processed ${source} webhook in ${elapsed}ms`);

    return result;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[CalendarWebhook] Unhandled error after ${elapsed}ms:`, err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA REFERENCE (for Postman / curl testing)
// ══════════════════════════════════════════════════════════════════════════════
//
// CAL.COM TEST: Booking Created
// ─────────────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/calendar?source=calcom" \
//   -H "Content-Type: application/json" \
//   -H "x-cal-signature-256: {computed_hmac}" \
//   -d '{
//     "triggerEvent": "BOOKING_CREATED",
//     "createdAt": "2026-08-25T10:00:00Z",
//     "payload": {
//       "eventTypeId": 1,
//       "eventTitle": "Grade 10 Math Review",
//       "eventStartTime": "2026-08-25T14:00:00Z",
//       "eventEndTime": "2026-08-25T15:00:00Z",
//       "eventLocation": "Virtual",
//       "eventTimezone": "Africa/Johannesburg",
//       "attendeeEmail": "student1@example.com",
//       "attendeeName": "Student 1",
//       "bookingId": 1001,
//       "uid": "cal_com_1001",
//       "organiserEmail": "teacher@example.com"
//     }
//   }'
//
// CAL.COM TEST: Booking Cancelled
// ────────────────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/calendar?source=calcom" \
//   -H "Content-Type: application/json" \
//   -H "x-cal-signature-256: {computed_hmac}" \
//   -d '{
//     "triggerEvent": "BOOKING_CANCELLED",
//     "createdAt": "2026-08-25T12:00:00Z",
//     "payload": {
//       "uid": "cal_com_1001",
//       "organiserEmail": "teacher@example.com"
//     }
//   }'
//
// ZOOM TEST: Meeting Started
// ──────────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/calendar?source=zoom" \
//   -H "Content-Type: application/json" \
//   -H "x-zm-signature: v0={timestamp},{hmac}" \
//   -d '{
//     "event": "meeting.started",
//     "event_ts": 1692960000,
//     "data": {
//       "object": {
//         "id": "zoom_abc123",
//         "host_id": "host123",
//         "topic": "Grade 10 Math Review"
//       }
//     }
//   }'
//
// ZOOM TEST: Meeting Ended
// ────────────────────────
// curl -X POST "http://localhost:3000/api/webhooks/calendar?source=zoom" \
//   -H "Content-Type: application/json" \
//   -d '{
//     "event": "meeting.ended",
//     "event_ts": 1692963600,
//     "data": {
//       "object": {
//         "id": "zoom_abc123",
//         "host_id": "host123",
//         "topic": "Grade 10 Math Review"
//       }
//     }
//   }'
//
// ERROR TESTS:
// ─────────────
// Invalid signature: returns 401 Unauthorized
// Unknown source: returns 400 "Unknown source"
// Empty body: returns 400 "Empty request body"
// Organiser not found: returns 404 "Organiser not found"
// ══════════════════════════════════════════════════════════════════════════════
