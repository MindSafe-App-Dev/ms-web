#!/usr/bin/env node

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const couponCollectionId = process.env.APPWRITE_COUPON_COLLECTION_ID || 'coupon_collection_id';
const trialCollectionId = process.env.APPWRITE_TRIAL_COLLECTION_ID || 'trial_collection_id';

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
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const txt = await res.text();
    const alreadyExists = res.status === 409;
    if (alreadyExists) return { ok: true, skipped: true, text: txt };
    throw new Error(`${method} ${path} failed (${res.status}): ${txt}`);
  }

  return { ok: true, skipped: false, json: await res.json() };
}

async function createCollection(collectionId, name) {
  const result = await request(`/databases/${databaseId}/collections`, 'POST', {
    collectionId,
    name,
    permissions: [],
    documentSecurity: false,
    enabled: true,
  });
  console.log(result.skipped ? `Collection ${collectionId} already exists` : `Collection ${collectionId} created`);
}

async function createAttribute(collectionId, type, payload) {
  const result = await request(`/databases/${databaseId}/collections/${collectionId}/attributes/${type}`, 'POST', payload);
  const label = payload.key || payload.element || payload.array || 'attribute';
  console.log(result.skipped ? `${collectionId}.${label} exists` : `${collectionId}.${label} created`);
}

async function createIndex(collectionId, key, type, attributes, orders) {
  const result = await request(`/databases/${databaseId}/collections/${collectionId}/indexes`, 'POST', {
    key,
    type,
    attributes,
    orders,
  });
  console.log(result.skipped ? `${collectionId}.${key} index exists` : `${collectionId}.${key} index created`);
}

async function main() {
  await createCollection(couponCollectionId, 'Coupons');
  await createCollection(trialCollectionId, 'FeatureTrials');

  await createAttribute(couponCollectionId, 'string', { key: 'code', size: 64, required: true });
  await createAttribute(couponCollectionId, 'string', { key: 'description', size: 512, required: false });
  await createAttribute(couponCollectionId, 'string', { key: 'discount_type', size: 16, required: true });
  await createAttribute(couponCollectionId, 'float', { key: 'discount_value', required: true, min: 0, max: 1000000 });
  await createAttribute(couponCollectionId, 'boolean', { key: 'is_active', required: true });
  await createAttribute(couponCollectionId, 'datetime', { key: 'expires_at', required: false });
  await createAttribute(couponCollectionId, 'integer', { key: 'max_redemptions', required: false, min: 0, max: 1000000000 });
  await createAttribute(couponCollectionId, 'integer', { key: 'redemption_count', required: false, min: 0, max: 1000000000 });

  await createAttribute(trialCollectionId, 'string', { key: 'client_id', size: 64, required: true });
  await createAttribute(trialCollectionId, 'string', { key: 'device_id', size: 128, required: true });
  await createAttribute(trialCollectionId, 'string', { key: 'feature_id', size: 64, required: true });
  await createAttribute(trialCollectionId, 'string', { key: 'month_key', size: 7, required: true });
  await createAttribute(trialCollectionId, 'integer', { key: 'used_count', required: true, min: 0, max: 1000 });
  await createAttribute(trialCollectionId, 'integer', { key: 'max_uses', required: true, min: 1, max: 1000 });
  await createAttribute(trialCollectionId, 'datetime', { key: 'last_used_at', required: false });

  await createIndex(couponCollectionId, 'coupon_code_unique', 'key', ['code'], ['ASC']);
  await createIndex(trialCollectionId, 'trial_lookup', 'key', ['client_id', 'device_id', 'feature_id', 'month_key'], ['ASC', 'ASC', 'ASC', 'ASC']);

  console.log('Done. Update envs: NEXT_PUBLIC_APPWRITE_COUPON_COLLECTION_ID / NEXT_PUBLIC_APPWRITE_TRIAL_COLLECTION_ID and EXPO_PUBLIC_* equivalents.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

