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

export interface DailyDpdEntry {
  date: string;
  stops: number;
  totalParcels: number;
}

export interface PaymentConfig {
  thresholds: PaymentTier[];
  excessParcelRate: number;
}

export interface DayCalculation {
  date: string;
  stops: number;
  totalParcels: number;
  excessParcels: number;
  stopFee: number;
  parcelFee: number;
  dayTotal: number;
}

export function calculateExcessParcelFee(
  stops: number,
  totalParcels: number,
  excessParcelRate: number
): number {
  const excessParcels = Math.max(0, totalParcels - stops);
  return excessParcels * excessParcelRate;
}

export function calculateDayTotal(entry: DailyDpdEntry, config: PaymentConfig): DayCalculation {
  const stopFee = calculateStopFee(entry.stops, config.thresholds);
  const excessParcels = Math.max(0, entry.totalParcels - entry.stops);
  const parcelFee = calculateExcessParcelFee(entry.stops, entry.totalParcels, config.excessParcelRate);

  return {
    date: entry.date,
    stops: entry.stops,
    totalParcels: entry.totalParcels,
    excessParcels,
    stopFee,
    parcelFee,
    dayTotal: stopFee + parcelFee,
  };
}
