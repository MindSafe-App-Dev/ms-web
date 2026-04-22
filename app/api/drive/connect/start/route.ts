import { NextResponse } from 'next/server';

import { DriveRequestError, getDriveCallbackUrl, requireAuthorizedMindSafeUser, startDriveConnection } from '@/lib/drive-server';

export const runtime = 'nodejs';

const getRequestAppUrl = (request: Request) => {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
};

export async function POST(request: Request) {
  try {
    const { userJwt } = await requireAuthorizedMindSafeUser(request);
    const body = await request.json().catch(() => ({}));
    const appUrl = getRequestAppUrl(request);
    const result = await startDriveConnection(userJwt, {
      platform: body.platform === 'mobile' ? 'mobile' : 'web',
      redirectPath: typeof body.redirectPath === 'string' ? body.redirectPath : '/cloud',
      mobileRedirectUri: typeof body.mobileRedirectUri === 'string' ? body.mobileRedirectUri : undefined,
      callbackUrl: getDriveCallbackUrl(appUrl),
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to start Google Drive connection.';
    return NextResponse.json({ error: message }, { status });
  }
}
