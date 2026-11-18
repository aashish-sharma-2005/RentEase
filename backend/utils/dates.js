// Calendar-date helpers. Dates are stored as 'YYYY-MM-DD' strings (business-local dates),
// so time-of-day and timezone never change the rental-day count.
const TZ = 'Asia/Kolkata';
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateStr(s) {
  if (typeof s !== 'string') return false;
  const m = RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function toUTCDays(s) {
  const m = RE.exec(s);
  if (!m) throw new Error('Invalid date: ' + s);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;
}

export function dayDifference(issue, ret) {
  return toUTCDays(ret) - toUTCDays(issue);
}

// Today's calendar date in India as YYYY-MM-DD
export function todayIST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
