import { NextResponse } from 'next/server';

import { DriveRequestError, handleDriveOAuthCallback } from '@/lib/drive-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const destination = await handleDriveOAuthCallback(new URL(request.url).searchParams);
    return NextResponse.redirect(destination);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to complete Google Drive callback.';
    return NextResponse.json({ error: message }, { status });
  }
}
