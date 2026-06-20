import {
  createPayment,
  getActivePackages,
  incrementCouponRedemption,
  type AdminPackage,
  type CouponValidationResult,
  updateChild,
} from './appwrite';

export type PremiumPlanId = string;

export interface PremiumPlan {
  id: PremiumPlanId;
  name: string;
  price: number;
  cadence: string;
  shortLabel: string;
  badge: string;
  description: string;
  priceLabel: string;
  accent: [string, string];
  features: string[];
  details: {
    whatYouGet: string[];
    bestFor: string[];
    accessLevel: string[];
    paymentNotes: string[];
  };
  popular?: boolean;
  trial_duration?: number;
  trial_duration_unit?: string;
  trial_fallback_slug?: string;
}

export interface PremiumComparisonRow {
  label: string;
  values: Record<string, string>;
}

export interface StoredPayPalOrder {
  orderId: string;
  userId: string;
  deviceDocumentId: string;
  deviceExternalId: string;
  deviceName: string;
  planId: PremiumPlanId;
  planName: string;
  billingLabel: string;
  amount: number;
  couponId?: string;
  couponRedemptionCount?: number;
}

export const PREMIUM_COPY = {
  heroComparison: '4 plan comparison',
  heroTitle: 'Choose the checkout plan that fits your monitoring needs.',
  heroSubtitle: 'Compare Free, Monthly, Yearly and Premium in one place, then finish checkout with a clearer review step.',
  heroPoints: ['Instant plan comparison', 'Coupon-ready total preview', 'Secure PayPal checkout'],
  subscriptionComparison: 'Subscription comparison',
  subscriptionSubtitle: 'Compare the plans, review the details, and pick the checkout flow that matches Master3.',
  summaryEyebrow: 'Checkout summary',
  basePrice: 'Base price',
  discount: 'Discount',
  billing: 'Billing',
  totalToday: 'Total today',
  promoCode: 'Promo code',
  promoPaidSubtitle: 'Apply a coupon before opening secure checkout.',
  promoFreeSubtitle: 'Choose a paid plan to unlock coupons.',
  promoPlaceholder: 'Enter promo code',
  apply: 'Apply',
  continueCheckout: 'Continue to checkout',
  stayFree: 'Stay on Free plan',
  trustPoints: ['Secure payment', 'Review before pay', 'Flexible plan choice'],
  modalEyebrow: 'Secure checkout',
  modalSteps: ['Review', 'Pay', 'Activate'],
  planLabel: 'Plan',
  deviceLabel: 'Device',
  totalLabel: 'Total',
  cancelCheckout: 'Cancel checkout',
  freePlanSelectedTitle: 'Free Plan Selected',
  freePlanSelectedMessage: 'Coupons are only available for paid plans.',
  missingCouponTitle: 'Missing Coupon',
  missingCouponMessage: 'Enter a coupon code before applying it.',
  invalidCouponTitle: 'Invalid Coupon',
  couponAppliedTitle: 'Coupon Applied',
  couponAppliedSaved: 'You saved {amount}.',
  couponErrorTitle: 'Coupon Error',
  couponErrorMessage: 'Unable to validate the coupon right now.',
  stayOnFreeTitle: 'You are on the Free plan',
  stayOnFreeMessage: 'Free keeps location access and monthly trials active for this device.',
  paymentSuccessTitle: 'Payment Successful',
  paymentSuccessMessage: '{plan} access is now active for {device}.',
  paymentFailedTitle: 'Payment Failed',
  paymentFailedMessage: 'Unable to process the payment. Please try again.',
  processingErrorTitle: 'Processing Error',
  processingErrorMessage: 'An error occurred while completing checkout.',
  allPremiumTitle: 'All Devices Premium!',
  allPremiumMessage: 'All your devices already have premium access.',
  paypal: {
    eyebrow: 'PayPal checkout',
    amountDueNow: 'Amount due now',
    encryptedPayment: 'Encrypted payment',
    protectedFlow: 'Protected flow',
    preparing: 'Preparing PayPal...',
    paySecurely: 'Pay securely with PayPal',
    footerNote: 'You will review and authorize the payment inside PayPal before activation completes.',
    securePaypal: 'Secure PayPal',
    loadingPaypal: 'Loading PayPal checkout...',
    cancelReturn: 'Cancel and return',
    paymentErrorTitle: 'Payment Error',
    paymentErrorMessage: 'An error occurred during the payment process. Please try again.',
    successTitle: 'Success',
    successMessage: 'Your payment was processed successfully.',
    cancelledTitle: 'Cancelled',
    cancelledMessage: 'Payment was cancelled.',
    billedToday: 'Billed {billingLabel}',
  },
} as const;

