// Stripe requires at least 30 minutes; the extra minute absorbs the time
// between computing this and Stripe receiving the request.
export const CHECKOUT_EXPIRY_SECONDS = 31 * 60;

// How long a pending order without a Stripe session counts as "still being
// created by another request" rather than abandoned.
export const IN_FLIGHT_GRACE_MS = 2 * 60 * 1000;

// A pending order this old has outlived its checkout page (which expires after
// CHECKOUT_EXPIRY_SECONDS) by a comfortable margin, so Stripe's expiry notice
// should long since have arrived. If the order is still pending, the notice
// was lost and the sweeper steps in.
export const STALE_CHECKOUT_AFTER_MS = CHECKOUT_EXPIRY_SECONDS * 1000 + 14 * 60 * 1000;

export const STALE_CHECKOUT_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// A cancelled order still waiting for its refund is left alone this long before
// the sweeper steps in, so it doesn't race the request that is making that
// refund right now.
export const REFUND_RETRY_AFTER_MS = 5 * 60 * 1000;
