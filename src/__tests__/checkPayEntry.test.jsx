import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {webcrypto} from 'node:crypto';
import {getPeriodForDate} from '../features/payperiod/periods';
import {moneySummary,moneyRevision} from '../features/money/moneyModel';
import CheckPayV4 from '../components/CheckPayV4';
const f=vi.hoisted(()=>({data:{},costs:{},status:vi.fn(),extract:vi.fn(),save:vi.fn(),anchor:vi.fn()}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Driver Example'}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../hooks/useExpenses',()=>({default:()=>f.costs}));
vi.mock('../services/premium',()=>({getPremiumStatus:(...a)=>f.status(...a),extractStatement:(...a)=>f.extract(...a)}));
vi.stubGlobal('crypto',webcrypto);
const period={start:'2026-08-17',end:'2026-09-13'};
const open=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/check-pay',state:period}]}><CheckPayV4/></MemoryRouter>);
beforeEach(()=>{URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();vi.clearAllMocks();localStorage.clear();f.data={logs:[{date:period.start,total:100,payStructureSnapshot:{contractorFeePercent:6}}],payPeriodAnchor:period.start,periodRecords:{},updatePeriodRecord:f.save,updatePayPeriodAnchor:f.anchor};f.costs={expenses:[{date:period.start,amount:10,source:'my_expense'}],loading:false};f.status.mockResolvedValue({isPro:false,statementAiUses:1});});
describe('Check Pay entry',()=>{
 it('shows payout before own expenses, free manual first, and server trial count',async()=>{open();expect(screen.getByText('£94.00')).toBeInTheDocument();expect(screen.queryByText('£84.00')).not.toBeInTheDocument();await screen.findByText('2 free AI checks left');expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();});
 it('shows the approved Pay hierarchy, with a single expected payout above two equal actions',async()=>{
   open();
   const page=document.querySelector('.check-pay-page');
   const amount=page.querySelector('.check-period');
   const actions=page.querySelector('.check-actions');
   const history=page.querySelector('.check-history-link');
   expect(amount).toBeTruthy();
   expect(actions.querySelectorAll('.check-action')).toHaveLength(2);
   expect(amount.compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
   expect(actions.compareDocumentPosition(history)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
   expect(screen.getByRole('heading',{name:'Check your statement'})).toBeInTheDocument();
   expect(screen.getByLabelText('Check Pay period')).toBeInTheDocument();
   expect(page.querySelectorAll('.check-expected strong')).toHaveLength(1);
   expect(screen.getByRole('link',{name:/See previous pay periods/})).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   await screen.findByText('2 free AI checks left');
 });
 it('keeps the comparison action available on an AI-status failure and explains the retry',async()=>{
   f.status.mockRejectedValue(Object.assign(new Error('permission denied'),{code:'functions/permission-denied'}));
   open();
   await screen.findByText('AI access could not be verified');
   expect(screen.getByText(/account could not access the AI status service/)).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   expect(screen.queryByLabelText('Choose statement file')).not.toBeInTheDocument();
   f.status.mockResolvedValue({isPro:true,statementAiUses:3});
   fireEvent.click(screen.getByRole('button',{name:'Retry AI availability'}));
   await screen.findByText('Included with Pro');
   expect(screen.getByLabelText('Choose statement file')).toBeEnabled();
 });
 it('does not invent trial counts when status fails and leaves manual free',async()=>{f.status.mockRejectedValue(new Error('offline'));open();await screen.findByRole('button',{name:'Retry AI availability'});expect(screen.queryByText(/3 free AI checks left/)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();});
 it('switches displayed period without changing pay setup',()=>{open();const select=screen.getByLabelText('Check Pay period');fireEvent.change(select,{target:{value:select.options[0].value}});expect(f.anchor).not.toHaveBeenCalled();});
 it('does not strand the driver when saved work lacks historical contractor-fee details',()=>{
  f.data.logs=[{id:'old-day',date:period.start,stops:120,totalParcels:158,total:281.1}];
  open();
  expect(screen.getByText('Pay details needed')).toBeInTheDocument();
  expect(screen.getByText(/1 work entry needs historical pay details/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/Review 1 workday/})).toHaveAttribute('href','/app/records?payReview=1');
  expect(screen.getByRole('link',{name:/Create invoice from statement/})).toHaveAttribute('href','/app/invoice');
  expect(screen.queryByRole('button',{name:'Enter manually'})).not.toBeInTheDocument();
  expect(document.querySelector('.check-value-incomplete')).toBeInTheDocument();
 });
 it('shows an empty state instead of a zero expected payout',()=>{f.data.logs=[];open();expect(screen.getByText('No work logged yet')).toBeInTheDocument();expect(screen.queryByText('£0.00')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Enter manually'})).toBeDisabled();});
 it('shows loading and errors without interim amounts',()=>{f.costs.loading=true;open();expect(screen.getByLabelText('Loading expected payout')).toBeInTheDocument();expect(screen.queryByText('£94.00')).not.toBeInTheDocument();});
 it('does not save on extraction or use gross earnings as payout',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:null,currency:'GBP'});open();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('');expect(f.save).not.toHaveBeenCalled();});

 it('a saved difference has one next step instead of duplicated AI and manual cards',async()=>{
   const current=getPeriodForDate(f.data.payPeriodAnchor,new Date());
   f.data.logs=[{date:current.start,total:100,payStructureSnapshot:{contractorFeePercent:6}}];
   const expected=moneySummary(f.data.logs,f.costs.expenses,current).payout;
   f.data.periodRecords[current.id]={status:'checked',needsReview:false,payoutComparison:{
     scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,
     start:current.start,end:current.end,statementPence:expected+1000,
     expectedPence:expected,revision:await moneyRevision(f.data.logs,f.costs.expenses,current)
   }};
   render(<MemoryRouter initialEntries={['/app/check-pay']}><CheckPayV4/></MemoryRouter>);
   await screen.findByRole('heading',{name:'Review the payout difference'});
   expect(screen.getByRole('button',{name:/Review saved comparison/})).toBeEnabled();
   expect(screen.queryByRole('heading',{name:'Check your statement'})).not.toBeInTheDocument();
   expect(screen.queryByText('AI access could not be verified')).not.toBeInTheDocument();
   expect(screen.queryByLabelText('Previous comparison')).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:/Check a different statement/}));
   expect(screen.getByRole('heading',{name:'Check your statement'})).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   fireEvent.click(screen.getByRole('button',{name:/Hide new comparison options/}));
   expect(screen.queryByRole('heading',{name:'Check your statement'})).not.toBeInTheDocument();
 });
 it('provides one-tap access to the last completed four-week period',async()=>{
   const current=getPeriodForDate(f.data.payPeriodAnchor,new Date());
   const previousDate=new Date(current.start+'T12:00:00');
   previousDate.setDate(previousDate.getDate()-1);
   const previous=getPeriodForDate(f.data.payPeriodAnchor,previousDate);
   f.data.logs=[
     {date:current.start,total:100,payStructureSnapshot:{contractorFeePercent:6}},
     {date:previous.start,total:120,payStructureSnapshot:{contractorFeePercent:6}}
   ];
   render(<MemoryRouter initialEntries={['/app/check-pay']}><CheckPayV4/></MemoryRouter>);
   const shortcut=await screen.findByRole('button',{name:/Last completed period/});
   expect(shortcut).toHaveTextContent(previous.start.slice(8));
   fireEvent.click(shortcut);
   expect(screen.getByText('£112.80')).toBeInTheDocument();
 });
 it('does not label foreign extracted money as GBP',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:94,currency:'EUR'});open();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('');expect(screen.getByLabelText('Gross work earnings (£)')).toHaveValue('');});
 it('requires explicit confirmation after preview before saving',async()=>{open();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'90'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));expect(f.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm and save check'}));await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));expect(f.save.mock.calls[0][1].payoutComparison.expectedPence).toBe(9400);});
 it('reviews an AI draft before saving, then preserves its verified structured fields',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:94,contractorFee:6,contractorCharges:0,currency:'GBP',taxBasis:'excluded',periodStart:period.start,periodEnd:period.end});open();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(f.save).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Continue to comparison'})).toBeDisabled();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Continue to comparison'}));expect(f.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Looks good — save and prepare invoice'}));await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));expect(f.save.mock.calls[0][1].reviewedStatement).toMatchObject({payoutPence:9400,taxBasis:'excluded',reviewed:true});expect(f.extract).toHaveBeenCalledTimes(1);});
 it('reopens reviewed statement fields without another extraction',async()=>{f.data.periodRecords[period.start+'_'+period.end]={status:'checked',reviewedStatement:{start:period.start,end:period.end,currency:'GBP',taxBasis:'excluded',payoutPence:9400,grossPence:10000,feePence:600,chargesPence:0,charges:[],reviewed:true}};open();fireEvent.click(screen.getByRole('button',{name:'Review saved check'}));expect(screen.getByText('Review statement')).toBeInTheDocument();expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('94');expect(f.extract).not.toHaveBeenCalled();});

 it('blocks saving an outdated comparison when records change',()=>{const view=open();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'90'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));f.data.logs=[{...f.data.logs[0],total:110}];view.rerender(<MemoryRouter initialEntries={[{pathname:'/app/check-pay',state:period}]}><CheckPayV4/></MemoryRouter>);expect(screen.getByRole('button',{name:'Confirm and save check'})).toBeDisabled();expect(screen.getByText(/Records changed since this preview/)).toBeInTheDocument();expect(f.save).not.toHaveBeenCalled();});

});