export const PREMIUM_ACCORDION_LABELS = {
  whatYouGet: 'What you get',
  bestFor: 'Best for',
  accessLevel: 'Access level',
  paymentNotes: 'Billing notes',
  expand: 'Show details',
  collapse: 'Hide details',
} as const;

export const PREMIUM_COMPARISON_ROWS: PremiumComparisonRow[] = [
  {
    label: 'Location tracking',
    values: { free: 'Included', monthly: 'Included', yearly: 'Included', premium: 'Included' },
  },
  {
    label: 'Camera, mic, calls, SMS, files',
    values: { free: 'Trial only', monthly: 'Unlimited', yearly: 'Unlimited', premium: 'Unlimited' },
  },
  {
    label: 'Coupon support',
    values: { free: 'No', monthly: 'Yes', yearly: 'Yes', premium: 'Yes' },
  },
  {
    label: 'Billing mode',
    values: { free: 'None', monthly: 'Monthly', yearly: 'Yearly', premium: 'One-time' },
  },
];

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    cadence: 'Always available',
    shortLabel: 'Keep trial access',
    badge: 'Starter',
    description: 'Try the essential experience before upgrading.',
    priceLabel: '$0',
    accent: ['#6b7280', '#4b5563'],
    features: ['Location tracking', '3 premium trials each month', 'No payment required'],
    details: {
      whatYouGet: ['Live location tracking', 'Three trial uses each month for premium tools', 'No billing setup needed'],
      bestFor: ['Trying the app before upgrading', 'Simple location-only monitoring', 'Short tests on one device'],
      accessLevel: ['Location is always available', 'Camera, mic, calls, contacts, SMS and files use trial credits', 'Premium-only tools lock after trial credits are used'],
      paymentNotes: ['No card required', 'You can upgrade from this screen any time'],
    },
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 49,
    cadence: 'per month',
    shortLabel: 'Flexible billing',
    badge: 'Popular',
    description: 'Unlock all monitoring tools with the lowest commitment.',
    priceLabel: '$49',
    accent: ['#22c55e', '#16a34a'],
    features: ['All monitoring tools', 'Coupon support', 'Great for short-term needs'],
    details: {
      whatYouGet: ['Unlimited access to all monitoring tools', 'Coupon-ready checkout', 'Monthly billing for easier budgeting'],
      bestFor: ['Short-term monitoring needs', 'Parents who want flexibility', 'Testing the full feature set before a yearly plan'],
      accessLevel: ['Camera, microphone, calls, contacts, SMS, files and location', 'No monthly trial limits', 'One connected device gets premium access after checkout'],
      paymentNotes: ['Renews every month', 'Coupons can reduce the amount due today'],
    },
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 499,
    cadence: 'per year',
    shortLabel: 'Best savings',
    badge: 'Best Value',
    description: 'The same full access with better long-term pricing.',
    priceLabel: '$499',
    accent: ['#a855f7', '#ec4899'],
    features: ['All monitoring tools', '2 months off compared to monthly', 'Recommended for families'],
    details: {
      whatYouGet: ['Everything in Monthly', 'Lower annual cost than paying month by month', 'Fewer renewals to manage'],
      bestFor: ['Long-term family monitoring', 'Users who want the best savings', 'Homes with ongoing supervision needs'],
      accessLevel: ['Unlimited premium tool access', 'Same monitoring coverage as monthly', 'Designed for consistent year-round use'],
      paymentNotes: ['Charged once per year', 'Best overall savings against the monthly plan'],
    },
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 899,
    cadence: 'one-time',
    shortLabel: 'Top tier checkout',
    badge: 'Elite',
    description: 'A premium one-time upgrade for users who want the highest tier.',
    priceLabel: '$899',
    accent: ['#f59e0b', '#f97316'],
    features: ['All monitoring tools', 'One-time payment option', 'Fastest upgrade path'],
    details: {
      whatYouGet: ['Full monitoring tool access', 'Single one-time payment', 'Checkout optimized for immediate activation'],
      bestFor: ['Users who prefer one payment instead of recurring billing', 'Fast premium activation', 'Higher-commitment long-term use'],
      accessLevel: ['All premium monitoring tools unlocked', 'No trial restrictions', 'Premium status turns on as soon as payment succeeds'],
      paymentNotes: ['Paid once', 'Useful when recurring billing is not preferred'],
    },
  },
];

