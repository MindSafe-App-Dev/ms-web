import { ID, Permission, Query, Role } from 'appwrite';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import { appwriteConfig, type User } from '@/lib/appwrite';
import type { DriveConnectionStatus, DriveFeature, DriveUploadResult } from '@/lib/drive-types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_ROOT_FOLDER_NAME = 'MindSafe';
const DRIVE_CALLBACK_PATH = '/api/drive/connect/callback';
const DRIVE_FEATURES: DriveFeature[] = ['audio', 'camera', 'sms'];
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60 * 1000;
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

type ConnectPlatform = 'web' | 'mobile';

interface DriveStatePayload {
  userJwt: string;
  platform: ConnectPlatform;
  redirectPath: string;
  mobileRedirectUri?: string;
  createdAt: number;
}

interface DriveConnectionDocument {
  $id: string;
  user_id: string;
  account_id: string;
  google_email?: string;
  refresh_token_encrypted: string;
  access_token_encrypted?: string;
  token_expires_at?: string;
  root_folder_id?: string;
  root_folder_name?: string;
  status?: string;
  connected_at?: string;
  last_sync_at?: string;
}

interface AppwriteAccount {
  $id: string;
  email?: string;
}

interface DriveFileRecord {
  id: string;
  name: string;
  webViewLink?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface StartDriveConnectionOptions {
  platform: ConnectPlatform;
  redirectPath?: string;
  mobileRedirectUri?: string;
}

interface UploadDriveFileInput {
  deviceName: string;
  feature: DriveFeature;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export class DriveRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const getServerConfig = () => {
  const googleClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const tokenSecret = process.env.GOOGLE_DRIVE_TOKEN_SECRET || process.env.DRIVE_TOKEN_SECRET;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  if (!googleClientId || !googleClientSecret) {
    throw new DriveRequestError(500, 'Missing Google Drive OAuth credentials.');
  }

  if (!tokenSecret) {
    throw new DriveRequestError(500, 'Missing GOOGLE_DRIVE_TOKEN_SECRET for Drive integration.');
  }

  return {
    endpoint: process.env.APPWRITE_ENDPOINT || appwriteConfig.endpoint,
    projectId: process.env.APPWRITE_PROJECT_ID || appwriteConfig.projectId,
    databaseId: process.env.APPWRITE_DATABASE_ID || appwriteConfig.databaseId,
    driveCollectionId: process.env.APPWRITE_DRIVE_CONNECTION_COLLECTION_ID || 'drive_connection_collection_id',
    googleClientId,
    googleClientSecret,
    tokenSecret,
    appUrl,
  };
};

const sanitizeSegment = (value: string) => {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned || 'Unknown';
};

const escapeDriveQueryValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const buildDriveStatus = (document?: DriveConnectionDocument | null): DriveConnectionStatus => ({
  connected: Boolean(document && document.status === 'connected'),
  accountEmail: document?.google_email,
  rootFolderName: document?.root_folder_name || DRIVE_ROOT_FOLDER_NAME,
  rootFolderId: document?.root_folder_id,
  connectedAt: document?.connected_at,
  features: DRIVE_FEATURES,
});

const getEncryptionKey = () => createHash('sha256').update(getServerConfig().tokenSecret).digest();

const encryptValue = (value: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
};

const decryptValue = (payload?: string) => {
  if (!payload) return '';

  const [version, ivBase64, tagBase64, encryptedBase64] = payload.split('.');
  if (version !== 'v1' || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new DriveRequestError(500, 'Stored Drive credential payload is invalid.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivBase64, 'base64url'),
  );

  decipher.setAuthTag(Buffer.from(tagBase64, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

const encodeOAuthState = (payload: DriveStatePayload) => encryptValue(JSON.stringify(payload));

const decodeOAuthState = (state: string): DriveStatePayload => {
  const parsed = JSON.parse(decryptValue(state)) as DriveStatePayload;

  if (!parsed?.userJwt || !parsed.platform || !parsed.createdAt) {
    throw new DriveRequestError(400, 'Google Drive connection state is invalid.');
  }

  if (Date.now() - parsed.createdAt > STATE_MAX_AGE_MS) {
    throw new DriveRequestError(400, 'Google Drive connection request expired. Please try again.');
  }

  return parsed;
};

async function parseResponseOrThrow(response: Response, fallbackMessage: string) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as Record<string, unknown> : {};

  if (!response.ok) {
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : typeof payload.error === 'string'
          ? payload.error
          : fallbackMessage;

    throw new DriveRequestError(response.status, message);
  }

  return payload;
}

async function appwriteRequest<T>(
  path: string,
  userJwt: string,
  init: RequestInit = {},
  queryStrings: string[] = [],
): Promise<T> {
  const config = getServerConfig();
  const url = new URL(`${config.endpoint}${path}`);

  queryStrings.forEach((query) => {
    url.searchParams.append('queries[]', query);
  });

  const headers = new Headers(init.headers);
  headers.set('X-Appwrite-Project', config.projectId);
  headers.set('X-Appwrite-JWT', userJwt);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  return await parseResponseOrThrow(response, 'Appwrite request failed.') as T;
}

async function resolveAccountFromJwt(userJwt: string) {
  const config = getServerConfig();
  const response = await fetch(`${config.endpoint}/account`, {
    headers: {
      'X-Appwrite-Project': config.projectId,
      'X-Appwrite-JWT': userJwt,
    },
    cache: 'no-store',
  });

  return await parseResponseOrThrow(response, 'Unable to resolve the current Appwrite account.') as AppwriteAccount;
}

async function findMindSafeUserByAccountId(accountId: string, userJwt: string) {
  const result = await appwriteRequest<{ documents: User[] }>(
    `/databases/${getServerConfig().databaseId}/collections/${appwriteConfig.userCollectionId}/documents`,
    userJwt,
    { method: 'GET' },
    [Query.equal('accountId', accountId), Query.limit(1)],
  );

  return result.documents[0] || null;
}

async function getDriveConnectionDocument(userId: string, userJwt: string) {
  const result = await appwriteRequest<{ documents: DriveConnectionDocument[] }>(
    `/databases/${getServerConfig().databaseId}/collections/${getServerConfig().driveCollectionId}/documents`,
    userJwt,
    { method: 'GET' },
    [Query.equal('user_id', userId), Query.limit(1)],
  );

  return result.documents[0] || null;
}

async function createDriveConnectionDocument(
  data: Record<string, unknown>,
  userJwt: string,
  accountId: string,
) {
  return await appwriteRequest<DriveConnectionDocument>(
    `/databases/${getServerConfig().databaseId}/collections/${getServerConfig().driveCollectionId}/documents`,
    userJwt,
    {
      method: 'POST',
      body: JSON.stringify({
        documentId: ID.unique(),
        data,
        permissions: [
          Permission.read(Role.user(accountId)),
          Permission.update(Role.user(accountId)),
          Permission.delete(Role.user(accountId)),
        ],
      }),
    },
  );
}

async function updateDriveConnectionDocument(documentId: string, data: Record<string, unknown>, userJwt: string) {
  return await appwriteRequest<DriveConnectionDocument>(
    `/databases/${getServerConfig().databaseId}/collections/${getServerConfig().driveCollectionId}/documents/${documentId}`,
    userJwt,
    {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    },
  );
}

async function deleteDriveConnectionDocument(documentId: string, userJwt: string) {
  return await appwriteRequest<Record<string, never>>(
    `/databases/${getServerConfig().databaseId}/collections/${getServerConfig().driveCollectionId}/documents/${documentId}`,
    userJwt,
    { method: 'DELETE' },
  );
}

const decodeIdTokenEmail = (idToken?: string) => {
  if (!idToken) return undefined;

  const payload = idToken.split('.')[1];
  if (!payload) return undefined;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as { email?: string };
    return decoded.email;
  } catch {
    return undefined;
  }
};

async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const config = getServerConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  return await parseResponseOrThrow(response, 'Google Drive authorization failed.') as GoogleTokenResponse;
}

async function refreshAccessToken(refreshToken: string) {
  const config = getServerConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  return await parseResponseOrThrow(response, 'Unable to refresh the Google Drive access token.') as GoogleTokenResponse;
}

async function revokeGoogleToken(token: string) {
  const response = await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new DriveRequestError(response.status, message || 'Unable to revoke the Google Drive token.');
  }
}

async function driveApiRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
  params?: Record<string, string>,
) {
  const url = path.startsWith('http') ? new URL(path) : new URL(path, GOOGLE_DRIVE_API_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  return await parseResponseOrThrow(response, 'Google Drive request failed.') as T;
}

async function findDriveFolder(name: string, parentId: string | null, accessToken: string) {
  const queryParts = [
    `mimeType='${DRIVE_FOLDER_MIME}'`,
    `name='${escapeDriveQueryValue(name)}'`,
    'trashed=false',
  ];

  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  } else {
    queryParts.push(`'root' in parents`);
  }

  const response = await driveApiRequest<{ files: DriveFileRecord[] }>(
    GOOGLE_DRIVE_API_URL,
    accessToken,
    { method: 'GET' },
    {
      q: queryParts.join(' and '),
      fields: 'files(id,name,webViewLink)',
      pageSize: '1',
      supportsAllDrives: 'false',
    },
  );

  return response.files[0] || null;
}

async function createDriveFolder(name: string, parentId: string | null, accessToken: string) {
  return await driveApiRequest<DriveFileRecord>(
    GOOGLE_DRIVE_API_URL,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: DRIVE_FOLDER_MIME,
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
    {
      fields: 'id,name,webViewLink',
      supportsAllDrives: 'false',
    },
  );
}

async function ensureDriveFolder(name: string, parentId: string | null, accessToken: string) {
  return (await findDriveFolder(name, parentId, accessToken)) || createDriveFolder(name, parentId, accessToken);
}

function createMultipartBody(metadata: Record<string, unknown>, fileBuffer: Buffer, mimeType: string) {
  const boundary = `mindsafe-drive-${randomBytes(12).toString('hex')}`;
  const metadataPart =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n`;
  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(metadataPart, 'utf8'),
    Buffer.from(fileHeader, 'utf8'),
    fileBuffer,
    Buffer.from(closing, 'utf8'),
  ]);

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

async function persistDriveConnection(
  user: User,
  userJwt: string,
  accountId: string,
  tokens: GoogleTokenResponse,
  existingDocument?: DriveConnectionDocument | null,
) {
  const refreshToken = tokens.refresh_token || (existingDocument ? decryptValue(existingDocument.refresh_token_encrypted) : '');
  if (!refreshToken) {
    throw new DriveRequestError(400, 'Google Drive did not return a refresh token. Please reconnect and approve access again.');
  }

  const accessToken = tokens.access_token;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const accountEmail = decodeIdTokenEmail(tokens.id_token) || existingDocument?.google_email;
  const rootFolder = await ensureDriveFolder(
    existingDocument?.root_folder_name || DRIVE_ROOT_FOLDER_NAME,
    null,
    accessToken,
  );

  const payload = {
    user_id: user.$id,
    account_id: user.accountId,
    google_email: accountEmail || '',
    refresh_token_encrypted: encryptValue(refreshToken),
    access_token_encrypted: encryptValue(accessToken),
    token_expires_at: expiresAt,
    root_folder_id: rootFolder.id,
    root_folder_name: rootFolder.name,
    status: 'connected',
    connected_at: existingDocument?.connected_at || new Date().toISOString(),
    last_sync_at: existingDocument?.last_sync_at || null,
  };

  const nextDocument = existingDocument
    ? await updateDriveConnectionDocument(existingDocument.$id, payload, userJwt)
    : await createDriveConnectionDocument(payload, userJwt, accountId);

  return buildDriveStatus(nextDocument);
}

async function resolveFreshAccessToken(document: DriveConnectionDocument, userJwt: string) {
  const storedAccessToken = decryptValue(document.access_token_encrypted);
  const tokenExpiresAt = document.token_expires_at ? new Date(document.token_expires_at).getTime() : 0;
  const shouldRefresh =
    !storedAccessToken ||
    !tokenExpiresAt ||
    tokenExpiresAt - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;

  if (!shouldRefresh) {
    return { accessToken: storedAccessToken, connection: document };
  }

  const refreshed = await refreshAccessToken(decryptValue(document.refresh_token_encrypted));
  const nextDocument = await updateDriveConnectionDocument(document.$id, {
    access_token_encrypted: encryptValue(refreshed.access_token),
    token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    status: 'connected',
  }, userJwt);

  return { accessToken: refreshed.access_token, connection: nextDocument };
}

async function requireDriveConnection(user: User, userJwt: string) {
  const document = await getDriveConnectionDocument(user.$id, userJwt);
  if (!document || document.status !== 'connected') {
    throw new DriveRequestError(400, 'Google Drive is not connected for this account.');
  }

  return await resolveFreshAccessToken(document, userJwt);
}

const getFeatureFolderName = (feature: DriveFeature) => {
  switch (feature) {
    case 'audio':
      return 'Audio';
    case 'camera':
      return 'Camera';
    case 'sms':
      return 'SMS';
    default:
      return feature;
  }
};

function withQueryParams(url: string, params: Record<string, string>) {
  const nextUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    nextUrl.searchParams.set(key, value);
  });
  return nextUrl.toString();
}

export function getDriveCallbackUrl() {
  return new URL(DRIVE_CALLBACK_PATH, getServerConfig().appUrl).toString();
}

export async function requireAuthorizedMindSafeUser(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const jwtMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!jwtMatch?.[1]) {
    throw new DriveRequestError(401, 'Missing Appwrite JWT for Drive request.');
  }

  const account = await resolveAccountFromJwt(jwtMatch[1]);
  const user = await findMindSafeUserByAccountId(account.$id, jwtMatch[1]);

  if (!user) {
    throw new DriveRequestError(404, 'MindSafe user record was not found for this session.');
  }

  return { user, userJwt: jwtMatch[1], account };
}

export async function getDriveStatusForUser(user: User, userJwt: string) {
  const document = await getDriveConnectionDocument(user.$id, userJwt);
  return buildDriveStatus(document);
}

export async function startDriveConnection(userJwt: string, options: StartDriveConnectionOptions) {
  const state = encodeOAuthState({
    userJwt,
    platform: options.platform,
    redirectPath: options.redirectPath || '/cloud',
    mobileRedirectUri: options.mobileRedirectUri,
    createdAt: Date.now(),
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', getServerConfig().googleClientId);
  authUrl.searchParams.set('redirect_uri', getDriveCallbackUrl());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('scope', ['openid', 'email', 'https://www.googleapis.com/auth/drive.file'].join(' '));
  authUrl.searchParams.set('state', state);

  return {
    authUrl: authUrl.toString(),
  };
}

export async function connectDriveForAuthorizedUser(
  user: User,
  userJwt: string,
  accountId: string,
  code: string,
  redirectUri: string,
) {
  const existingDocument = await getDriveConnectionDocument(user.$id, userJwt);
  const tokens = await exchangeAuthorizationCode(code, redirectUri);
  return await persistDriveConnection(user, userJwt, accountId, tokens, existingDocument);
}

export async function handleDriveOAuthCallback(params: URLSearchParams) {
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

  if (!state) {
    throw new DriveRequestError(400, 'Missing Google Drive connection state.');
  }

  const parsedState = decodeOAuthState(state);

  const buildDestination = (status: 'success' | 'error', message?: string) => {
    if (parsedState.platform === 'mobile') {
      if (!parsedState.mobileRedirectUri) {
        throw new DriveRequestError(400, 'Missing mobile redirect URI for Google Drive.');
      }

      return withQueryParams(parsedState.mobileRedirectUri, {
        status,
        ...(message ? { message } : {}),
      });
    }

    const destination = new URL(parsedState.redirectPath || '/cloud', getServerConfig().appUrl);
    destination.searchParams.set('drive', status === 'success' ? 'connected' : 'error');
    if (message) {
      destination.searchParams.set('message', message);
    }
    return destination.toString();
  };

  if (error) {
    return buildDestination('error', error);
  }

  if (!code) {
    return buildDestination('error', 'missing_code');
  }

  try {
    const account = await resolveAccountFromJwt(parsedState.userJwt);
    const user = await findMindSafeUserByAccountId(account.$id, parsedState.userJwt);

    if (!user) {
      throw new DriveRequestError(404, 'MindSafe user record was not found for this Google Drive connection.');
    }

    await connectDriveForAuthorizedUser(user, parsedState.userJwt, account.$id, code, getDriveCallbackUrl());
    return buildDestination('success');
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'drive_connection_failed';
    return buildDestination('error', message);
  }
}

export async function disconnectDriveForUser(user: User, userJwt: string) {
  const document = await getDriveConnectionDocument(user.$id, userJwt);
  if (!document) {
    return buildDriveStatus(null);
  }

  const refreshToken = decryptValue(document.refresh_token_encrypted);
  if (refreshToken) {
    try {
      await revokeGoogleToken(refreshToken);
    } catch {
      // Ignore revoke failures; the document is still removed locally.
    }
  }

  await deleteDriveConnectionDocument(document.$id, userJwt);
  return buildDriveStatus(null);
}

export async function uploadDriveFileForUser(user: User, userJwt: string, input: UploadDriveFileInput): Promise<DriveUploadResult> {
  const { accessToken, connection } = await requireDriveConnection(user, userJwt);
  const safeDeviceName = sanitizeSegment(input.deviceName);
  const featureFolderName = getFeatureFolderName(input.feature);

  const deviceFolder = await ensureDriveFolder(safeDeviceName, connection.root_folder_id || null, accessToken);
  const featureFolder = await ensureDriveFolder(featureFolderName, deviceFolder.id, accessToken);

  const { body, contentType } = createMultipartBody(
    {
      name: input.fileName,
      parents: [featureFolder.id],
    },
    input.fileBuffer,
    input.mimeType,
  );

  const uploadedFile = await driveApiRequest<DriveFileRecord>(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body,
    },
  );

  await updateDriveConnectionDocument(connection.$id, {
    last_sync_at: new Date().toISOString(),
    status: 'connected',
  }, userJwt);

  return {
    fileId: uploadedFile.id,
    fileName: uploadedFile.name,
    webViewLink: uploadedFile.webViewLink,
    folderPath: `${connection.root_folder_name || DRIVE_ROOT_FOLDER_NAME}/${safeDeviceName}/${featureFolderName}`,
    uploadedAt: new Date().toISOString(),
  };
}
