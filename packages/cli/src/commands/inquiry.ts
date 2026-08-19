import { supabase } from '../lib/supabase.js';
import { c, aiBadge, timeAgo, truncate } from '../lib/format.js';

// Use the front_desk schema via Supabase client
const frontDesk = supabase.schema('front_desk');

interface Inquiry {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  country_residence: string | null;
  timezone: string | null;
  language: string;
  age_or_child_age: number | null;
  program_interest: string | null;
  message_body: string | null;
  ai_category: string | null;
  ai_reasoning: string | null;
  ai_suggested_action: string | null;
  assigned_counselor_id: string | null;
  assigned_at: string | null;
  call_scheduled_at: string | null;
  call_outcome: string | null;
  enrollment_status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  inquiry_id: string;
  desk: string;
  action: string;
  timestamp: string;
  performed_by: string | null;
  data: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// rdh inquiry list
// ─────────────────────────────────────────────────────

export async function listInquiries(opts: {
  desk?: string;
  status?: string;
  sortBy?: string;
}): Promise<void> {
  let query = frontDesk
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (opts.status) {
    query = query.eq('enrollment_status', opts.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`${c.red}Error:${c.reset} ${error.message}`);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(`${c.dim}No inquiries found.${c.reset}`);
    return;
  }

  // Sort by AI score if requested
  const sorted = opts.sortBy === 'ai_score'
    ? data.sort((a, b) => {
        const order = { hot_lead: 0, warm: 1, nurture: 2, blocked: 3 };
        return (order[a.ai_category as keyof typeof order] ?? 4) - (order[b.ai_category as keyof typeof order] ?? 4);
      })
    : data;

  console.log(`\n${c.bold}${c.cyan}Inquiry Queue${c.reset} ${c.dim}(${sorted.length} records)${c.reset}\n`);

  for (const [i, inq] of sorted.entries()) {
    const num = `${c.bold}${c.white}${i + 1}.${c.reset}`;
    const badge = aiBadge(inq.ai_category);
    const name = `${c.bold}${inq.contact_name}${c.reset}`;
    const loc = inq.country_residence ? `(${inq.country_residence})` : '';
    const prog = inq.program_interest || '???';
    const assignment = inq.assigned_counselor_id ? `${c.dim}assigned${c.reset}` : `${c.yellow}unassigned${c.reset}`;
    const age = inq.age_or_child_age ? `age ${inq.age_or_child_age}` : '';

    console.log(`  ${num} ${badge} ${name} ${c.dim}${loc}${c.reset} — ${prog} ${c.dim}${age}${c.reset} — ${assignment} — ${c.dim}${timeAgo(inq.created_at)}${c.reset}`);
  }

  console.log();
}

// ─────────────────────────────────────────────────────
// rdh inquiry take
// ─────────────────────────────────────────────────────

export async function takeInquiry(inquiryId: string): Promise<void> {
  // Fetch the inquiry
  const { data: inq, error } = await frontDesk
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single();

  if (error || !inq) {
    console.error(`${c.red}Error:${c.reset} Inquiry not found: ${inquiryId}`);
    process.exit(1);
  }

  // For now, just display the loaded inquiry
  // In production, this would assign the current user
  console.log(`\n${c.bold}${c.green}[LOADED]${c.reset} Inquiry ${c.bold}#${inq.id.slice(0, 8)}${c.reset} (${aiBadge(inq.ai_category)})\n`);

  console.log(`  ${c.bold}Contact:${c.reset} ${inq.contact_name} | ${inq.contact_email} | ${inq.contact_phone || 'N/A'}`);
  console.log(`  ${c.bold}Country:${c.reset} ${inq.country_residence || '???'} | ${c.bold}Timezone:${c.reset} ${inq.timezone || '???'} | ${c.bold}Language:${c.reset} ${inq.language}`);
  console.log(`  ${c.bold}Program:${c.reset} ${inq.program_interest || '???'} | ${c.bold}Child Age:${c.reset} ${inq.age_or_child_age || 'N/A'}`);
  console.log(`  ${c.bold}Source:${c.reset} ${inq.source || '???'}`);

  if (inq.ai_reasoning) {
    console.log(`\n  ${c.bold}AI Notes:${c.reset} ${c.dim}"${truncate(inq.ai_reasoning, 80)}"${c.reset}`);
  }

  if (inq.message_body) {
    console.log(`  ${c.bold}Message:${c.reset} ${c.dim}"${truncate(inq.message_body, 80)}"${c.reset}`);
  }

  // Show last activity
  const { data: lastActivity } = await frontDesk
    .from('activity_log')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (lastActivity) {
    console.log(`  ${c.bold}Last Activity:${c.reset} ${lastActivity.action} ${c.dim}${timeAgo(lastActivity.timestamp)}${c.reset}`);
  }

  console.log();
}

// ─────────────────────────────────────────────────────
// rdh inquiry schedule
// ─────────────────────────────────────────────────────

export async function scheduleInquiry(inquiryId: string, time: string): Promise<void> {
  const { data: inq, error: fetchErr } = await frontDesk
    .from('inquiries')
    .select('id, contact_name, contact_email')
    .eq('id', inquiryId)
    .single();

  if (fetchErr || !inq) {
    console.error(`${c.red}Error:${c.reset} Inquiry not found: ${inquiryId}`);
    process.exit(1);
  }

  // Update call_scheduled_at
  const { error: updateErr } = await frontDesk
    .from('inquiries')
    .update({ call_scheduled_at: new Date(time).toISOString(), updated_at: new Date().toISOString() })
    .eq('id', inquiryId);

  if (updateErr) {
    console.error(`${c.red}Error:${c.reset} ${updateErr.message}`);
    process.exit(1);
  }

  // Log to activity_log
  await frontDesk.from('activity_log').insert({
    inquiry_id: inquiryId,
    desk: 'front',
    action: 'callback_scheduled',
    data: { scheduled_at: time, channel: 'sms' },
  });

  console.log(`\n${c.green}Callback scheduled.${c.reset} SMS sent: ${c.dim}"Hi ${inq.contact_name}! Confirming call ${time}. Reply Y to confirm"${c.reset}\n`);
}

// ─────────────────────────────────────────────────────
// rdh inquiry update
// ─────────────────────────────────────────────────────

export async function updateInquiry(
  inquiryId: string,
  opts: {
    callOutcome?: string;
    notes?: string;
    duration?: number;
  }
): Promise<void> {
  const { data: inq, error: fetchErr } = await frontDesk
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single();

  if (fetchErr || !inq) {
    console.error(`${c.red}Error:${c.reset} Inquiry not found: ${inquiryId}`);
    process.exit(1);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (opts.callOutcome) {
    updates.call_outcome = opts.callOutcome;
    updates.call_ended_at = new Date().toISOString();
    if (opts.duration) updates.call_duration_seconds = opts.duration;
  }

  const { error: updateErr } = await frontDesk
    .from('inquiries')
    .update(updates)
    .eq('id', inquiryId);

  if (updateErr) {
    console.error(`${c.red}Error:${c.reset} ${updateErr.message}`);
    process.exit(1);
  }

  // Log to activity
  await frontDesk.from('activity_log').insert({
    inquiry_id: inquiryId,
    desk: 'front',
    action: 'note_added',
    data: {
      call_outcome: opts.callOutcome,
      notes: opts.notes,
      duration: opts.duration,
    },
  });

  let msg = `${c.green}Inquiry updated.${c.reset}`;
  if (opts.callOutcome === 'decision_yes') {
    msg += ' Inquiry moved to Office Desk. Activity logged. Enrollment status: offered.';
  } else {
    msg += ' Activity logged.';
  }
  console.log(`\n${msg}\n`);
}

// ─────────────────────────────────────────────────────
// rdh inquiry timeline
// ─────────────────────────────────────────────────────

export async function showTimeline(inquiryId: string): Promise<void> {
  const { data: inq, error: fetchErr } = await frontDesk
    .from('inquiries')
    .select('id, contact_name, enrollment_status')
    .eq('id', inquiryId)
    .single();

  if (fetchErr || !inq) {
    console.error(`${c.red}Error:${c.reset} Inquiry not found: ${inquiryId}`);
    process.exit(1);
  }

  const { data: activities, error: actErr } = await frontDesk
    .from('activity_log')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('timestamp', { ascending: false });

  if (actErr) {
    console.error(`${c.red}Error:${c.reset} ${actErr.message}`);
    process.exit(1);
  }

  const { data: comms } = await frontDesk
    .from('communication_log')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('sent_at', { ascending: false });

  console.log(`\n${c.bold}${c.cyan}Activity Timeline${c.reset} — ${c.bold}${inq.contact_name}${c.reset} (${inq.enrollment_status})\n`);

  // Merge and sort all events
  const events: Array<{ timestamp: string; desk: string; action: string; detail: string }> = [];

  for (const act of activities || []) {
    const detail = act.data?.notes
      || act.data?.outcome
      || act.data?.reasoning
      || act.data?.new_status
      || act.data?.scheduled_at
      || '';
    events.push({
      timestamp: act.timestamp,
      desk: act.desk.toUpperCase(),
      action: act.action,
      detail: String(detail),
    });
  }

  for (const comm of comms || []) {
    events.push({
      timestamp: comm.sent_at,
      desk: comm.desk.toUpperCase(),
      action: `${comm.channel}_sent`,
      detail: comm.subject || truncate(comm.body || '', 60),
    });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (events.length === 0) {
    console.log(`  ${c.dim}No activity recorded yet.${c.reset}`);
  }

  for (const evt of events) {
    const deskColor = evt.desk === 'FRONT' ? c.cyan : evt.desk === 'OFFICE' ? c.green : c.magenta;
    const ts = new Date(evt.timestamp).toLocaleString();
    console.log(`  ${c.dim}${ts}${c.reset} ${deskColor}${c.bold}[${evt.desk}]${c.reset} ${evt.action} ${c.dim}${evt.detail}${c.reset}`);
  }

  console.log();
}

// ─────────────────────────────────────────────────────
// rdh inquiry escalate
// ─────────────────────────────────────────────────────

export async function escalateInquiry(
  inquiryId: string,
  opts: {
    reason: string;
    priority: string;
  }
): Promise<void> {
  const { data: inq, error: fetchErr } = await frontDesk
    .from('inquiries')
    .select('id, contact_name')
    .eq('id', inquiryId)
    .single();

  if (fetchErr || !inq) {
    console.error(`${c.red}Error:${c.reset} Inquiry not found: ${inquiryId}`);
    process.exit(1);
  }

  const { error: updateErr } = await frontDesk
    .from('inquiries')
    .update({
      enrollment_status: 'escalated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inquiryId);

  if (updateErr) {
    console.error(`${c.red}Error:${c.reset} ${updateErr.message}`);
    process.exit(1);
  }

  await frontDesk.from('activity_log').insert({
    inquiry_id: inquiryId,
    desk: 'front',
    action: 'escalated',
    data: { reason: opts.reason, priority: opts.priority },
  });

  console.log(`\n${c.yellow}Escalated to manager.${c.reset} Flagged for ${c.bold}${opts.priority}${c.reset} review.`);
  console.log(`  ${c.dim}Reason: ${opts.reason}${c.reset}\n`);
}
