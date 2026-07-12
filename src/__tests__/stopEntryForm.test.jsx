import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

async function renderWith(model) {
  const configs = {
    tiered_stops: { model: 'tiered_stops', thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }], excessParcelRate: 0.05 },
    per_mile: { model: 'per_mile', ratePerMile: 0.45, baseFee: 30 },
    per_day: { model: 'per_day', ratePerDay: 145 },
  };
  vi.doMock('../contexts/DataContext', () => ({ useData: () => ({ paymentConfig: configs[model] }) }));
  const { default: Form } = await import('../components/StopEntryForm');
  return Form;
}

describe('StopEntryForm field-swap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('labels the hero field "Number of stops" for a tiered driver', async () => {
    const Form = await renderWith('tiered_stops');
    render(<Form logs={[]} updateLogs={() => {}} />);
    expect(screen.getByText(/number of stops/i)).toBeTruthy();
  });

  it('labels the hero field "Miles driven" for a per_mile driver', async () => {
    const Form = await renderWith('per_mile');
    render(<Form logs={[]} updateLogs={() => {}} />);
    expect(screen.getByText(/miles driven/i)).toBeTruthy();
  });

  it('shows a day-rate toggle for per_day', async () => {
    const Form = await renderWith('per_day');
    render(<Form logs={[]} updateLogs={() => {}} />);
    expect(screen.getByText(/worked today/i)).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
  });
});
