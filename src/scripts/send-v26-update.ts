import 'dotenv/config';
import { readFile } from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

/**
 * One-time script: Send Vithos v2.6 product update email to all signed-up users.
 *
 * Usage:
 *   pnpm tsx src/scripts/send-v26-update.ts              # dry-run (default)
 *   pnpm tsx src/scripts/send-v26-update.ts --send        # actually send
 *   pnpm tsx src/scripts/send-v26-update.ts --send --test me@example.com             # single test, greets "there"
 *   pnpm tsx src/scripts/send-v26-update.ts --send --test me@example.com --name Harshit  # single test, custom greeting
 */

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.vithos.in';
const SUBJECT = "What's new in Vithos v2.6";

interface MailtrapSendPayload {
  from: { email: string; name: string };
  to: { email: string }[];
  subject: string;
  html: string;
  text: string;
  category: string;
}

/**
 * Pick a name to greet the user by. Fall back to "there" rather than the
 * email local-part — many accounts sign up with handles like
 * "harshitsrv2004" which read as a username, not a greeting.
 */
function resolveDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const candidates = [
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    user.user_metadata?.first_name,
  ];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const trimmed = c.trim();
    // Require letters-only (plus spaces / hyphens / apostrophes) so we
    // reject values that look like email local-parts or random handles.
    if (trimmed && /^[A-Za-z][A-Za-z\s'\-]*$/.test(trimmed)) {
      return trimmed.split(/\s+/)[0]; // first name only for natural greeting
    }
  }
  return 'there';
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
What's new in Vithos v2.6
--------------------------

Hi ${userName},

Vithos v2.6 brings a big upgrade to the Health Assistant — your conversations are now saved, and the whole chat experience got a refresh.

1. Chats that stick around
   Every conversation is now saved automatically. Close the tab, come back a week later, pick up right where you left off — full history intact.

2. Organised by the person you care about
   Each profile has its own chat history, grouped by Today, Yesterday and This week. Start a new chat with one tap, delete old ones, switch between threads without losing context.

3. A cleaner, faster chat
   New pill-shaped input with the send button tucked in. On phones, pull out a side drawer to browse conversations. Assistant replies are tighter now — to the point, with values and dates cited from your reports.

4. What's next
   Conversation memory (so the assistant remembers earlier turns in the same thread) and auto-generated chat titles are up next. Monthly digests still on the roadmap.

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
  const nameIdx = args.indexOf('--name');
  const overrideName = nameIdx !== -1 ? args[nameIdx + 1] : null;

  if (!shouldSend) {
    logger.info('=== DRY RUN === Add --send to actually send emails');
  }

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

  const template = await loadTemplate();
  logger.info('Template loaded');

  let users: { id: string; email: string; name: string }[] = [];

  if (testEmail) {
    users = [{ id: 'test', email: testEmail, name: overrideName || 'there' }];
    logger.info(`Test mode: sending only to ${testEmail}`);
  } else {
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

      if (error) {
        logger.error('Failed to fetch users', { error: error.message, page });
        process.exit(1);
      }

      for (const user of data.users) {
        if (user.email) {
          users.push({
            id: user.id,
            email: user.email,
            name: resolveDisplayName(user),
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

  const fromEmail = process.env.FROM_EMAIL || 'update@vithos.in';
  let sent = 0;
  let failed = 0;

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
          subject: SUBJECT,
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
