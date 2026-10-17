import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import SimpleDashboard from '../components/SimpleDashboard';
import {isoDate} from '../features/payperiod/periods';
const fixture=vi.hoisted(()=>({data:{},costs:{}}));
vi.mock('../contexts/DataContext',()=>({useData:()=>fixture.data}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'David',isGuest:true}})}));
vi.mock('../hooks/useExpenses',()=>({default:()=>fixture.costs}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.mock('../components/DailyQuickEntry',()=>({default:()=>null}));
vi.mock('../components/DayRecordSheet',()=>({default:()=>null}));
vi.mock('../components/HomeExpenseDialog',()=>({default:()=>null}));
const today=isoDate(new Date());
beforeEach(()=>{
 localStorage.clear();
 fixture.data={logs:[{date:today,total:281.5,stops:120,totalParcels:158,extra:30,payStructureSnapshot:{model:'flat_stops',ratePerStop:2.08,excessParcelRate:.05,contractorFeePercent:6}}],loading:false,isNewUser:true,payPeriodAnchor:'2026-09-14',periodRecords:{},updateLogs:vi.fn()};
 fixture.costs={expenses:[{date:today,amount:45.2,source:'my_expense'}],loading:false,error:'',retry:vi.fn()};
});
const mount=()=>render(<MemoryRouter><SimpleDashboard/></MemoryRouter>);
describe('Approved earnings-first Home',()=>{
 it('puts today earnings and expected contractor payout up front and retains detailed cost calculation',()=>{
  mount();
  expect(screen.getByRole('heading',{name:'Today'})).toBeInTheDocument();
  expect(screen.getAllByText('£264.61').length).toBeGreaterThan(0);
  expect(screen.getByText('Expected contractor payout')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/View calculation/i}));
  expect(screen.getByText('£219.41')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
  expect(document.body.textContent).not.toMatch(/£\\d/);
  expect(localStorage.getItem('home-hide-money')).toBe('1');
 });
 it('does not present recorded business expenses as contractor payout deductions',()=>{
  mount();
  expect(screen.getByText('Expected contractor payout')).toBeInTheDocument();
  expect(screen.getAllByText('£264.61').length).toBeGreaterThan(0);
  expect(screen.queryByText('£219.41')).not.toBeInTheDocument();
 });
 it('shows a clear error rather than a confident payout if expenses cannot load',()=>{
  fixture.costs.error='Expenses could not be loaded.';
  mount();
  expect(screen.queryByText('£219.41')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Expenses are temporarily unavailable');
 });
 it('has a clear log action and no invented £0.00 for a new user',()=>{
  fixture.data.logs=[];mount();
  expect(screen.getByText('Ready to record today’s work?')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/Log your day/})).toHaveLength(1);
  expect(screen.queryByText('£0.00')).not.toBeInTheDocument();
 });
 it('keeps the compact sections and does not duplicate footer shortcuts',()=>{
  fixture.data.logs=[];mount();
  const home=document.querySelector('.customer-home-grid');
  const today=home.querySelector('.customer-today');
  const period=home.querySelector('.customer-period');
  const recent=home.querySelector('.customer-recent');
  expect([today,period,recent].every(Boolean)).toBe(true);
  expect(today.compareDocumentPosition(period)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(period.compareDocumentPosition(recent)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(today).toHaveTextContent('Not logged yet');
  expect(screen.getAllByRole('button',{name:/Log your day/})).toHaveLength(1);
  expect(home.querySelector('.customer-tools')).toBeNull();
  expect(screen.queryByRole('button',{name:/Expenses/})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Routes/})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:/See all/})).toBeInTheDocument();
 });
 it('shows saved work with a primary review action rather than asking to log again',()=>{
  mount();
  const today=document.querySelector('.customer-today');
  expect(today).toHaveTextContent('Saved');
  expect(today.querySelector('[data-tour="log-work"]')).toHaveTextContent("View today's record");
  expect(screen.queryByRole('button',{name:/Log your day/})).not.toBeInTheDocument();
 });
 it('prevents replacing unknown records following a load failure',()=>{
  fixture.data.loadError='Your saved work could not be loaded.';mount();
  expect(screen.getByRole('button',{name:/Retry loading records/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Log your day/})).not.toBeInTheDocument();
 });
});
