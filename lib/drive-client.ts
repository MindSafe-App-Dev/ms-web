import { account } from '@/lib/appwrite';
import type { DriveConnectionStatus, DriveFeature, DriveUploadResult } from '@/lib/drive-types';

interface JsonErrorPayload {
  error?: string;
}

interface StartDriveConnectOptions {
  platform?: 'web' | 'mobile';
  redirectPath?: string;
  mobileRedirectUri?: string;
}

interface StartDriveConnectResult {
  authUrl: string;
}

interface UploadDriveFileOptions {
  deviceName: string;
  feature: DriveFeature;
  fileName: string;
  mimeType: string;
  file: Blob;
}

async function createDriveJwt() {
  const response = await account.createJWT();
  return response.jwt;
}

async function parseJsonOrThrow(response: Response) {
  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as JsonErrorPayload) : {};

  if (!response.ok) {
    throw new Error(payload.error || 'Drive request failed.');
  }

  return payload;
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const jwt = await createDriveJwt();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${jwt}`);

  return fetch(path, {
    ...init,
    headers,
  });
}

export async function getDriveStatus() {
  const response = await driveFetch('/api/drive/status');
  return (await parseJsonOrThrow(response)) as DriveConnectionStatus;
}

export async function startDriveConnection(options: StartDriveConnectOptions = {}) {
  const response = await driveFetch('/api/drive/connect/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: options.platform || 'web',
      redirectPath: options.redirectPath || '/cloud',
      mobileRedirectUri: options.mobileRedirectUri,
    }),
  });

  return (await parseJsonOrThrow(response)) as StartDriveConnectResult;
}

export async function completeDriveConnection(code: string, redirectUri: string) {
  const response = await driveFetch('/api/drive/connect/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirectUri }),
  });

  return (await parseJsonOrThrow(response)) as DriveConnectionStatus;
}

export async function disconnectDrive() {
  const response = await driveFetch('/api/drive/disconnect', {
    method: 'DELETE',
  });

  return (await parseJsonOrThrow(response)) as DriveConnectionStatus;
}

export async function uploadDriveFile(options: UploadDriveFileOptions) {
  const jwt = await createDriveJwt();
  const formData = new FormData();
  formData.append('deviceName', options.deviceName);
  formData.append('feature', options.feature);
  formData.append('fileName', options.fileName);
  formData.append('mimeType', options.mimeType);
  formData.append('file', options.file, options.fileName);

  const response = await fetch('/api/drive/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  return (await parseJsonOrThrow(response)) as DriveUploadResult;
}
