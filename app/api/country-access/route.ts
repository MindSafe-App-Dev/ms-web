import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateCountryAccess,
  normalizeCountryCode,
  parseCountryConfig,
  getCountryName,
  CountryAccessConfig,
} from '@/lib/countryAccess';
import { getAdminSetting } from '@/lib/appwrite';

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'advance_button_permitted_countries';
const FALLBACK_KEY = 'app_access_permitted_countries';

let cachedConfig: { config: CountryAccessConfig; at: number } | null = null;
const CACHE_TTL_MS = 15000;

async function fetchAccessConfig(): Promise<CountryAccessConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.at < CACHE_TTL_MS) {
    return cachedConfig.config;
  }

  try {
    let doc = await getAdminSetting(SETTING_KEY);
    if (!doc?.value) {
      doc = await getAdminSetting(FALLBACK_KEY);
    }
    const config = parseCountryConfig(doc?.value);
    cachedConfig = { config, at: now };
    return config;
  } catch (error) {
    console.error('Failed to load country access setting in web:', error);
    if (cachedConfig) return cachedConfig.config;
    return { enabled: false, permittedCountries: [] };
  }
}

function extractCountryFromHeaders(headers: Headers): string | null {
  const candidates = [
    'cf-ipcountry',
    'x-vercel-ip-country',
    'cloudfront-viewer-country',
    'x-geo-country',
    'x-country-code',
  ];

  for (const name of candidates) {
    const val = headers.get(name);
    const norm = normalizeCountryCode(val);
    if (norm && norm !== 'XX' && norm !== 'T1' && norm !== 'ZZ') {
      return norm;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Client-supplied country param (e.g. from client IP lookup)
  let detectedCountry = normalizeCountryCode(searchParams.get('country'));

  // 2. Edge/CDN headers
  if (!detectedCountry) {
    detectedCountry = extractCountryFromHeaders(request.headers);
  }

  // 3. Fallback Geo-IP from public IP if available
  if (!detectedCountry) {
    const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const clientIp = xff || request.headers.get('x-real-ip');

    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
      try {
        const res = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, { cache: 'no-store' });
        if (res.ok) {
          const geo = await res.json();
          detectedCountry = normalizeCountryCode(geo?.country_code);
        }
      } catch {}
    }
  }

  const config = await fetchAccessConfig();
  const evaluation = evaluateCountryAccess(detectedCountry, config);

  return NextResponse.json({
    ...evaluation,
    restrictionEnabled: config.enabled,
    permittedCount: config.permittedCountries.length,
    countryName: evaluation.country ? getCountryName(evaluation.country) : null,
  });
}
