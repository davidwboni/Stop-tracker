import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DailyQuickEntry from '../components/DailyQuickEntry';
const fixture = vi.hoisted(() => ({ data: {}, saved: vi.fn() }));
vi.mock('../contexts/DataContext', () => ({ useData: () => fixture.data }));
vi.mock('../services/productAnalytics', () => ({ trackProductEvent: vi.fn() }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
const config = { model: 'flat_stops', ratePerStop: 2.08, excessParcelRate: .05, contractorFeePercent: 6 };
beforeEach(() => { fixture.saved.mockReset(); fixture.data = {logs:[], paymentConfig:config, updateLogs:fixture.saved}; });
function mount() { return render(<DailyQuickEntry open initialDate="2026-09-26" onClose={vi.fn()} onSaved={vi.fn()} />); }
describe('Home entry integration', () => {
  it('loads the saved work and updates it without adding a duplicate', async () => {
    fixture.data.logs = [{ id:'existing',date:'2026-09-26',stops:120,quantity:120,totalParcels:158,extra:30,total:281.5,payStructureSnapshot:config }];
    mount();
    expect(screen.getByRole('textbox', {name:'Stops'})).toHaveValue('120');
    fireEvent.click(screen.getByRole('button', { name:'Save changes' }));
    await waitFor(() => expect(fixture.saved).toHaveBeenCalledTimes(1));
    expect(fixture.saved.mock.calls[0][0]).toHaveLength(1);
    expect(fixture.saved.mock.calls[0][0][0]).toMatchObject({id:'existing',total:281.5,payStructureSnapshot:config,totalParcels:158});
  });
  it('keeps the form and its inputs on a failed save', async () => {
    fixture.saved.mockRejectedValue(new Error('save failed'));
    mount();
    fireEvent.change(screen.getByRole('textbox', {name:'Stops'}), {target:{value:'120'}});
    fireEvent.click(screen.getByRole('button', {name:'Save day'}));
    await screen.findByText(/Couldn't save/);
    expect(screen.getByRole('textbox', {name:'Stops'})).toHaveValue('120');
  });
  it('rejects a parcel count below stops without silently reducing the calculation', async () => {
    mount();
    fireEvent.change(screen.getByRole('textbox', {name:'Stops'}), {target:{value:'120'}});
    fireEvent.change(screen.getByLabelText(/Total parcels/), {target:{value:'100'}});
    fireEvent.click(screen.getByRole('button', {name:'Save day'}));
    expect((await screen.findAllByText(/Total parcels must/)).length).toBeGreaterThan(0);
    expect(fixture.saved).not.toHaveBeenCalled();
  });
});

describe('Quick Entry approved interactions', () => {
  it('asks before dismissing edited work and keeps it when cancelled', () => {
    const close = vi.fn();
    render(<DailyQuickEntry open initialDate="2026-09-26" onClose={close} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', {name:'Stops'}), {target:{value:'120'}});
    fireEvent.click(screen.getByRole('button', {name:'Close Quick Entry'}));
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Keep editing'}));
    expect(screen.getByRole('textbox', {name:'Stops'})).toHaveValue('120');
    expect(close).not.toHaveBeenCalled();
  });
  it('passes the local-only save result to Home', async () => {
    const onSaved = vi.fn();
    fixture.saved.mockResolvedValue({success:true,isOnline:false});
    render(<DailyQuickEntry open initialDate="2026-09-26" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByRole('textbox', {name:'Stops'}), {target:{value:'120'}});
    fireEvent.click(screen.getByRole('button', {name:'Save day'}));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({stops:120}), {success:true,isOnline:false}));
  });
  it('uses a worked choice instead of stops for a day-rate driver', async () => {
    fixture.data.paymentConfig = { model:'per_day', ratePerDay:150, contractorFeePercent:0 };
    mount();
    expect(screen.queryByRole('textbox', {name:'Stops'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Yes, I worked'}));
    fireEvent.click(screen.getByRole('button', {name:'Save day'}));
    await waitFor(() => expect(fixture.saved).toHaveBeenCalled());
    expect(fixture.saved.mock.calls[0][0][0]).toMatchObject({quantity:1,total:150});
  });
});

describe('Compact extra-work entry and keyboard layout', () => {
  it('reveals type, amount and description together, with one compact earnings estimate', () => {
    mount();
    expect(screen.getByRole('button', {name:'Save day'})).toBeInTheDocument();
    expect(screen.getByRole('switch', {name:/Extra work/})).toHaveAttribute('aria-checked','false');
    expect(screen.queryByLabelText(/Extra payment/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', {name:/Extra work/}));
    expect(screen.getByRole('switch', {name:/Extra work/})).toHaveAttribute('aria-checked','true');
    expect(screen.getByLabelText('What type of work?')).toBeInTheDocument();
    expect(screen.getByLabelText(/Extra payment/)).toBeInTheDocument();
    expect(screen.getByLabelText(/What was it for/)).toBeInTheDocument();
    expect(document.querySelectorAll('.qe-footer-estimate')).toHaveLength(1);
    expect(document.querySelectorAll('.qe-summary')).toHaveLength(0);
    expect(document.querySelectorAll('.qe-scroll')).toHaveLength(1);
    expect(document.querySelectorAll('.qe-footer')).toHaveLength(1);
  });
  it('saves the extra run type, payment and description without inventing another day', async () => {
    fixture.saved.mockResolvedValue({success:true});
    mount();
    fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'120'}});
    fireEvent.click(screen.getByRole('switch',{name:/Extra work/}));
    fireEvent.change(screen.getByLabelText('What type of work?'),{target:{value:'Extra run'}});
    fireEvent.change(screen.getByLabelText(/Extra payment/),{target:{value:'30'}});
    fireEvent.change(screen.getByLabelText(/What was it for/),{target:{value:'Second collection at depot'}});
    fireEvent.click(screen.getByRole('button',{name:'Save day'}));
    await waitFor(()=>expect(fixture.saved).toHaveBeenCalledTimes(1));
    expect(fixture.saved.mock.calls[0][0][0]).toMatchObject({
      extraWork:true, extraType:'Extra run', extra:30, notes:'Second collection at depot', stops:120
    });
  });
  it('resizes the sheet on Android-style window resize and keeps the scrollable fieldset separate from Save', () => {
    const before=window.innerHeight;
    try {
      mount();
      const position=document.querySelector('.qe-position');
      const scroll=document.querySelector('.qe-scroll');
      const footer=document.querySelector('.qe-footer');
      expect(scroll).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
      expect(scroll.contains(footer)).toBe(false);
      // Some browsers lack visualViewport; the resize fallback must remain.
      fireEvent.resize(window);
      expect(position).toBeInTheDocument();
    } finally {
      expect(window.innerHeight).toBe(before);
    }
  });
});
