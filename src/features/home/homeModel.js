import { calculateDayEarnings } from '../payperiod/payStructure';
import { isoDate } from '../payperiod/periods';

export const pennies = value => Math.round((Number(value) + Number.EPSILON) * 100);
export const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
export const weekFor = date => {
  const start = new Date(date); start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return { start: isoDate(start), end: isoDate(end) };
};

// Historical totals are authoritative. Never silently reprice an old entry with today's rates.
export function summarizeDay(log, expenses = []) {
  if (!log) return null;
  const config = log.payStructureSnapshot;
  const gross = Number(log.total);
  if (log.total == null || !Number.isFinite(gross)) return { unavailable: true };
  const feeRate = config?.contractorFeePercent;
  const knownFee = feeRate != null && Number.isFinite(Number(feeRate)) && feeRate >= 0 && feeRate <= 100;
  const grossPence = pennies(gross);
  const feePence = knownFee ? Math.round(grossPence * Number(feeRate) / 100) : null;
  const dailyExpenses = expenses.filter(e => e.date === log.date && !e.periodOnly);
  const expensePence = dailyExpenses.reduce((sum, e) => sum + pennies(e.amount), 0);
  return {
    gross: grossPence / 100, feeRate: knownFee ? Number(feeRate) : null,
    fee: knownFee ? feePence / 100 : null,
    afterFee: knownFee ? (grossPence - feePence) / 100 : null,
    expenses: expensePence / 100,
    takeHome: knownFee ? (grossPence - feePence - expensePence) / 100 : null,
    excess: log.totalParcels != null ? Math.max(0, Number(log.totalParcels) - Number(log.stops || 0)) : (log.excessParcels ?? null),
    model: config?.model || log.payModel,
    config, dailyExpenses,
  };
}

export function grossForEntry(config, { quantity, miles, totalParcels, extra }) {
  const base = pennies(calculateDayEarnings(config, { quantity, miles }));
  const parcels = totalParcels === '' || totalParcels == null ? 0 : Math.max(0, Number(totalParcels) - quantity);
  return (base + pennies(parcels * (config.excessParcelRate || 0)) + pennies(extra || 0)) / 100;
}
