import { NextResponse } from 'next/server';

import { DriveRequestError, requireAuthorizedMindSafeUser, startDriveConnection } from '@/lib/drive-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userJwt } = await requireAuthorizedMindSafeUser(request);
    const body = await request.json().catch(() => ({}));
    const result = await startDriveConnection(userJwt, {
      platform: body.platform === 'mobile' ? 'mobile' : 'web',
      redirectPath: typeof body.redirectPath === 'string' ? body.redirectPath : '/cloud',
      mobileRedirectUri: typeof body.mobileRedirectUri === 'string' ? body.mobileRedirectUri : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to start Google Drive connection.';
    return NextResponse.json({ error: message }, { status });
  }
}
