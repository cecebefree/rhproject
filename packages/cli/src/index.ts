#!/usr/bin/env node

import 'dotenv/config';
import { listInquiries, takeInquiry, scheduleInquiry, updateInquiry, showTimeline, escalateInquiry } from './commands/inquiry.js';
import { showDashboard } from './commands/dashboard.js';

const args = process.argv.slice(2);
const [command, subcommand, ...rest] = args;

(async () => {
  try {
    if (command === 'inquiry') {
      switch (subcommand) {
        case 'list':
          await listInquiries({ status: rest[0] });
          break;
        case 'take':
          await takeInquiry(rest[0]);
          break;
        case 'schedule': {
          const dateIdx = rest.indexOf('--date');
          const timeIdx = rest.indexOf('--time');
          const date = dateIdx >= 0 ? rest[dateIdx + 1] : '';
          const time = timeIdx >= 0 ? rest[timeIdx + 1] : '09:00';
          const datetime = date && time ? date + 'T' + time + ':00Z' : new Date().toISOString();
          await scheduleInquiry(rest[0], datetime);
          break;
        }
        case 'update':
          await updateInquiry(rest[0], JSON.parse(rest[1] || '{}'));
          break;
        case 'timeline':
          await showTimeline(rest[0]);
          break;
        case 'escalate': {
          const reasonIdx = rest.indexOf('--reason');
          const priorityIdx = rest.indexOf('--priority');
          const reason = reasonIdx >= 0 ? rest[reasonIdx + 1] : '';
          const priority = priorityIdx >= 0 ? rest[priorityIdx + 1] : 'medium';
          await escalateInquiry(rest[0], { reason, priority });
          break;
        }
        default:
          console.log('Usage: inquiry [list|take|schedule|update|timeline|escalate]');
      }
    } else if (command === 'dashboard') {
      await showDashboard({ period: subcommand || 'today' });
    } else {
      console.log('Usage: rdh [inquiry|dashboard]');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
