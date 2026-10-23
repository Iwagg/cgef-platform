// Concatenates supabase/migrations/*.sql into supabase/setup_all.sql, the single file
// pasted into the Supabase SQL Editor for a first install. Usage: npm run db:bundle
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../supabase/migrations', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const parts = [
  `-- CGEF Platform : les ${files.length} migrations réunies, à exécuter UNE fois sur un projet Supabase vierge.`,
  '-- Généré par « npm run db:bundle » à partir de supabase/migrations/ (ne pas modifier à la main).',
  ...files.map((f) => `\n-- ════════ ${f} ════════\n${readFileSync(join(dir, f), 'utf8')}`),
];
writeFileSync(fileURLToPath(new URL('../supabase/setup_all.sql', import.meta.url)), parts.join('\n') + '\n');
console.log(`supabase/setup_all.sql: ${files.length} migrations`);
