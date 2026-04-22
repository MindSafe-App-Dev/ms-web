import { NextResponse } from 'next/server';

import { DriveRequestError, getDriveCallbackUrl, handleDriveOAuthCallback } from '@/lib/drive-server';

export const runtime = 'nodejs';

const getRequestAppUrl = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
};

export async function GET(request: Request) {
  try {
    const destination = await handleDriveOAuthCallback(
      new URL(request.url).searchParams,
      getDriveCallbackUrl(getRequestAppUrl(request)),
    );
    return NextResponse.redirect(destination);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to complete Google Drive callback.';
    return NextResponse.json({ error: message }, { status });
  }
}