const PLAN_ACCENTS: Record<string, [string, string]> = {
  free: ['#6b7280', '#4b5563'],
  monthly: ['#22c55e', '#16a34a'],
  yearly: ['#a855f7', '#ec4899'],
  premium: ['#f59e0b', '#f97316'],
};

export function mergeAdminPackagesWithPremiumPlans(packages: AdminPackage[]): PremiumPlan[] {
  if (!packages.length) return PREMIUM_PLANS;

  const fallbackById = new Map(PREMIUM_PLANS.map((plan) => [plan.id, plan]));
  return packages.map((adminPlan, index) => {
    const fallback = fallbackById.get(adminPlan.slug) || PREMIUM_PLANS[index] || PREMIUM_PLANS[0];
    const price = Number(adminPlan.price || 0);

    return {
      ...fallback,
      id: adminPlan.slug,
      name: adminPlan.name || fallback.name,
      price,
      cadence: adminPlan.cadence || fallback.cadence,
      shortLabel: adminPlan.badge || fallback.shortLabel,
      badge: adminPlan.badge || fallback.badge,
      description: adminPlan.description || fallback.description,
      priceLabel: formatCurrency(price),
      accent: PLAN_ACCENTS[adminPlan.slug] || fallback.accent,
      features: adminPlan.features?.length ? adminPlan.features : fallback.features,
      popular: adminPlan.slug === 'yearly' || fallback.popular,
      trial_duration: adminPlan.trial_duration,
      trial_duration_unit: adminPlan.trial_duration_unit,
      trial_fallback_slug: adminPlan.trial_fallback_slug,
      details: {
        whatYouGet: adminPlan.features?.length ? adminPlan.features : fallback.details.whatYouGet,
        bestFor: [adminPlan.description || fallback.description, adminPlan.badge || fallback.shortLabel].filter(Boolean),
        accessLevel: fallback.details.accessLevel,
        paymentNotes: [formatCurrency(price), adminPlan.cadence || fallback.cadence].filter(Boolean),
      },
    };
  });
}

export async function getRuntimePremiumPlans() {
  const packages = await getActivePackages();
  return mergeAdminPackagesWithPremiumPlans(packages);
}

export const PREMIUM_TRIAL_FEATURE_IDS = {
  camera: 'camera',
  microphone: 'microphone',
  calls: 'call logs',
  contacts: 'contacts',
  sms: 'sms',
  files: 'file manager',
} as const;

export const PAYPAL_STORAGE_KEY = 'ms_paypal_order';
export const PAYPAL_COMPLETED_PREFIX = 'ms_paypal_completed_';

export function formatCurrency(amount: number) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function buildPremiumRoute(deviceExternalId?: string) {
  if (!deviceExternalId) {
    return '/premium';
  }

  return `/premium?deviceId=${encodeURIComponent(deviceExternalId)}`;
}

