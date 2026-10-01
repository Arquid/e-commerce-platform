// The API answers errors with { message }, which RTK Query exposes as
// error.data.message. Shows that when there is one (it says what actually went
// wrong, e.g. "Not enough stock for …"), and the fallback for everything else,
// like a dropped connection.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { message?: unknown } }).data;
    if (typeof data?.message === "string") return data.message;
  }
  return fallback;
}
