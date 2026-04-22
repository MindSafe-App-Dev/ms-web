import { NextResponse } from 'next/server';

import { DriveRequestError, getDriveStatusForUser, requireAuthorizedMindSafeUser } from '@/lib/drive-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { user, userJwt } = await requireAuthorizedMindSafeUser(request);
    const status = await getDriveStatusForUser(user, userJwt);
    return NextResponse.json(status);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to load Google Drive status.';
    return NextResponse.json({ error: message }, { status });
  }
}
