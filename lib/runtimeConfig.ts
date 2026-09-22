import { Query, ID } from 'appwrite';
import { appwriteConfig, databases } from './appwrite';

let cachedServerUrl: string | null = null;
let cachedAt = 0;
const CACHE_MS = 60 * 1000;

const normalizeServerUrl = (value: unknown): string => {
  if (!value) return '';
  return String(value).trim().replace(/\/$/, '');
};

export async function getActiveServerUrl({ forceRefresh = false } = {}): Promise<string> {
  const fallbackUrl = normalizeServerUrl(process.env.NEXT_PUBLIC_API_URL || 'https://server-main-production-4dfb.up.railway.app');
  const now = Date.now();

  if (!forceRefresh && cachedServerUrl && now - cachedAt < CACHE_MS) {
    return cachedServerUrl;
  }

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.adminSettingsCollectionId,
      [Query.equal('is_active', true), Query.limit(20)]
    );

    const activeDocs = result.documents || [];
    const activeServerLink = activeDocs.find((d: any) => d.key === 'server_link');

    if (activeServerLink?.value) {
      let parsed: any = {};
      try {
        parsed = typeof activeServerLink.value === 'string' && activeServerLink.value.startsWith('{')
          ? JSON.parse(activeServerLink.value)
          : { url: activeServerLink.value };
      } catch {
        parsed = { url: activeServerLink.value };
      }
      if (parsed.url) {
        cachedServerUrl = normalizeServerUrl(parsed.url);
        cachedAt = now;
        return cachedServerUrl;
      }
    }

    const legacySetting = activeDocs.find((d: any) => d.key === 'server_url');
    if (legacySetting?.value) {
      cachedServerUrl = normalizeServerUrl(legacySetting.value);
      cachedAt = now;
      return cachedServerUrl;
    }

    cachedServerUrl = fallbackUrl;
    cachedAt = now;
    return fallbackUrl;
  } catch (error) {
    console.log('Unable to fetch runtime server URL from Appwrite:', error);
    cachedServerUrl = fallbackUrl;
    cachedAt = now;
    return fallbackUrl;
  }
}

let cachedDevUxMode: boolean | null = null;
let cachedDevUxAt = 0;
const DEV_UX_CACHE_MS = 5 * 1000;

export async function getDevUxMode({ forceRefresh = false, version = 'web' } = {}): Promise<boolean> {
  const now = Date.now();

  if (!forceRefresh && cachedDevUxMode !== null && now - cachedDevUxAt < DEV_UX_CACHE_MS) {
    return cachedDevUxMode;
  }

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.adminSettingsCollectionId,
      [Query.limit(50)]
    );

    const docs = result.documents || [];
    const primaryAppVersionsDoc = docs.find((d: any) => d.key === 'primary_app_versions');
    const devUxVersionsDoc = docs.find((d: any) => d.key === 'dev_ux_versions');
    const devUxModeDoc = docs.find((d: any) => d.key === 'dev_ux_mode');

    // Parse dev_ux_versions map
    let versionMap: Record<string, boolean> = {};
    if (devUxVersionsDoc?.value) {
      try {
        const parsed = JSON.parse(devUxVersionsDoc.value);
        if (parsed && typeof parsed === 'object') {
          versionMap = parsed;
        }
      } catch {}
    }

    // Parse primary_app_versions list & defaultMode
    let primaryVersionsList: any[] = [];
    let primaryDefaultMode: boolean | null = null;
    if (primaryAppVersionsDoc?.value) {
      try {
        const parsed = JSON.parse(primaryAppVersionsDoc.value);
        if (typeof parsed?.defaultMode === 'boolean') {
          primaryDefaultMode = parsed.defaultMode;
        }
        primaryVersionsList = Array.isArray(parsed) ? parsed : (parsed?.versions || []);
      } catch {}
    }

    const targetVer = (version || 'web').toLowerCase().trim();

    // 1. Explicit target version match in dev_ux_versions map
    if (typeof versionMap[targetVer] === 'boolean') {
      cachedDevUxMode = versionMap[targetVer];
      cachedDevUxAt = now;
      return versionMap[targetVer];
    }

    // 2. Explicit target version match in primary_app_versions list
    const matchedPrimary = primaryVersionsList.find(
      (v: any) => (v.version || '').toLowerCase().trim() === targetVer
    );
    if (matchedPrimary && typeof matchedPrimary.isDevMode === 'boolean') {
      cachedDevUxMode = matchedPrimary.isDevMode;
      cachedDevUxAt = now;
      return matchedPrimary.isDevMode;
    }

    // 3. Global Master toggle (dev_ux_mode) set on Admin Dashboard Home / Profile
    if (devUxModeDoc && devUxModeDoc.is_active !== false) {
      const val = devUxModeDoc.value;
      const isGlobalEnabled = val === 'true' || val === true;
      cachedDevUxMode = isGlobalEnabled;
      cachedDevUxAt = now;
      return isGlobalEnabled;
    }

    // 4. Fallback: dev_ux_versions['default']
    if (typeof versionMap['default'] === 'boolean') {
      cachedDevUxMode = versionMap['default'];
      cachedDevUxAt = now;
      return versionMap['default'];
    }

    // 5. Fallback: primary_app_versions defaultMode
    if (typeof primaryDefaultMode === 'boolean') {
      cachedDevUxMode = primaryDefaultMode;
      cachedDevUxAt = now;
      return primaryDefaultMode;
    }

    cachedDevUxMode = false;
    cachedDevUxAt = now;
    return false;
  } catch (error) {
    console.log('Unable to fetch Dev UX mode from Appwrite:', error);
    if (cachedDevUxMode !== null) return cachedDevUxMode;
    return false;
  }
}

export async function reportUserAppSession({
  email,
  username,
  userId,
  version = 'web',
  role,
  childId,
  location,
}: {
  email?: string;
  username?: string;
  userId?: string;
  version?: string;
  role?: string;
  childId?: string;
  location?: { latitude: number; longitude: number };
} = {}): Promise<void> {
  const userIdentifier = email || userId || username || 'anonymous_web_user';
  const nowIso = new Date().toISOString();

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.adminSettingsCollectionId,
      [Query.equal('key', 'primary_app_user_sessions'), Query.limit(1)]
    );

    let sessions: Record<string, any> = {};
    const existingDoc = result.documents?.[0];
    if (existingDoc?.value) {
      try {
        sessions = JSON.parse(existingDoc.value) || {};
      } catch {
        sessions = {};
      }
    }

    const prev = sessions[userIdentifier] || {};
    sessions[userIdentifier] = {
      userId: userId || prev.userId || '',
      email: email || prev.email || '',
      username: username || prev.username || '',
      version: version || 'web',
      role: role || prev.role || 'parent',
      childId: childId || prev.childId || '',
      ...(location ? { location } : prev.location ? { location: prev.location } : {}),
      lastActiveAt: nowIso,
    };

    const payload = {
      key: 'primary_app_user_sessions',
      value: JSON.stringify(sessions),
      is_active: true,
      updated_by: email || 'web_client',
    };

    if (existingDoc?.$id) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.adminSettingsCollectionId,
        existingDoc.$id,
        payload
      );
    } else {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.adminSettingsCollectionId,
        ID.unique(),
        payload
      );
    }
  } catch (err) {
    console.log('Error reporting user web session to Appwrite:', err);
  }
}
