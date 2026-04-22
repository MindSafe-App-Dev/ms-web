import { NextResponse } from 'next/server';

import { DriveRequestError, requireAuthorizedMindSafeUser, uploadDriveFileForUser } from '@/lib/drive-server';
import type { DriveFeature } from '@/lib/drive-types';

export const runtime = 'nodejs';

const DRIVE_FEATURES: DriveFeature[] = ['audio', 'camera', 'sms'];

export async function POST(request: Request) {
  try {
    const { user, userJwt } = await requireAuthorizedMindSafeUser(request);
    const formData = await request.formData();

    const deviceName = String(formData.get('deviceName') || '').trim();
    const feature = String(formData.get('feature') || '').trim() as DriveFeature;
    const fileName = String(formData.get('fileName') || '').trim();
    const mimeType = String(formData.get('mimeType') || '').trim();
    const file = formData.get('file');

    if (!deviceName || !fileName || !mimeType || !DRIVE_FEATURES.includes(feature)) {
      throw new DriveRequestError(400, 'Missing required Drive upload fields.');
    }

    if (!(file instanceof File)) {
      throw new DriveRequestError(400, 'Missing upload file for Google Drive.');
    }

    const result = await uploadDriveFileForUser(user, userJwt, {
      deviceName,
      feature,
      fileName,
      mimeType,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to upload the file to Google Drive.';
    return NextResponse.json({ error: message }, { status });
  }
}
