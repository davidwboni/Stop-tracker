import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {webcrypto} from 'node:crypto';
import InvoicePage from '../components/InvoicePage';
import {moneyRevision,moneySummary} from '../features/money/moneyModel';
const f=vi.hoisted(()=>({data:{},expenses:{},invoice:{}}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../contexts/InvoiceContext',()=>({useInvoice:()=>f.invoice}));
vi.mock('../hooks/useExpenses',()=>({default:()=>f.expenses}));
vi.mock('../components/InvoiceCreate',()=>({default:({prefill})=><div><h2>InvoiceCreate</h2><p data-testid="prefill-total">{prefill.statementAmount??'unverified'}</p><p data-testid="prefill-period">{prefill.periodId}</p></div>}));
vi.stubGlobal('crypto',webcrypto);
const period={id:'2026-08-17_2026-09-13',start:'2026-08-17',end:'2026-09-13'};
const logs=[{id:'day',date:period.start,total:100,stops:50,payStructureSnapshot:{contractorFeePercent:6}}];
const expenses=[];
const mount=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/invoice',state:{fromPay:true,periodId:period.id}}]}><InvoicePage/></MemoryRouter>);
async function checked(overrides={}){
  return {status:'checked',needsReview:false,payoutComparison:{
    scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,
    start:period.start,end:period.end,statementPence:9400,
    expectedPence:moneySummary(logs,expenses,period).payout,revision:await moneyRevision(logs,expenses,period),...overrides
  }};
}
beforeEach(()=>{f.data={logs,payPeriodAnchor:period.start,periodRecords:{},loading:false,loadError:''};f.expenses={expenses,loading:false,error:''};f.invoice={loading:false,loadError:'',invoices:[],retry:vi.fn()};});
describe('Pay → Invoice handoff',()=>{
 it('prepares invoice from checked contractor payout, not gross earnings',async()=>{
  f.data.periodRecords[period.id]=await checked();mount();
  await screen.findByText('InvoiceCreate');
  expect(screen.getByTestId('prefill-total')).toHaveTextContent('94.00');
  expect(screen.getByTestId('prefill-period')).toHaveTextContent(period.id);
 });
 it('blocks an unresolved discrepancy from invoicing',async()=>{
  f.data.periodRecords[period.id]=await checked({statementPence:9300});mount();
  await screen.findByText('Check your statement first');
  expect(screen.queryByText('InvoiceCreate')).not.toBeInTheDocument();
  expect(screen.getByText(/difference needs reviewing/)).toBeInTheDocument();
 });
 it('allows an explicitly reconciled difference',async()=>{
  f.data.periodRecords[period.id]={...await checked({statementPence:9300}),status:'reconciled',resolvedAt:'2026-09-20'};mount();
  await screen.findByText('InvoiceCreate');
  expect(screen.getByTestId('prefill-total')).toHaveTextContent('93.00');
 });
 it('rejects changed work or an invalid saved comparison fingerprint',async()=>{
  f.data.periodRecords[period.id]=await checked({revision:'outdated'});mount();
  await screen.findByText('Check your statement first');
  expect(screen.queryByText('InvoiceCreate')).not.toBeInTheDocument();
 });
 it('prevents accidentally issuing a second invoice for the same period',async()=>{
  f.data.periodRecords[period.id]=await checked();
  f.invoice.invoices=[{id:'sent',invoiceNumber:7,periodId:period.id}];mount();
  await screen.findByText('Invoice already prepared for this period');
  expect(screen.getByText('Invoice INV-0007')).toBeInTheDocument();
  expect(screen.queryByText('InvoiceCreate')).not.toBeInTheDocument();
 });
 it('requires checked records even if link state asks to prepare',async()=>{
  mount();await screen.findByText('Check your statement first');
  expect(screen.queryByText('InvoiceCreate')).not.toBeInTheDocument();
 });
});
