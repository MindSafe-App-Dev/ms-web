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
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

async function sendViaResend(apiKey: string, toEmail: string, fromEmail: string, payload: Record<string, string>) {
  await fetch('https://api.resend.com/emails', {
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
        `Support ticket submitted from Parent Web Dashboard.`,
        ``,
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Reason: ${payload.reason}`,
        `User ID: ${payload.userId}`,
        ``,
        `Message:`,
        payload.message,
      ].join('\n'),
    }),
  }).catch(() => {});
}

export async function POST(request: Request) {
  try {
    const { user, account } = await requireAuthorizedMindSafeUser(request);
    const body = await request.json();

    const name = String(body?.name || user?.username || 'Parent User').trim();
    const email = String(body?.email || account?.email || user?.email || '').trim();
    const reason = String(body?.reason || '').trim();
    const message = String(body?.message || '').trim();
    const source = 'web-dashboard';

    if (!email || !reason || !message) {
      return NextResponse.json(
        { error: 'Email, reason, and message are required for support tickets.' },
        { status: 400 }
      );
    }

    const documentId = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    
    // Save to Appwrite
    const createRes = await fetch('https://cloud.appwrite.io/v1/databases/66f2586d003223ce58b6/collections/tickets/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': '66f2579c002ae28287de',
        'X-Appwrite-Key': process.env.PRIMARY_APPWRITE_API_KEY || 'standard_4889e64111a5ca6e02faea3132a64f27ed1b8e164c328868fee4a81a8d8edd29d309bc2c8b0477c4eb9812c2c610ac4196983e07e0aaaaa7e310825dc34c82bae38972a61792fe1222f6dd64f47d8b23f09940a0e56a761866bd8aac4e825837d9d25aeaabe406483bb5efae66e0eadd3ac9a758eee06faeffe2bba768d80c9b'
      },
      body: JSON.stringify({
        documentId,
        data: {
          name,
          email,
          reason,
          message,
          userId: user?.$id || '',
          status: 'open',
          source,
          created_at: new Date().toISOString()
        }
      })
    });

    if (!createRes.ok) {
      console.error('Appwrite save failed for support ticket:', await createRes.text());
    }

    const payload = {
      name,
      email,
      reason,
      message,
      source,
      userId: String(user?.$id || ''),
    };

    const config = normalizeSupportConfig();
    if (config.webhookUrl) {
      await sendViaWebhook(config.webhookUrl, payload);
    } else if (config.resendApiKey && config.toEmail) {
      await sendViaResend(config.resendApiKey, config.toEmail, config.fromEmail, payload);
    }

    return NextResponse.json({
      ok: true,
      message: 'Support ticket sent successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit the support ticket.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
