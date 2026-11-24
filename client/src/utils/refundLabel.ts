// What to tell the reader about the money for a cancelled order, if anything.
// Orders cancelled before they were paid have nothing to refund and show nothing.
export function refundLabel(order: { refundedAt?: string; refundPending?: boolean }): string | null {
  if (order.refundedAt) return "Refunded";
  if (order.refundPending) return "Refund pending";
  return null;
}
