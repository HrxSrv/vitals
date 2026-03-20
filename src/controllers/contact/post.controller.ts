import { Request, Response, NextFunction } from 'express';
import { Resend } from 'resend';
import { logger } from '../../utils/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function postContactController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, message } = req.body as { name: string; email: string; message: string };

    if (!name || !email || !message) {
      res.status(400).json({ error: 'name, email and message are required' });
      return;
    }

    const to = process.env.CONTACT_EMAIL || process.env.FROM_EMAIL || 'adityaghailbdrp1@gmail.com';
    const from = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: `Vitals Contact <${from}>`,
      to,
      reply_to: email,
      subject: `[Vitals] Message from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a1a1a">New message via Vitals Help</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:8px 0;color:#666;width:80px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;white-space:pre-wrap;color:#333">${message}</div>
        </div>
      `,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    logger.info('Contact email sent', { from: email, to });
    res.json({ ok: true });
  } catch (error: any) {
    logger.error('Failed to send contact email', { error: error.message });
    next(error);
  }
}
