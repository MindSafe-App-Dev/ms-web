# Billing/Coupon Setup

## 1) Admin-only coupon management (web)
Set these in web env:

- `NEXT_PUBLIC_COUPON_ADMIN_EMAIL`
- `NEXT_PUBLIC_COUPON_ADMIN_PASSWORD`

Only logins matching both values will see the **Coupons** menu and access `/coupon-management`.

## 2) Appwrite collection IDs used by app + web
Set these values to the created collection IDs:

Web:
- `NEXT_PUBLIC_APPWRITE_COUPON_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_TRIAL_COLLECTION_ID`

App:
- `EXPO_PUBLIC_APPWRITE_COUPON_COLLECTION_ID`
- `EXPO_PUBLIC_APPWRITE_TRIAL_COLLECTION_ID`

## 3) Create Appwrite collections via script
From `mindsafe-web/ms-web` run:

```bash
npm run setup:billing
```

Required env vars for script:

- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`

Optional overrides:

- `APPWRITE_ENDPOINT` (default `https://cloud.appwrite.io/v1`)
- `APPWRITE_COUPON_COLLECTION_ID` (default `coupon_collection_id`)
- `APPWRITE_TRIAL_COLLECTION_ID` (default `trial_collection_id`)

The script creates both collections, required attributes, and indexes if they do not already exist.
