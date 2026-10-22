export const SECTORS = [
  'Finance & Banking', 'Insurance', 'Healthcare', 'Energy & Utilities',
  'Transportation', 'Telecommunications', 'Manufacturing', 'Retail & Distribution',
  'Professional Services', 'Public Sector', 'Technology', 'Other',
];

// organizations.country is CHAR(2); "Other" is stored as NULL
export const COUNTRIES = [
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' },
  { code: 'BE', name: 'Belgium' }, { code: 'NL', name: 'Netherlands' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'OTHER', name: 'Other' },
];

export const ORG_SIZES = ['SME (1–249)', 'Mid-market (250–999)', 'Enterprise (1000+)'];
