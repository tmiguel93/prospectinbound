export function calculateInitialCommission(
  fixedCents: number,
  percentageBps: number,
  paymentCents: number
) {
  const recurringCents = Math.round((paymentCents * percentageBps) / 10000);
  return { fixedCents, recurringCents, totalCents: fixedCents + recurringCents };
}
