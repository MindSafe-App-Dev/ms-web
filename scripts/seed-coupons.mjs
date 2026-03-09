#!/usr/bin/env node

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const couponCollectionId = process.env.APPWRITE_COUPON_COLLECTION_ID || 'coupon_collection_id';

if (!projectId || !apiKey || !databaseId) {
  console.error('Missing required env vars: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

const sampleCoupons = [
  { code: 'WELCOME20', description: '20% off for new families', discount_type: 'percent', discount_value: 20, is_active: true, expires_at: '2026-12-31T23:59:59.000Z', max_redemptions: 500, redemption_count: 0 },
  { code: 'SAVE10', description: '$10 off monthly plan', discount_type: 'fixed', discount_value: 10, is_active: true, expires_at: '2026-09-30T23:59:59.000Z', max_redemptions: 300, redemption_count: 0 },
  { code: 'YEARLY30', description: '30% off yearly plan', discount_type: 'percent', discount_value: 30, is_active: true, expires_at: '2026-12-31T23:59:59.000Z', max_redemptions: 150, redemption_count: 0 },
  { code: 'FESTIVE15', description: 'Festive offer: 15% off', discount_type: 'percent', discount_value: 15, is_active: true, expires_at: '2026-11-15T23:59:59.000Z', max_redemptions: 250, redemption_count: 0 },
  { code: 'TRIALBOOST5', description: '$5 off quick upgrade', discount_type: 'fixed', discount_value: 5, is_active: true, expires_at: '2026-08-31T23:59:59.000Z', max_redemptions: 1000, redemption_count: 0 },
];

async function request(path, method = 'GET', body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${txt}`);
  }

  return txt ? JSON.parse(txt) : {};
}

async function findCouponByCode(code) {
  const payload = await request(`/databases/${databaseId}/collections/${couponCollectionId}/documents`);
  return (payload.documents || []).find((doc) => (doc.code || '').toUpperCase() === code.toUpperCase()) || null;
}

async function upsertCoupon(coupon) {
  const existing = await findCouponByCode(coupon.code);

  if (!existing) {
    await request(`/databases/${databaseId}/collections/${couponCollectionId}/documents`, 'POST', {
      documentId: 'unique()',
      data: coupon,
      permissions: [],
    });
    console.log(`Created ${coupon.code}`);
    return;
  }

  await request(`/databases/${databaseId}/collections/${couponCollectionId}/documents/${existing.$id}`, 'PATCH', { data: coupon });
  console.log(`Updated ${coupon.code}`);
}

async function main() {
  for (const coupon of sampleCoupons) {
    await upsertCoupon(coupon);
  }
  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

