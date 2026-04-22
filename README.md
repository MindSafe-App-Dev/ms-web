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

Optional if you want to override the default hardcoded Appwrite ids:

```bash
APPWRITE_DRIVE_CONNECTION_COLLECTION_ID=drive_connection_collection_id
```

Google OAuth must allow:

- `http://localhost:3000/api/drive/connect/callback` for local development
- `https://your-domain/api/drive/connect/callback` for production

Create the Drive connection collection with:

```bash
npm run setup:drive
```

That setup script is the only place that needs Appwrite admin envs:

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=...
```

If coupon and trial collections are also needed:

```bash
npm run setup:billing
```
