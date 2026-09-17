// Express's own proxy-addr library throws a raw, uncaught TypeError for any
// value it doesn't recognize as a hop count, boolean, or known subnet (e.g.
// the very natural-looking TRUST_PROXY=true) — so the value is parsed and
// validated here instead of being handed to app.set() as-is.
export function parseTrustProxy(raw: string): boolean | number {
  const value = raw.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;

  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid TRUST_PROXY value: "${raw}". Use a hop count (e.g. "1") or "true"/"false".`);
  }
  return num;
}
