import { calculateStopFee, PaymentTier } from './payPeriodCalculations';

export type PayModel =
  | 'tiered_stops'
  | 'flat_stops'
  | 'per_mile'
  | 'hourly'
  | 'per_day'
  | 'sliding_scale';

export interface PayStructure {
  model: PayModel;
  thresholds?: PaymentTier[];
  excessParcelRate?: number;
  ratePerStop?: number;
  ratePerMile?: number;
  baseFee?: number;
  ratePerHour?: number;
  ratePerDay?: number;
  stopBands?: number[];
  mileBands?: number[];
  rateMatrix?: number[][];
}

export interface PayModelMeta {
  id: PayModel;
  label: string;
  primary: {
    field: 'stops' | 'miles' | 'hours' | 'day';
    label: string;
    unit: string;
    type: 'number' | 'toggle';
  };
  secondary?: { field: 'miles'; label: string; unit: string };
  params: string[];
}

export const PAY_MODELS: PayModelMeta[] = [
  {
    id: 'tiered_stops',
    label: 'Tiered per stop',
    primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' },
    params: ['thresholds', 'excessParcelRate'],
  },
  {
    id: 'flat_stops',
    label: 'Flat per stop',
    primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' },
    params: ['ratePerStop', 'excessParcelRate'],
  },
  {
    id: 'per_mile',
    label: 'Per mile',
    primary: { field: 'miles', label: 'Miles driven', unit: 'miles', type: 'number' },
    params: ['ratePerMile', 'baseFee'],
  },
  {
    id: 'hourly',
    label: 'Hourly',
    primary: { field: 'hours', label: 'Hours worked', unit: 'hours', type: 'number' },
    params: ['ratePerHour'],
  },
  {
    id: 'per_day',
    label: 'Day rate',
    primary: { field: 'day', label: 'Worked today?', unit: 'day', type: 'toggle' },
    params: ['ratePerDay'],
  },
  {
    id: 'sliding_scale',
    label: 'Sliding scale',
    primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' },
    secondary: { field: 'miles', label: 'Miles driven', unit: 'miles' },
    params: ['stopBands', 'mileBands', 'rateMatrix'],
  },
];

function nearestIndex(bands: number[], value: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < bands.length; i++) {
    const d = Math.abs(bands[i] - value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function lookupRate(config: PayStructure, stops: number, miles: number): number {
  const { stopBands, mileBands, rateMatrix } = config;
  if (!stopBands || !mileBands || !rateMatrix) return 0;
  const row = nearestIndex(stopBands, stops);
  const col = nearestIndex(mileBands, miles);
  return rateMatrix[row]?.[col] ?? 0;
}

export function calculateDayEarnings(
  config: PayStructure,
  inputs: { quantity: number; miles?: number }
): number {
  const quantity = Number(inputs.quantity) || 0;
  const miles = Number(inputs.miles) || 0;

  switch (config.model) {
    case 'tiered_stops':
      return calculateStopFee(quantity, config.thresholds ?? []);
    case 'flat_stops':
      return quantity * (config.ratePerStop ?? 0);
    case 'per_mile':
      return (config.baseFee ?? 0) + quantity * (config.ratePerMile ?? 0);
    case 'hourly':
      return quantity * (config.ratePerHour ?? 0);
    case 'per_day':
      return quantity > 0 ? config.ratePerDay ?? 0 : 0;
    case 'sliding_scale':
      return quantity * lookupRate(config, quantity, miles);
    default:
      return 0;
  }
}

const DEFAULT_TIERED: PayStructure = {
  model: 'tiered_stops',
  thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
  excessParcelRate: 0.05,
};

// A short human label for a configured pay structure — used in the welcome pill
// and anywhere we want to echo "here's what you set up" in a few words.
export function describePayStructure(config: PayStructure): string {
  switch (config.model) {
    case 'tiered_stops': {
      const t0 = config.thresholds?.[0];
      return t0 ? `Tiered · £${t0.rate}/stop to ${t0.stopCount}` : 'Tiered per stop';
    }
    case 'flat_stops':
      return `£${config.ratePerStop ?? 0} per stop`;
    case 'per_mile':
      return `£${config.ratePerMile ?? 0} per mile`;
    case 'hourly':
      return `£${config.ratePerHour ?? 0} per hour`;
    case 'per_day':
      return `£${config.ratePerDay ?? 0} per day`;
    case 'sliding_scale':
      return 'Sliding scale';
    default:
      return 'Pay set up';
  }
}

export function normalizePayStructure(config: any): PayStructure {
  if (!config) return { ...DEFAULT_TIERED };
  if (config.model) return config as PayStructure;
  if (config.thresholds) {
    return { model: 'tiered_stops', ...config };
  }
  // Legacy flat shape from before the thresholds migration.
  return {
    model: 'tiered_stops',
    thresholds: [
      { stopCount: config.cutoffPoint ?? 110, rate: config.rateBeforeCutoff ?? 1.98 },
      { rate: config.rateAfterCutoff ?? 1.48 },
    ],
    excessParcelRate: config.excessParcelRate ?? 0.05,
  };
}
