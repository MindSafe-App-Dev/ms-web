import { NextResponse } from 'next/server';

import { disconnectDriveForUser, DriveRequestError, requireAuthorizedMindSafeUser } from '@/lib/drive-server';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  try {
    const { user, userJwt } = await requireAuthorizedMindSafeUser(request);
    const status = await disconnectDriveForUser(user, userJwt);
    return NextResponse.json(status);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to disconnect Google Drive.';
    return NextResponse.json({ error: message }, { status });
  }
}
