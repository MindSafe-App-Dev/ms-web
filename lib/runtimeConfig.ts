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
const DEV_UX_CACHE_MS = 10 * 1000;

export async function getDevUxMode({ forceRefresh = false } = {}): Promise<boolean> {
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

    // Check primary_app_versions first
    if (primaryAppVersionsDoc?.value) {
      try {
        const parsed = JSON.parse(primaryAppVersionsDoc.value);
        if (parsed && typeof parsed.defaultMode === 'boolean') {
          cachedDevUxMode = parsed.defaultMode;
          cachedDevUxAt = now;
          return parsed.defaultMode;
        }
        const versionList = Array.isArray(parsed) ? parsed : (parsed.versions || []);
        const v1Match = versionList.find((v: any) => (v.version || '').toLowerCase() === 'v1');
        if (v1Match && typeof v1Match.isDevMode === 'boolean') {
          cachedDevUxMode = v1Match.isDevMode;
          cachedDevUxAt = now;
          return v1Match.isDevMode;
        }
      } catch {}
    }

    // Check dev_ux_versions map
    let versionMap: Record<string, boolean> = {};
    if (devUxVersionsDoc?.value) {
      try {
        const parsed = JSON.parse(devUxVersionsDoc.value);
        if (parsed && typeof parsed === 'object') {
          versionMap = parsed;
        }
      } catch {}
    }

    const globalDefault = devUxModeDoc
      ? (devUxModeDoc.is_active !== false && (devUxModeDoc.value === 'true' || devUxModeDoc.value === true))
      : false;

    let isEnabled = globalDefault;
    if (typeof versionMap['default'] === 'boolean') {
      isEnabled = versionMap['default'];
    } else if (typeof versionMap['v1'] === 'boolean') {
      isEnabled = versionMap['v1'];
    }

    cachedDevUxMode = isEnabled;
    cachedDevUxAt = now;
    return isEnabled;
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