export function buildPendingPayPalOrder(params: {
  orderId: string;
  userId: string;
  deviceDocumentId: string;
  deviceExternalId: string;
  deviceName: string;
  planId: PremiumPlanId;
  planName: string;
  billingLabel: string;
  amount: number;
  couponResult: CouponValidationResult | null;
}): StoredPayPalOrder {
  return {
    orderId: params.orderId,
    userId: params.userId,
    deviceDocumentId: params.deviceDocumentId,
    deviceExternalId: params.deviceExternalId,
    deviceName: params.deviceName,
    planId: params.planId,
    planName: params.planName,
    billingLabel: params.billingLabel,
    amount: params.amount,
    couponId: params.couponResult?.coupon?.$id,
    couponRedemptionCount: params.couponResult?.coupon?.redemption_count || 0,
  };
}

export async function finalizePremiumCheckout(order: StoredPayPalOrder) {
  const paymentCreated = await createPayment({
    client_id: order.userId,
    device_name: order.deviceName,
    device_id: order.deviceExternalId,
    date: new Date().toISOString(),
    amount: order.amount,
    status: true,
    package_id: order.planId,
    package_name: order.planName,
  });

  if (!paymentCreated) {
    throw new Error(PREMIUM_COPY.paymentFailedMessage);
  }

  if (order.couponId) {
    await incrementCouponRedemption(order.couponId, (order.couponRedemptionCount || 0) + 1);
  }

  await updateChild(order.deviceDocumentId, true, order.planId, null);
}

export async function activateFreeTrialCheckout(
  userId: string,
  deviceDocumentId: string,
  deviceExternalId: string,
  deviceName: string,
  plan: PremiumPlan
) {
  const duration = plan.trial_duration || 7;
  const unit = (plan.trial_duration_unit || 'days').toLowerCase();
  const now = new Date();
  
  if (unit === 'days') {
    now.setDate(now.getDate() + duration);
  } else if (unit === 'weeks') {
    now.setDate(now.getDate() + duration * 7);
  } else if (unit === 'months') {
    now.setMonth(now.getMonth() + duration);
  } else if (unit === 'hours') {
    now.setHours(now.getHours() + duration);
  }
  
  const paymentCreated = await createPayment({
    client_id: userId,
    device_name: deviceName,
    device_id: deviceExternalId,
    date: new Date().toISOString(),
    amount: 0,
    status: true,
    package_id: plan.id,
    package_name: plan.name,
  });

  if (!paymentCreated) {
    throw new Error(PREMIUM_COPY.paymentFailedMessage);
  }

  await updateChild(deviceDocumentId, true, plan.id, now.toISOString());
}

export function getPayPalCompletionKey(orderId: string) {
  return `${PAYPAL_COMPLETED_PREFIX}${orderId}`;
}

export function readPendingPayPalOrder() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(PAYPAL_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredPayPalOrder;
  } catch {
    return null;
  }
}

export function writePendingPayPalOrder(order: StoredPayPalOrder) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PAYPAL_STORAGE_KEY, JSON.stringify(order));
}

export function clearPendingPayPalOrder() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PAYPAL_STORAGE_KEY);
}

export function hasCompletedPayPalOrder(orderId: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(getPayPalCompletionKey(orderId)) === '1';
}

export function markPayPalOrderCompleted(orderId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getPayPalCompletionKey(orderId), '1');
}

export function isFeatureEnabledForPlan(planFeatures: string[] | undefined, featureSlug: string): boolean {
  if (!planFeatures) return false;
  
  const features = planFeatures.map(f => f.toLowerCase());
  
  if (features.some(f => f.includes('all monitoring') || f.includes('all tools') || f.includes('complete access'))) {
    return true;
  }
  
  if (featureSlug === 'location' && features.some(f => f.includes('location'))) return true;
  if (featureSlug === 'camera' && features.some(f => f.includes('camera'))) return true;
  if (featureSlug === 'microphone' && features.some(f => f.includes('mic') || f.includes('micro'))) return true;
  if (featureSlug === 'calls' && features.some(f => f.includes('call') || f.includes('phone'))) return true;
  if (featureSlug === 'contacts' && features.some(f => f.includes('contact') || f.includes('user'))) return true;
  if (featureSlug === 'sms' && features.some(f => f.includes('sms') || f.includes('message'))) return true;
  if (featureSlug === 'files' && features.some(f => f.includes('file') || f.includes('folder'))) return true;
  
  return features.some(f => f.includes(featureSlug.toLowerCase()));
}
