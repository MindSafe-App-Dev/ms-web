// ISO 3166-1 alpha-2 country codes -> display names
export const ISO_COUNTRIES: Readonly<Record<string, string>> = Object.freeze({
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AG: 'Antigua and Barbuda',
  AI: 'Anguilla', AL: 'Albania', AM: 'Armenia', AO: 'Angola', AQ: 'Antarctica',
  AR: 'Argentina', AS: 'American Samoa', AT: 'Austria', AU: 'Australia', AW: 'Aruba',
  AX: 'Aland Islands', AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BB: 'Barbados',
  BD: 'Bangladesh', BE: 'Belgium', BF: 'Burkina Faso', BG: 'Bulgaria', BH: 'Bahrain',
  BI: 'Burundi', BJ: 'Benin', BL: 'Saint Barthelemy', BM: 'Bermuda', BN: 'Brunei',
  BO: 'Bolivia', BQ: 'Caribbean Netherlands', BR: 'Brazil', BS: 'Bahamas', BT: 'Bhutan',
  BV: 'Bouvet Island', BW: 'Botswana', BY: 'Belarus', BZ: 'Belize', CA: 'Canada',
  CC: 'Cocos (Keeling) Islands', CD: 'DR Congo', CF: 'Central African Republic',
  CG: 'Congo', CH: 'Switzerland', CI: 'Cote d\'Ivoire', CK: 'Cook Islands', CL: 'Chile',
  CM: 'Cameroon', CN: 'China', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba',
  CV: 'Cabo Verde', CW: 'Curacao', CX: 'Christmas Island', CY: 'Cyprus', CZ: 'Czechia',
  DE: 'Germany', DJ: 'Djibouti', DK: 'Denmark', DM: 'Dominica', DO: 'Dominican Republic',
  DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt', EH: 'Western Sahara',
  ER: 'Eritrea', ES: 'Spain', ET: 'Ethiopia', FI: 'Finland', FJ: 'Fiji',
  FK: 'Falkland Islands', FM: 'Micronesia', FO: 'Faroe Islands', FR: 'France',
  GA: 'Gabon', GB: 'United Kingdom', GD: 'Grenada', GE: 'Georgia', GF: 'French Guiana',
  GG: 'Guernsey', GH: 'Ghana', GI: 'Gibraltar', GL: 'Greenland', GM: 'Gambia',
  GN: 'Guinea', GP: 'Guadeloupe', GQ: 'Equatorial Guinea', GR: 'Greece',
  GS: 'South Georgia', GT: 'Guatemala', GU: 'Guam', GW: 'Guinea-Bissau', GY: 'Guyana',
  HK: 'Hong Kong', HM: 'Heard Island and McDonald Islands', HN: 'Honduras', HR: 'Croatia',
  HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IM: 'Isle of Man',
  IN: 'India', IO: 'British Indian Ocean Territory', IQ: 'Iraq', IR: 'Iran', IS: 'Iceland',
  IT: 'Italy', JE: 'Jersey', JM: 'Jamaica', JO: 'Jordan', JP: 'Japan', KE: 'Kenya',
  KG: 'Kyrgyzstan', KH: 'Cambodia', KI: 'Kiribati', KM: 'Comoros', KN: 'Saint Kitts and Nevis',
  KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KY: 'Cayman Islands', KZ: 'Kazakhstan',
  LA: 'Laos', LB: 'Lebanon', LC: 'Saint Lucia', LI: 'Liechtenstein', LK: 'Sri Lanka',
  LR: 'Liberia', LS: 'Lesotho', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya',
  MA: 'Morocco', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MF: 'Saint Martin',
  MG: 'Madagascar', MH: 'Marshall Islands', MK: 'North Macedonia', ML: 'Mali', MM: 'Myanmar',
  MN: 'Mongolia', MO: 'Macao', MP: 'Northern Mariana Islands', MQ: 'Martinique', MR: 'Mauritania',
  MS: 'Montserrat', MT: 'Malta', MU: 'Mauritius', MV: 'Maldives', MW: 'Malawi', MX: 'Mexico',
  MY: 'Malaysia', MZ: 'Mozambique', NA: 'Namibia', NC: 'New Caledonia', NE: 'Niger',
  NF: 'Norfolk Island', NG: 'Nigeria', NI: 'Nicaragua', NL: 'Netherlands', NO: 'Norway',
  NP: 'Nepal', NR: 'Nauru', NU: 'Niue', NZ: 'New Zealand', OM: 'Oman', PA: 'Panama',
  PE: 'Peru', PF: 'French Polynesia', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan',
  PL: 'Poland', PM: 'Saint Pierre and Miquelon', PN: 'Pitcairn', PR: 'Puerto Rico',
  PS: 'Palestine', PT: 'Portugal', PW: 'Palau', PY: 'Paraguay', QA: 'Qatar',
  RE: 'Reunion', RO: 'Romania', RS: 'Serbia', RU: 'Russia', RW: 'Rwanda',
  SA: 'Saudi Arabia', SB: 'Solomon Islands', SC: 'Seychelles', SD: 'Sudan', SE: 'Sweden',
  SG: 'Singapore', SH: 'Saint Helena', SI: 'Slovenia', SJ: 'Svalbard and Jan Mayen',
  SK: 'Slovakia', SL: 'Sierra Leone', SM: 'San Marino', SN: 'Senegal', SO: 'Somalia',
  SR: 'Suriname', SS: 'South Sudan', ST: 'Sao Tome and Principe', SV: 'El Salvador',
  SX: 'Sint Maarten', SY: 'Syria', SZ: 'Eswatini', TC: 'Turks and Caicos Islands',
  TD: 'Chad', TF: 'French Southern Territories', TG: 'Togo', TH: 'Thailand',
  TJ: 'Tajikistan', TK: 'Tokelau', TL: 'Timor-Leste', TM: 'Turkmenistan', TN: 'Tunisia',
  TO: 'Tonga', TR: 'Turkey', TT: 'Trinidad and Tobago', TV: 'Tuvalu', TW: 'Taiwan',
  TZ: 'Tanzania', UA: 'Ukraine', UG: 'Uganda', UM: 'U.S. Outlying Islands',
  US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VA: 'Vatican City',
  VC: 'Saint Vincent and the Grenadines', VE: 'Venezuela', VG: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands', VN: 'Vietnam', VU: 'Vanuatu', WF: 'Wallis and Futuna',
  WS: 'Samoa', YE: 'Yemen', YT: 'Mayotte', ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
});

