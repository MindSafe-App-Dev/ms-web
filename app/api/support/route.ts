import { NextResponse } from 'next/server';

import { DriveRequestError, requireAuthorizedMindSafeUser } from '@/lib/drive-server';

export const runtime = 'nodejs';

const normalizeSupportConfig = () => ({
  webhookUrl: process.env.SUPPORT_EMAIL_WEBHOOK_URL || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  toEmail: process.env.SUPPORT_TO_EMAIL || process.env.SUPPORT_EMAIL_TO || '',
  fromEmail: process.env.SUPPORT_FROM_EMAIL || 'MindSafe Support <support@mindsafe.app>',
});

async function sendViaWebhook(webhookUrl: string, payload: Record<string, string>) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new DriveRequestError(response.status, bodyText || 'Support email webhook rejected the request.');
  }
}

async function sendViaResend(apiKey: string, toEmail: string, fromEmail: string, payload: Record<string, string>) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `[MindSafe Support] ${payload.reason} - ${payload.email}`,
      text: [
        `Support ticket submitted from MindSafe mobile.`,
        ``,
        `Account email: ${payload.email}`,
        `Reason: ${payload.reason}`,
        `Username: ${payload.username}`,
        `User ID: ${payload.userId}`,
        `Account ID: ${payload.accountId}`,
        ``,
        `Message:`,
        payload.message,
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new DriveRequestError(response.status, bodyText || 'Resend rejected the support email.');
  }
}

export async function POST(request: Request) {
  try {
    const { user, account } = await requireAuthorizedMindSafeUser(request);
    const body = await request.json();

    const email = String(body?.email || account?.email || user?.email || '').trim();
    const reason = String(body?.reason || '').trim();
    const message = String(body?.message || '').trim();

    if (!email || !reason || !message) {
      throw new DriveRequestError(400, 'Email, reason, and message are required for support tickets.');
    }

    const payload = {
      email,
      reason,
      message,
      username: String(user?.username || ''),
      userId: String(user?.$id || ''),
      accountId: String(user?.accountId || account?.$id || ''),
    };

    const config = normalizeSupportConfig();
    if (config.webhookUrl) {
      await sendViaWebhook(config.webhookUrl, payload);
    } else if (config.resendApiKey && config.toEmail) {
      await sendViaResend(config.resendApiKey, config.toEmail, config.fromEmail, payload);
    } else {
      throw new DriveRequestError(
        500,
        'Support email is not configured yet. Set SUPPORT_EMAIL_WEBHOOK_URL or RESEND_API_KEY with SUPPORT_TO_EMAIL.',
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Support ticket sent successfully.',
    });
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to submit the support ticket.';
    return NextResponse.json({ error: message }, { status });
  }
}
