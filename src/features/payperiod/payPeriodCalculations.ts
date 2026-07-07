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

export interface PeriodTotals {
  days: DayCalculation[];
  grossPayment: number;
  dpdCharge: number;
  adminFee: number;
  total: number;
  vat: number;
  totalWithVat: number;
}

export function calculatePeriodTotals(
  dailyEntries: DailyDpdEntry[],
  dpdCharge: number,
  adminFee: number,
  vatRate: number,
  config: PaymentConfig
): PeriodTotals {
  const days = dailyEntries.map((entry) => calculateDayTotal(entry, config));
  const grossPayment = days.reduce((sum, day) => sum + day.dayTotal, 0);
  const total = grossPayment - dpdCharge - adminFee;
  const vat = total * vatRate;
  const totalWithVat = total + vat;

  return { days, grossPayment, dpdCharge, adminFee, total, vat, totalWithVat };
}

export type ComparisonStatus = 'match' | 'mismatch' | 'missing-from-log' | 'missing-from-statement';

export interface DayComparison {
  date: string;
  loggedStops: number | null;
  statementStops: number | null;
  status: ComparisonStatus;
  difference: number;
}

export function comparePeriodToLogs(
  dailyEntries: DailyDpdEntry[],
  logs: Array<{ date: string; stops: number }>
): DayComparison[] {
  const dates = new Set<string>([
    ...dailyEntries.map((e) => e.date),
    ...logs.map((l) => l.date),
  ]);

  return Array.from(dates)
    .sort()
    .map((date) => {
      const statementEntry = dailyEntries.find((e) => e.date === date);
      const logEntry = logs.find((l) => l.date === date);

      const statementStops = statementEntry ? statementEntry.stops : null;
      const loggedStops = logEntry ? logEntry.stops : null;

      let status: ComparisonStatus;
      if (statementStops === null) {
        status = 'missing-from-statement';
      } else if (loggedStops === null) {
        status = 'missing-from-log';
      } else if (statementStops === loggedStops) {
        status = 'match';
      } else {
        status = 'mismatch';
      }

      return {
        date,
        loggedStops,
        statementStops,
        status,
        difference: (loggedStops ?? 0) - (statementStops ?? 0),
      };
    });
}
