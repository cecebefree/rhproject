import { supabase } from '../lib/supabase.js';
import { c } from '../lib/format.js';

const frontDesk = supabase.schema('front_desk');

export async function showDashboard(opts: {
  desk?: string;
  period?: string;
}): Promise<void> {
  const period = opts.period || 'today';

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Fetch all inquiries in period
  const { data: inquiries, error } = await frontDesk
    .from('inquiries')
    .select('*')
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error(`${c.red}Error:${c.reset} ${error.message}`);
    process.exit(1);
  }

  const all = inquiries || [];
  const total = all.length;

  // Callbacks scheduled
  const callbacksScheduled = all.filter(i => i.call_scheduled_at).length;

  // Calls completed (has call_ended_at)
  const callsCompleted = all.filter(i => i.call_ended_at).length;

  // Show rate
  const showRate = callbacksScheduled > 0
    ? Math.round((callsCompleted / callbacksScheduled) * 100)
    : 0;

  // Enrollment offers
  const enrollmentOffers = all.filter(i => i.enrollment_status === 'offered').length;

  // Conversion rate (offers / calls completed)
  const conversionRate = callsCompleted > 0
    ? Math.round((enrollmentOffers / callsCompleted) * 100)
    : 0;

  // AI distribution
  const hotLeads = all.filter(i => i.ai_category === 'hot_lead').length;
  const warmLeads = all.filter(i => i.ai_category === 'warm').length;
  const nurtureLeads = all.filter(i => i.ai_category === 'nurture').length;
  const blockedLeads = all.filter(i => i.ai_category === 'blocked').length;

  // Waiting >5m (unassigned, created >5 min ago)
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const waitingLong = all.filter(i =>
    !i.assigned_counselor_id && new Date(i.created_at) < fiveMinAgo
  ).length;

  // Callbacks overdue (scheduled but not started)
  const callbacksOverdue = all.filter(i =>
    i.call_scheduled_at && !i.call_started_at && new Date(i.call_scheduled_at) < now
  ).length;

  // Print dashboard
  console.log(`\n${c.bold}${c.cyan}Front Desk Dashboard${c.reset} ${c.dim}— ${period}${c.reset}\n`);

  // Cards
  console.log(`  ${c.bold}Inquiries received:${c.reset}    ${c.bold}${c.white}${total}${c.reset}`);
  console.log(`  ${c.bold}Callbacks scheduled:${c.reset}   ${c.bold}${c.white}${callbacksScheduled}${c.reset}`);
  console.log(`  ${c.bold}Calls completed:${c.reset}       ${c.bold}${c.white}${callsCompleted}${c.reset}`);
  console.log(`  ${c.bold}Show rate:${c.reset}             ${showRate >= 70 ? c.green : c.yellow}${showRate}%${c.reset}`);
  console.log(`  ${c.bold}Enrollment offers:${c.reset}     ${c.bold}${c.white}${enrollmentOffers}${c.reset}`);
  console.log(`  ${c.bold}Conversion rate:${c.reset}       ${conversionRate >= 25 ? c.green : c.yellow}${conversionRate}%${c.reset}`);

  // AI Distribution
  console.log(`\n  ${c.bold}AI Distribution:${c.reset}`);
  console.log(`    ${c.red}●${c.reset} Hot:     ${hotLeads}`);
  console.log(`    ${c.yellow}●${c.reset} Warm:    ${warmLeads}`);
  console.log(`    ${c.blue}●${c.reset} Nurture: ${nurtureLeads}`);
  console.log(`    ${c.gray}●${c.reset} Blocked: ${blockedLeads}`);

  // Alerts
  if (waitingLong > 0 || callbacksOverdue > 0) {
    console.log(`\n  ${c.bold}${c.red}Alerts:${c.reset}`);
    if (waitingLong > 0) {
      console.log(`    ${c.red}⚠ ${waitingLong} inquiry(ies) waiting >5m without assignment${c.reset}`);
    }
    if (callbacksOverdue > 0) {
      console.log(`    ${c.red}⚠ ${callbacksOverdue} callback(s) overdue${c.reset}`);
    }
  }

  console.log();
}
