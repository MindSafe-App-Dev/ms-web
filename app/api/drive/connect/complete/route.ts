import { NextResponse } from 'next/server';

import { connectDriveForAuthorizedUser, DriveRequestError, getDriveCallbackUrl, requireAuthorizedMindSafeUser } from '@/lib/drive-server';

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
    const { user, userJwt } = await requireAuthorizedMindSafeUser(request);
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code : '';

    if (!code) {
      throw new DriveRequestError(400, 'Missing Google authorization code.');
    }

    const redirectUri = typeof body.redirectUri === 'string'
      ? body.redirectUri
      : getDriveCallbackUrl(getRequestAppUrl(request));
    const status = await connectDriveForAuthorizedUser(user, userJwt, code, redirectUri);
    return NextResponse.json(status);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to complete Google Drive connection.';
    return NextResponse.json({ error: message }, { status });
  }
}
