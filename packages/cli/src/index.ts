#!/usr/bin/env node

import { listInquiries, takeInquiry, scheduleInquiry, updateInquiry, showTimeline, escalateInquiry } from './commands/inquiry.js';
import { showDashboard } from './commands/dashboard.js';

const args = process.argv.slice(2);

function printHelp(): void {
  console.log(`
\x1b[1m\x1b[36mrdh\x1b[0m — Redhouse Desk CLI

\x1b[1mUsage:\x1b[0m
  rdh inquiry list [options]
  rdh inquiry take <inquiry_id>
  rdh inquiry schedule <inquiry_id> --time "<datetime>"
  rdh inquiry update <inquiry_id> --call-outcome <outcome> --notes "<text>" --duration <seconds>
  rdh inquiry timeline <inquiry_id>
  rdh inquiry escalate <inquiry_id> --reason "<text>" --priority <low|medium|high|urgent>
  rdh dashboard [options]

\x1b[1mOptions:\x1b[0m
  --desk <front|office|school>     Filter by desk
  --status <status>                Filter by enrollment status
  --sort-by <ai_score|time>        Sort order for list
  --period <today|week|month>      Dashboard time period
  --time "<datetime>"              Schedule time
  --call-outcome <outcome>         Call result
  --notes "<text>"                 Notes text
  --duration <seconds>             Call duration
  --reason "<text>"                Escalation reason
  --priority <level>               Escalation priority
`);
}

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main(): Promise<void> {
  const command = args[0];
  const sub = args[1];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'inquiry') {
    switch (sub) {
      case 'list':
        await listInquiries({
          desk: getFlag('desk'),
          status: getFlag('status'),
          sortBy: getFlag('sort-by'),
        });
        break;

      case 'take': {
        const id = args[2];
        if (!id) {
          console.error('\x1b[31mError:\x1b[0m inquiry ID required');
          process.exit(1);
        }
        await takeInquiry(id);
        break;
      }

      case 'schedule': {
        const id = args[2];
        const time = getFlag('time');
        if (!id || !time) {
          console.error('\x1b[31mError:\x1b[0m inquiry ID and --time required');
          process.exit(1);
        }
        await scheduleInquiry(id, time);
        break;
      }

      case 'update': {
        const id = args[2];
        if (!id) {
          console.error('\x1b[31mError:\x1b[0m inquiry ID required');
          process.exit(1);
        }
        await updateInquiry(id, {
          callOutcome: getFlag('call-outcome'),
          notes: getFlag('notes'),
          duration: getFlag('duration') ? parseInt(getFlag('duration')!) : undefined,
        });
        break;
      }

      case 'timeline': {
        const id = args[2];
        if (!id) {
          console.error('\x1b[31mError:\x1b[0m inquiry ID required');
          process.exit(1);
        }
        await showTimeline(id);
        break;
      }

      case 'escalate': {
        const id = args[2];
        const reason = getFlag('reason');
        const priority = getFlag('priority') || 'medium';
        if (!id || !reason) {
          console.error('\x1b[31mError:\x1b[0m inquiry ID and --reason required');
          process.exit(1);
        }
        await escalateInquiry(id, { reason, priority });
        break;
      }

      default:
        console.error(`\x1b[31mError:\x1b[0m Unknown inquiry command: ${sub}`);
        printHelp();
        process.exit(1);
    }
  } else if (command === 'dashboard') {
    await showDashboard({
      desk: getFlag('desk'),
      period: getFlag('period'),
    });
  } else {
    console.error(`\x1b[31mError:\x1b[0m Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\x1b[31mFatal:\x1b[0m ${err.message}`);
  process.exit(1);
});
