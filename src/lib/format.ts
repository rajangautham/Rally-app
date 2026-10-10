export function formatWhen(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((dd - day0) / 86400000);
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  let day: string;
  if (diff === 0) day = 'Today';
  else if (diff === 1) day = 'Tomorrow';
  else if (diff === -1) day = 'Yesterday';
  else if (diff > 1 && diff < 7) day = d.toLocaleDateString('en-AU', { weekday: 'long' });
  else day = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  return { day, time };
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

/** Returns a real calendar date or null (rejects 31/02 and similar). */
export function parseDob(day: string, month: string, year: string): Date | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || year.length !== 4) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (y < 1900 || date > new Date()) return null;
  return date;
}

export function ageOn(dob: Date, now = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Local calendar date as YYYY-MM-DD (what Postgres `date` expects). */
export function toIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function emailDomainAllowed(email: string, domains: string[]): boolean {
  const at = email.trim().toLowerCase().split('@');
  return at.length === 2 && at[0].length > 0 && domains.includes(at[1]);
}

/** "0412 345 678", "+61 412 345 678" or "61412345678" -> "+61412345678". Mobiles only. */
export function toAuMobileE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let local: string | null = null;
  if (/^04\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^\+614\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^614\d{8}$/.test(digits)) local = digits.slice(2);
  return local ? `+61${local}` : null;
}

export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}
