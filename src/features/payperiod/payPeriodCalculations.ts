export interface PaymentTier {
  stopCount?: number;
  rate: number;
}

export function calculateStopFee(stops: number, thresholds: PaymentTier[]): number {
  let remaining = stops;
  let previousCap = 0;
  let total = 0;

  for (let i = 0; i < thresholds.length - 1; i++) {
    const tier = thresholds[i];
    const tierCap = tier.stopCount ?? previousCap;
    const tierStops = Math.min(remaining, tierCap - previousCap);
    if (tierStops <= 0) break;
    total += tierStops * tier.rate;
    remaining -= tierStops;
    previousCap = tierCap;
  }

  if (remaining > 0) {
    const overflowRate = thresholds[thresholds.length - 1].rate;
    total += remaining * overflowRate;
  }

  return total;
}
