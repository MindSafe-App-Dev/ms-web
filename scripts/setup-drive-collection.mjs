#!/usr/bin/env node

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_DRIVE_CONNECTION_COLLECTION_ID || 'drive_connection_collection_id';

if (!projectId || !apiKey || !databaseId) {
  console.error('Missing required env vars: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

async function request(path, method, body) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 409) {
      return { skipped: true, text };
    }
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return { skipped: false, json: await response.json() };
}

async function createCollection() {
  const result = await request(`/databases/${databaseId}/collections`, 'POST', {
    collectionId,
    name: 'DriveConnections',
    permissions: ['create("users")'],
    documentSecurity: true,
    enabled: true,
  });

  console.log(result.skipped ? `Collection ${collectionId} already exists` : `Collection ${collectionId} created`);
}

async function createAttribute(type, payload) {
  const result = await request(`/databases/${databaseId}/collections/${collectionId}/attributes/${type}`, 'POST', payload);
  console.log(result.skipped ? `${payload.key} exists` : `${payload.key} created`);
}

async function createIndex(key, type, attributes, orders) {
  const result = await request(`/databases/${databaseId}/collections/${collectionId}/indexes`, 'POST', {
    key,
    type,
    attributes,
    orders,
  });
  console.log(result.skipped ? `${key} index exists` : `${key} index created`);
}

async function main() {
  await createCollection();

  await createAttribute('string', { key: 'user_id', size: 64, required: true });
  await createAttribute('string', { key: 'account_id', size: 64, required: true });
  await createAttribute('string', { key: 'google_email', size: 255, required: false });
  await createAttribute('string', { key: 'refresh_token_encrypted', size: 8192, required: true });
  await createAttribute('string', { key: 'access_token_encrypted', size: 8192, required: false });
  await createAttribute('datetime', { key: 'token_expires_at', required: false });
  await createAttribute('string', { key: 'root_folder_id', size: 255, required: false });
  await createAttribute('string', { key: 'root_folder_name', size: 255, required: false });
  await createAttribute('string', { key: 'status', size: 32, required: true });
  await createAttribute('datetime', { key: 'connected_at', required: false });
  await createAttribute('datetime', { key: 'last_sync_at', required: false });

  await createIndex('drive_user_lookup', 'key', ['user_id'], ['ASC']);
  await createIndex('drive_account_lookup', 'key', ['account_id'], ['ASC']);

  console.log('Done. Runtime only needs Google OAuth envs plus NEXT_PUBLIC_APP_URL. This setup script itself still needs Appwrite admin envs to create the collection.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
