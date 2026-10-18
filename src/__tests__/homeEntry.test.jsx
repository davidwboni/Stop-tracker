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
function chooseDate(value){
  if(!screen.queryByLabelText('Entry date'))fireEvent.click(screen.getByRole('button',{name:/Change/}));
  fireEvent.change(screen.getByLabelText('Entry date'),{target:{value}});
}
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
  it('reveals only the extra amount, with work type and one note optional', () => {
    mount();
    expect(screen.getByRole('button', {name:'Save day'})).toBeInTheDocument();
    expect(screen.getByRole('switch', {name:/Extra work/})).toHaveAttribute('aria-checked','false');
    expect(screen.queryByLabelText(/Extra payment/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', {name:/Extra work/}));
    expect(screen.getByRole('switch', {name:/Extra work/})).toHaveAttribute('aria-checked','true');
    expect(screen.getByLabelText(/Extra payment/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Type of extra work')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Work notes')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Work type (optional)'));
    expect(screen.getByLabelText('Type of extra work')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Add a note (optional)'));
    expect(screen.getByLabelText('Work notes')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Work notes')).toHaveLength(1);
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
    fireEvent.click(screen.getByText('Work type (optional)'));
    fireEvent.change(screen.getByLabelText('Type of extra work'),{target:{value:'Extra run'}});
    fireEvent.change(screen.getByLabelText(/Extra payment/),{target:{value:'30'}});
    fireEvent.click(screen.getByText('Add a note (optional)'));
    fireEvent.change(screen.getByLabelText('Work notes'),{target:{value:'Second collection at depot'}});
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

describe('Correcting date without losing a new workday',()=>{
 it('keeps stops, parcels, extra run amount and notes when changing to another empty day',async()=>{
  fixture.saved.mockResolvedValue({success:true});
  const onDateChange=vi.fn();
  render(<DailyQuickEntry open initialDate="2026-09-26" onDateChange={onDateChange} onClose={vi.fn()} onSaved={vi.fn()}/>);
  fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'120'}});
  fireEvent.change(screen.getByLabelText(/Total parcels/),{target:{value:'158'}});
  fireEvent.click(screen.getByRole('switch',{name:/Extra work/}));
  fireEvent.click(screen.getByText('Work type (optional)'));
  fireEvent.change(screen.getByLabelText('Type of extra work'),{target:{value:'Extra run'}});
  fireEvent.change(screen.getByLabelText(/Extra payment/),{target:{value:'30'}});
  fireEvent.click(screen.getByText('Add a note (optional)'));
  fireEvent.change(screen.getByLabelText('Work notes'),{target:{value:'Second collection'}});
  chooseDate('2026-09-25');
  expect(onDateChange).toHaveBeenCalledWith('2026-09-25');
  expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('120');
  expect(screen.getByLabelText(/Total parcels/)).toHaveValue('158');
  expect(screen.getByRole('switch',{name:/Extra work/})).toHaveAttribute('aria-checked','true');
  expect(screen.getByLabelText(/Extra payment/)).toHaveValue('30');
  expect(screen.getByLabelText('Work notes')).toHaveValue('Second collection');
  fireEvent.click(screen.getByRole('button',{name:'Save day'}));
  await waitFor(()=>expect(fixture.saved).toHaveBeenCalledTimes(1));
  expect(fixture.saved.mock.calls[0][0][0]).toMatchObject({
    date:'2026-09-25',stops:120,totalParcels:158,extra:30,extraType:'Extra run',notes:'Second collection'
  });
 });
 it('does not let an echoed date prop clear the transferred draft',()=>{
  function Parent(){
    const [date,setDate]=React.useState('2026-09-26');
    return <DailyQuickEntry open initialDate={date} onDateChange={setDate} onClose={vi.fn()}/>;
  }
  render(<Parent/>);
  fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'88'}});
  chooseDate('2026-09-25');
  expect(screen.getByRole('button',{name:/25 Sep/})).toBeInTheDocument();
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('88');
 });
 it('warns before opening a date with existing work and never copies the draft over it',()=>{
  fixture.data.logs=[{id:'existing',date:'2026-09-25',stops:155,quantity:155,total:322.4,payStructureSnapshot:config}];
  mount();
  fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'120'}});
  chooseDate('2026-09-25');
  expect(screen.getByText('This date already has work saved')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('120');
  expect(screen.getByRole('button',{name:/26 Sep/})).toBeInTheDocument();
  chooseDate('2026-09-25');
  fireEvent.click(screen.getByRole('button',{name:'Open saved workday'}));
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('155');
  expect(screen.getByRole('button',{name:'Save changes'})).toBeInTheDocument();
  expect(fixture.saved).not.toHaveBeenCalled();
 });
 it('never carries edited saved-day work to a different date without permission',()=>{
  fixture.data.logs=[{id:'current-record',date:'2026-09-26',stops:130,quantity:130,total:270.4,payStructureSnapshot:config}];
  mount();
  fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'148'}});
  chooseDate('2026-09-25');
  expect(screen.getByText('Discard edits to this workday?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('148');
  chooseDate('2026-09-25');
  fireEvent.click(screen.getByRole('button',{name:'Discard edits and change date'}));
  expect(screen.getByRole('textbox',{name:'Stops'})).toHaveValue('');
  expect(screen.getByRole('button',{name:'Save day'})).toBeInTheDocument();
  expect(fixture.saved).not.toHaveBeenCalled();
 });
});

describe('Final quick entry friction pass',()=>{
 it('starts with the date, optional type and note collapsed',()=>{
  mount();
  expect(screen.getByRole('button',{name:/26 Sep/})).toHaveAttribute('aria-expanded','false');
  expect(screen.queryByLabelText('Entry date')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Work notes')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Change/}));
  expect(screen.getByLabelText('Entry date')).toHaveValue('2026-09-26');
  fireEvent.click(screen.getByRole('button',{name:/Close/}));
  expect(screen.queryByLabelText('Entry date')).not.toBeInTheDocument();
 });
 it('keeps a single note when extra work is enabled or disabled',async()=>{
  fixture.saved.mockResolvedValue({success:true});mount();
  fireEvent.click(screen.getByText('Add a note (optional)'));
  fireEvent.change(screen.getByLabelText('Work notes'),{target:{value:'Left parcel at depot'}});
  fireEvent.click(screen.getByRole('switch',{name:/Extra work/}));
  expect(screen.getAllByLabelText('Work notes')).toHaveLength(1);
  expect(screen.getByLabelText('Work notes')).toHaveValue('Left parcel at depot');
  fireEvent.change(screen.getByRole('textbox',{name:'Stops'}),{target:{value:'90'}});
  fireEvent.change(screen.getByLabelText('Extra payment (£)'),{target:{value:'25.00'}});
  fireEvent.click(screen.getByRole('button',{name:'Save day'}));
  await waitFor(()=>expect(fixture.saved).toHaveBeenCalledOnce());
  expect(fixture.saved.mock.calls[0][0][0]).toMatchObject({notes:'Left parcel at depot',extra:25});
 });
});
