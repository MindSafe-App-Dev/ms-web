MindSafe web dashboard built with Next.js.

## Getting Started

Run the local dashboard:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google Drive setup

The Drive integration uses these env vars:

```bash
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_TOKEN_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Google OAuth must allow:

- `http://localhost:3000/api/drive/connect/callback` for local development
- `https://your-domain/api/drive/connect/callback` for production

Drive connection state is stored in the signed-in Appwrite account preferences, so no extra Appwrite collection or admin env vars are needed for runtime.

If coupon and trial collections are also needed:

```bash
npm run setup:billing
```
