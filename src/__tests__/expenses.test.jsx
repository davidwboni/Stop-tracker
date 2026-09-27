import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expenseSummary, recurringOccurrences, splitExpenseRecords } from '../features/expenses/expenseModel';
import ExpensesOverview from '../components/ExpensesOverview';
const fixture=vi.hoisted(()=>({costs:{}}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'David',isGuest:true}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>({logs:[],payPeriodAnchor:'2026-09-14',periodRecords:{}})}));
vi.mock('../hooks/useExpenses',()=>({default:()=>fixture.costs}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
const period={start:'2026-09-14',end:'2026-10-11'};
const expenses=[
{id:'fuel',date:'2026-09-26',amount:91.94,source:'contractor_charge',category:'Fuel'},
{id:'shell',date:'2026-09-26',amount:45.20,source:'my_expense',description:'Shell petrol'},
{id:'lease',date:'2026-09-14',amount:487.77,source:'contractor_charge',category:'Lease'},
{id:'insurance',date:'2026-09-14',amount:295.69,source:'contractor_charge',category:'Insurance'}];
const rule={id:'mobile',kind:'recurring_rule',active:true,amount:25,source:'contractor_charge',category:'Mobile rental',nextDate:'2026-10-05',frequency:'four_weekly'};
beforeEach(()=>{localStorage.clear();fixture.costs={expenses,rules:[rule],loading:false,error:'',save:vi.fn(),retry:vi.fn()};});
const mount=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/money/expenses',state:period}]}><ExpensesOverview/></MemoryRouter>);
describe('Expense accounting',()=>{
 it('keeps sources separate and excludes expected costs from recorded totals',()=>{
  const split=splitExpenseRecords([...expenses,rule]);
  expect(expenseSummary(split.expenses,period)).toMatchObject({total:920.6,contractor:875.4,own:45.2});
  expect(recurringOccurrences(split.rules,split.expenses,period)).toHaveLength(1);
 });
 it('matches a recorded occurrence without creating another expected copy',()=>{
  const [occurrence]=recurringOccurrences([rule],expenses,period);
  expect(recurringOccurrences([rule],[...expenses,occurrence],period)).toHaveLength(0);
  expect(occurrence.id).toBe(recurringOccurrences([rule],expenses,period)[0].id);
 });
 it('does not match unrelated fuel costs just because amounts match',()=>{
  expect(recurringOccurrences([rule],[{...expenses[0],date:'2026-10-05',amount:25}],period)).toHaveLength(1);
 });
 it('clamps monthly dates without drifting after a short month',()=>{
  const rows=recurringOccurrences([{...rule,nextDate:'2026-01-31',frequency:'monthly'}],[],{start:'2026-01-01',end:'2026-03-31'});
  expect(rows.map(e=>e.date)).toEqual(['2026-01-31','2026-02-28','2026-03-31']);
 });
});
describe('Expenses overview',()=>{
 it('filters the list without altering the period total',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'My expenses'}));
  expect(screen.getByText('£920.60')).toBeInTheDocument();
  expect(screen.getByText('Shell petrol')).toBeInTheDocument();
  expect(screen.queryByText('Lease')).not.toBeInTheDocument();
 });
 it('masks amounts in records and expected costs',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
  expect(document.body.textContent).not.toMatch(/£\d/);
 });
 it('does not present a successful zero total on a failed load',()=>{
  fixture.costs={...fixture.costs,expenses:[],error:'Expenses could not be loaded.'};mount();
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Add expense'})).toBeDisabled();
 });
 it('asks for confirmation before deleting a record',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:/Shell petrol/}));
  fireEvent.click(screen.getByRole('button',{name:'Delete expense'}));
  expect(screen.getByRole('button',{name:'Confirm deletion'})).toBeInTheDocument();
 });
});