export const BLOCKED_MESSAGE = 'Sorry, but the app is not accessible in your country.';

export interface CountryAccessConfig {
  enabled: boolean;
  permittedCountries: string[];
}

export function normalizeCountryCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const cleaned = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleaned) && cleaned in ISO_COUNTRIES) {
    return cleaned;
  }
  return null;
}

export function normalizeCountryCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const set = new Set<string>();
  for (const c of codes) {
    const norm = normalizeCountryCode(c);
    if (norm) set.add(norm);
  }
  return Array.from(set).sort();
}

export function getCountryName(code: string | null | undefined): string {
  if (!code) return 'Unknown location';
  const norm = normalizeCountryCode(code);
  return (norm && ISO_COUNTRIES[norm]) || code;
}

export function parseCountryConfig(raw: unknown): CountryAccessConfig {
  if (!raw) return { enabled: false, permittedCountries: [] };
  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { enabled: false, permittedCountries: [] };
    }
  }

  if (Array.isArray(parsed)) {
    const list = normalizeCountryCodes(parsed);
    return { enabled: list.length > 0, permittedCountries: list };
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const enabled = parsed.enabled !== false;
    const permittedCountries = normalizeCountryCodes(parsed.permittedCountries);
    return { enabled, permittedCountries };
  }

  return { enabled: false, permittedCountries: [] };
}

export function evaluateCountryAccess(
  detectedCountry: string | null | undefined,
  config: CountryAccessConfig
): {
  allowed: boolean;
  country: string | null;
  countryName: string | null;
  message?: string;
} {
  const normCountry = normalizeCountryCode(detectedCountry);
  const countryName = normCountry ? getCountryName(normCountry) : null;

  if (!config.enabled || config.permittedCountries.length === 0) {
    return { allowed: true, country: normCountry, countryName };
  }

  if (!normCountry) {
    return {
      allowed: false,
      country: null,
      countryName: 'Unknown Location',
      message: BLOCKED_MESSAGE,
    };
  }

  if (config.permittedCountries.includes(normCountry)) {
    return { allowed: true, country: normCountry, countryName };
  }

  return {
    allowed: false,
    country: normCountry,
    countryName,
    message: BLOCKED_MESSAGE,
  };
}
