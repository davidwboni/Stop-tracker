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
  expect(screen.getByText('£264.61')).toBeInTheDocument();
  expect(screen.getByText('Your expected contractor payout')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/View calculation/i}));
  expect(screen.getByText('£219.41')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
  expect(document.body.textContent).not.toMatch(/£\\d/);
  expect(localStorage.getItem('home-hide-money')).toBe('1');
 });
 it('does not present recorded business expenses as contractor payout deductions',()=>{
  mount();
  expect(screen.getByText('Your expected contractor payout')).toBeInTheDocument();
  expect(screen.getByText('£264.61')).toBeInTheDocument();
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
  expect(screen.getByText('Ready to log your day?')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Log your day/})).toBeInTheDocument();
  expect(screen.queryByText('£0.00')).not.toBeInTheDocument();
 });
 it('prevents replacing unknown records following a load failure',()=>{
  fixture.data.loadError='Your saved work could not be loaded.';mount();
  expect(screen.getByRole('button',{name:/Retry loading records/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Log your day/})).not.toBeInTheDocument();
 });
});
