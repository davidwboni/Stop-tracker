import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentSettings from '../components/PaymentSettings';

vi.mock('../services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    paymentConfig: {
      model: 'tiered_stops',
      thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
      excessParcelRate: 0.05,
    },
  }),
}));

describe('PaymentSettings', () => {
  it('renders a model picker with the five hand-fillable models', () => {
    render(<PaymentSettings userId="u1" user={{ isGuest: false }} onSettingsSaved={() => {}} />);
    expect(screen.getByText('Flat per stop')).toBeTruthy();
    expect(screen.getByText('Per mile')).toBeTruthy();
    expect(screen.getByText('Day rate')).toBeTruthy();
  });

  it('shows a live worked example that reflects the entered rate', () => {
    render(<PaymentSettings userId="u1" user={{ isGuest: false }} onSettingsSaved={() => {}} />);
    fireEvent.click(screen.getByText('Flat per stop'));
    const rate = screen.getByLabelText(/rate per stop/i);
    fireEvent.change(rate, { target: { value: '2' } });
    expect(screen.getByTestId('worked-example').textContent).toContain('£200.00');
  });
});
