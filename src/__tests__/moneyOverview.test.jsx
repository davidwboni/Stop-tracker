import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import MoneyOverview from '../components/MoneyOverview';
import CheckPayV4 from '../components/CheckPayV4';
import {moneySummary,payoutComparison,moneyRevision} from '../features/money/moneyModel';
import {webcrypto} from 'node:crypto';
const f=vi.hoisted(()=>({data:{},costs:{},save:vi.fn()}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Driver',isGuest:true}})}));
vi.mock('../hooks/useExpenses',()=>({default:()=>f.costs}));
vi.mock('../services/premium',()=>({getPremiumStatus:vi.fn(async()=>({})),extractStatement:vi.fn()}));
vi.mock('../components/ui/money',()=>({Money:({amount})=><span>{amount}</span>}));
vi.stubGlobal('crypto',webcrypto);
const period={start:'2026-08-17',end:'2026-09-13',id:'2026-08-17_2026-09-13'};
const logs=[{id:'day',date:'2026-08-17',stops:120,total:5499.55,payStructureSnapshot:{contractorFeePercent:6}}];
const expenses=[{id:'charge',date:'2026-08-17',amount:905.46,source:'contractor_charge'},{id:'own',date:'2026-08-17',amount:516.49,source:'my_expense'}];
const summary=()=>moneySummary(logs,expenses,period);
const checked=revision=>({status:'checked',payoutComparison:{scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,start:period.start,end:period.end,expectedPence:426412,statementPence:421769,revision}});
beforeEach(()=>{localStorage.clear();f.save.mockReset();f.save.mockResolvedValue(true);f.data={logs,periodRecords:{},payPeriodAnchor:period.start,loading:false,forceSync:vi.fn(),updatePeriodRecord:f.save};f.costs={expenses,rules:[],loading:false,error:'',retry:vi.fn()};});
const mount=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/money',state:period}]}><MoneyOverview/></MemoryRouter>);
describe('Money calculation and comparison',()=>{
 it('separates contractor payout from business take-home using pennies',()=>{expect(summary()).toMatchObject({gross:549955,fee:32997,payout:426412,takeHome:374763});});
 it('does not apply current rates to legacy work without fee snapshots',()=>{expect(moneySummary([{...logs[0],payStructureSnapshot:null}],expenses,period)).toMatchObject({gross:549955,fee:null,payout:null,takeHome:null});});
 it('does not treat legacy gross checks as confirmed payouts',()=>{expect(payoutComparison({status:'reconciled',statementAmount:3701.2},period,summary(),'rev').state).toBe('incomplete');});
 it('rejects mismatched period, currency or tax basis',()=>{for(const change of [{currency:'EUR'},{taxBasis:'unknown'},{start:'2026-08-18'}]){const record=checked('rev');Object.assign(record.payoutComparison,change);expect(payoutComparison(record,period,summary(),'rev').state).toBe('incomplete');}});
 it('flags changed records and does not equate a match with reconciliation',()=>{expect(payoutComparison(checked('old'),period,summary(),'new').state).toBe('stale');const r=checked('rev');r.payoutComparison.statementPence=426412;expect(payoutComparison(r,period,summary(),'rev').state).toBe('matched');});
 it('revision is order-independent and changes when expenses change',async()=>{const a=await moneyRevision(logs,expenses,period);expect(await moneyRevision(logs,[...expenses].reverse(),period)).toBe(a);expect(await moneyRevision(logs,[{...expenses[0],amount:906},expenses[1]],period)).not.toBe(a);});
});
describe('Money screen',()=>{
 it('shows the like-for-like difference and masks all financial values',async()=>{f.data.periodRecords[period.id]=checked(await moneyRevision(logs,expenses,period));mount();await screen.findByText('Statement is £46.43 lower');expect(screen.getByText('£3,747.63')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));expect(document.body.textContent).not.toMatch(/£\d/);});
 it('does not show zero take-home or a difference when expenses fail to load',()=>{f.costs.error='Expenses unavailable';mount();expect(screen.queryByText('£3,747.63')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Check pay'})).toBeDisabled();});
 it('shows loading placeholders instead of interim zero amounts',()=>{f.data.loading=true;mount();expect(screen.getByLabelText('Loading money records')).toBeInTheDocument();expect(document.body.textContent).not.toMatch(/£\d/);});
});
describe('Money to Check Pay integration',()=>{
 const open=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/check-pay',state:{...period,comparisonScope:'contractor_payout'}}]}><CheckPayV4/></MemoryRouter>);
 it('requires basis confirmation and saves a checked payout without auto-reconciliation',async()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'4217.69'}});
  expect(screen.getByRole('button',{name:'Compare with my records'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));fireEvent.click(screen.getByRole('button',{name:'Confirm and save check'}));
  await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));
  expect(f.save.mock.calls[0]).toEqual([period.id,expect.objectContaining({status:'checked',payoutComparison:expect.objectContaining({statementPence:421769,expectedPence:426412,scope:'contractor_payout'})}),true]);
  await screen.findByText('Difference found');
 });
 it('retains the form when saving the check fails',async()=>{f.save.mockRejectedValue(new Error('offline'));open();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'4217.69'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));fireEvent.click(screen.getByRole('button',{name:'Confirm and save check'}));await screen.findByText(/Could not save this check/);expect(screen.getByText('Comparison preview · Not saved')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Edit statement figures'}));expect(screen.getByLabelText('Statement contractor payout (£)')).toHaveValue('4217.69');});
});
