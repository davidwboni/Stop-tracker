import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import PayStructureAISetup from '../components/PayStructureAISetup';
import DailyQuickEntry from '../components/DailyQuickEntry';
import {validatePaySetup,payExample,blankPay} from '../features/payperiod/paySetupModel';
const f=vi.hoisted(()=>({interpret:vi.fn(),confirm:vi.fn(),data:{}}));
vi.mock('../services/interpretPayStructure',()=>({interpretPayStructure:f.interpret}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'David',isGuest:true}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
const cfg={model:'flat_stops',ratePerStop:2.08,excessParcelRate:.05,contractorFeePercent:6};
beforeEach(()=>{f.interpret.mockReset();f.confirm.mockReset();f.confirm.mockResolvedValue();f.data={logs:[],paymentConfig:cfg,hasSavedPayStructure:true,payStructureVersions:[],payHistoryLoading:false,payHistoryError:'',updateLogs:vi.fn(),loading:false};});
const mount=()=>render(<PayStructureAISetup onConfirm={f.confirm}/>);
describe('Pay setup',()=>{
 it('calculates the approved example in deterministic code and rejects missing rates',()=>{
  expect(payExample(cfg)).toMatchObject({gross:251.5,fee:15.09,after:236.41});
  expect(validatePaySetup(blankPay('flat_stops'))).toMatch(/Enter a valid rate/);
 });
 it('asks a follow-up and never saves the AI response without an edited confirmation',async()=>{
  f.interpret.mockResolvedValueOnce({questions:['Quanto é a taxa da franquia?'],config:null}).mockResolvedValueOnce({questions:[],config:cfg});mount();
  fireEvent.change(screen.getByLabelText('Pay description'),{target:{value:'Recebo £2.08 por paragem'}});
  fireEvent.click(screen.getByRole('button',{name:'Prepare my pay structure'}));
  await screen.findByText('Quanto é a taxa da franquia?');expect(f.confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Your answer'),{target:{value:'6 por cento e 5p por pacote extra'}});
  fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  await screen.findByText('Review your pay structure');expect(f.confirm).not.toHaveBeenCalled();
  expect(screen.getByText('£236.41')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Rate per stop (£)'),{target:{value:'2.10'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm pay structure'}));
  await waitFor(()=>expect(f.confirm).toHaveBeenCalledWith(expect.objectContaining({ratePerStop:2.1,contractorFeePercent:6})));
 });
 it('preserves a manual draft if saving fails',async()=>{
  f.confirm.mockRejectedValue(new Error('offline'));mount();fireEvent.click(screen.getByRole('button',{name:'Set up manually · Free'}));
  fireEvent.change(screen.getByLabelText('Rate per stop (£)'),{target:{value:'2.08'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm pay structure'}));
  await screen.findByText(/Could not save/);expect(screen.getByLabelText('Rate per stop (£)')).toHaveValue('2.08');
 });
 it('does not allow old rates to be silently applied to a missed-day entry',()=>{
  f.data.payStructureVersions=[{id:'old',savedAt:'2026-09-01T00:00:00Z',config:{...cfg,ratePerStop:1.95}}];
  render(<DailyQuickEntry open initialDate="2026-09-01" onClose={vi.fn()} onSaved={vi.fn()}/>);
  expect(screen.getByText('Which rates applied that day?')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Save entry'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Pay structure'),{target:{value:'old'}});
  fireEvent.click(screen.getByRole('button',{name:'Use these rates'}));
  expect(screen.getByText('How many stops did you do today?')).toBeInTheDocument();
 });
});

describe('Onboarding persistence',()=>{
 it('shows the completion screen only after the reviewed settings persist',async()=>{
  const PayOnboarding=(await import('../components/PayOnboarding')).default;
  let resolve; const persist=vi.fn(()=>new Promise(r=>{resolve=r;}));
  render(<PayOnboarding onComplete={persist} onStart={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Set up manually · Free'}));
  fireEvent.change(screen.getByLabelText('Rate per stop (£)'),{target:{value:'2.08'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm pay structure'}));
  await waitFor(()=>expect(persist).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/You're all set/)).not.toBeInTheDocument();
  resolve({...cfg,versionId:'saved'});
  await screen.findByText(/You're all set/);
 });
});
