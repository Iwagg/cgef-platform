export function fmtDate(value: string | null | undefined, style: 'short' | 'long' | 'day' = 'short'): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  if (style === 'day') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: style === 'long' ? 'long' : 'short', year: 'numeric' });
}

export function fmtMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  if (Math.abs(value) >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toFixed(0)}`;
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function firstName(name: string | null | undefined): string {
  return name ? name.split(' ')[0] : '—';
}

export function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
