import 'dotenv/config';
import { readFile } from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

/**
 * One-time script: Send Vithos v2.5 product update email to all signed-up users.
 *
 * Usage:
 *   pnpm tsx src/scripts/send-v25-update.ts              # dry-run (default)
 *   pnpm tsx src/scripts/send-v25-update.ts --send        # actually send
 *   pnpm tsx src/scripts/send-v25-update.ts --send --test me@example.com  # single test
 */

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 2000; // respect rate limits
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.vithos.in';

interface MailtrapSendPayload {
  from: { email: string; name: string };
  to: { email: string }[];
  subject: string;
  html: string;
  text: string;
  category: string;
}

async function loadTemplate(): Promise<string> {
  const templatePath = path.resolve(__dirname, '../../mail_templates/product-update.html');
  return readFile(templatePath, 'utf8');
}

function renderTemplate(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  );
}

function generatePlainText(userName: string): string {
  return `
What's new in Vithos v2.5
--------------------------

Hi ${userName},

We just shipped Vithos v2.5 — email notifications are now live.

1. Report-ready notifications
   Get an email the moment your uploaded report is processed — biomarker count, date, and a direct link to your results.

2. You're in control
   Toggle email notifications on or off anytime from your profile settings. It's enabled by default.

3. More on the way
   Monthly health digests and trend alerts are coming soon.

Open Vithos: ${FRONTEND_URL}

Have feedback? Reply to this email — we read every message.

Vithos — Your Health Companion
  `.trim();
}

async function sendViaMailtrap(payload: MailtrapSendPayload): Promise<void> {
  const apiToken = process.env.MAILTRAP_API_KEY;
  if (!apiToken) throw new Error('MAILTRAP_API_KEY is not set');

  const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';
  let endpoint: string;

  if (useSandbox) {
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    if (!inboxId) throw new Error('MAILTRAP_INBOX_ID required in sandbox mode');
    endpoint = `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;
  } else {
    endpoint = 'https://send.api.mailtrap.io/api/send';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Token': apiToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailtrap ${response.status}: ${body}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const shouldSend = args.includes('--send');
  const testIdx = args.indexOf('--test');
  const testEmail = testIdx !== -1 ? args[testIdx + 1] : null;

  if (!shouldSend) {
    logger.info('=== DRY RUN === Add --send to actually send emails');
  }

  // Validate env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }
  if (!process.env.MAILTRAP_API_KEY) {
    logger.error('MAILTRAP_API_KEY is required');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Load template
  const template = await loadTemplate();
  logger.info('Template loaded');

  // Fetch all users
  let users: { id: string; email: string; name: string }[] = [];

  if (testEmail) {
    users = [{ id: 'test', email: testEmail, name: testEmail.split('@')[0] }];
    logger.info(`Test mode: sending only to ${testEmail}`);
  } else {
    // Paginate through all users via admin API
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        logger.error('Failed to fetch users', { error: error.message, page });
        process.exit(1);
      }

      for (const user of data.users) {
        if (user.email) {
          users.push({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
          });
        }
      }

      hasMore = data.users.length === perPage;
      page++;
    }
  }

  logger.info(`Found ${users.length} users to email`);

  if (users.length === 0) {
    logger.info('No users found. Exiting.');
    return;
  }

  const fromEmail = process.env.FROM_EMAIL || 'report@vithos.in';
  let sent = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / BATCH_SIZE);

    logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);

    for (const user of batch) {
      const html = renderTemplate(template, {
        userName: user.name,
        dashboardUrl: FRONTEND_URL,
      });
      const text = generatePlainText(user.name);

      if (!shouldSend) {
        logger.info(`[DRY RUN] Would send to: ${user.email} (${user.name})`);
        sent++;
        continue;
      }

      try {
        await sendViaMailtrap({
          from: { name: 'Vithos', email: fromEmail },
          to: [{ email: user.email }],
          subject: "What's new in Vithos v2.5",
          html,
          text,
          category: 'product-update',
        });
        sent++;
        logger.info(`Sent to ${user.email}`);
      } catch (err: any) {
        failed++;
        logger.error(`Failed to send to ${user.email}`, { error: err.message });
      }
    }

    // Rate limit pause between batches
    if (i + BATCH_SIZE < users.length && shouldSend) {
      logger.info(`Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  logger.info('=== Done ===', { sent, failed, total: users.length, dryRun: !shouldSend });
}

main().catch((err) => {
  logger.error('Script failed', { error: err.message });
  process.exit(1);
});
