import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimpleDashboard from '../components/SimpleDashboard';
import { isoDate } from '../features/payperiod/periods';
const fixture = vi.hoisted(() => ({ data: {}, costs: {} }));
vi.mock('../contexts/DataContext', () => ({ useData: () => fixture.data }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({user:{uid:'test',displayName:'David',isGuest:true}}) }));
vi.mock('../hooks/useExpenses', () => ({ default: () => fixture.costs }));
vi.mock('../services/productAnalytics', () => ({ trackProductEvent: vi.fn() }));
vi.mock('../components/DailyQuickEntry', () => ({default: () => null}));
const today=isoDate(new Date());
beforeEach(() => {
  localStorage.clear();
  fixture.data={ logs:[{date:today,total:281.5,stops:120,totalParcels:158,extra:30,payStructureSnapshot:{model:'flat_stops',ratePerStop:2.08,excessParcelRate:.05,contractorFeePercent:6}}],loading:false,isNewUser:true,payPeriodAnchor:'2026-09-14',periodRecords:{} };
  fixture.costs={expenses:[{date:today,amount:45.2,source:'my_expense'}],loading:false,error:'',retry:vi.fn()};
});
const mount=()=>render(<MemoryRouter><SimpleDashboard /></MemoryRouter>);
describe('Home states',()=>{
  it('shows the approved net and masks every money value including expanded details',()=>{
    mount(); expect(screen.getByText('£219.41')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'View calculation'}));
    fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
    expect(document.body.textContent).not.toMatch(/£\d/);
    expect(localStorage.getItem('home-hide-money')).toBe('1');
  });
  it('does not show an inflated estimate when expenses cannot load',()=>{
    fixture.costs.error='Expenses could not be loaded.';
    mount(); expect(screen.queryByText('£219.41')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Expenses could not be loaded.');
  });
  it('shows an honest empty ledger rather than a zero estimate',()=>{
    fixture.data.logs=[];mount();
    expect(screen.getByText('How many stops did you do today?')).toBeInTheDocument();
    expect(screen.queryByText('£0.00')).not.toBeInTheDocument();
  });
  it('prevents replacing unknown records following a load failure',()=>{
    fixture.data.loadError='Your saved work could not be loaded.';mount();
    expect(screen.getByRole('button',{name:'Quick Entry'})).toBeDisabled();
  });
});
