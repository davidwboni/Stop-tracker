import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {webcrypto} from 'node:crypto';
import {getPeriodForDate} from '../features/payperiod/periods';
import {moneySummary,moneyRevision} from '../features/money/moneyModel';
import CheckPayV4 from '../components/CheckPayV4';
const f=vi.hoisted(()=>({data:{},costs:{},status:vi.fn(),extract:vi.fn(),save:vi.fn(),anchor:vi.fn(),update:vi.fn()}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Driver Example'}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../hooks/useExpenses',()=>({default:()=>f.costs}));
vi.mock('../services/premium',()=>({getPremiumStatus:(...a)=>f.status(...a),extractStatement:(...a)=>f.extract(...a)}));
vi.stubGlobal('crypto',webcrypto);
const period={start:'2026-08-17',end:'2026-09-13'};
const open=()=>render(<MemoryRouter initialEntries={[{pathname:'/app/check-pay',state:period}]}><CheckPayV4/></MemoryRouter>);
const choose=()=>{const view=open();fireEvent.click(screen.getByRole('button',{name:'Check statement'}));return view;};
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();vi.clearAllMocks();localStorage.clear();f.data={logs:[{date:period.start,total:100,payStructureSnapshot:{contractorFeePercent:6}}],payPeriodAnchor:period.start,periodRecords:{},updatePeriodRecord:f.save,updatePayPeriodAnchor:f.anchor,updateLogs:f.update,paymentConfig:{model:'flat_stops',ratePerStop:2.08,contractorFeePercent:6}};f.costs={expenses:[{date:period.start,amount:10,source:'my_expense'}],loading:false};f.status.mockResolvedValue({isPro:false,statementAiUses:1});});
describe('Check Pay entry',()=>{
 it('shows payout before own expenses, free manual first, and server trial count',async()=>{choose();expect(screen.getByText('£94.00')).toBeInTheDocument();expect(screen.queryByText('£84.00')).not.toBeInTheDocument();await screen.findByText('2 free AI checks left');expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();});
 it('keeps Pay focused on two tasks rather than exposing both comparison methods immediately',async()=>{
   open();
   const page=document.querySelector('.check-pay-page');
   const amount=page.querySelector('.check-period');
   const actions=page.querySelector('.check-simple-actions');
   expect(amount).toBeTruthy();
   expect(actions).toBeTruthy();
   expect(amount.compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
   expect(screen.getByRole('link',{name:'Create invoice'})).toHaveAttribute('href','/app/invoice');
   expect(screen.getByRole('button',{name:'Check statement'})).toBeEnabled();
   expect(screen.queryByRole('button',{name:'Enter manually'})).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Check statement'}));
   expect(screen.getByRole('heading',{name:'Check your statement'})).toBeInTheDocument();
   expect(page.querySelectorAll('.check-action')).toHaveLength(2);
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   await screen.findByText('2 free AI checks left');
 });
 it('unlocks statement AI for a free beta account even when three previous trials are used',async()=>{
   f.status.mockResolvedValue({isPro:false,betaAccess:true,statementAiUses:3,routeOptimizationUses:3});
   choose();
   await screen.findByText(/Free during testing · up to 8 a day/);
   expect(screen.getByLabelText('Choose statement file')).toBeEnabled();
   expect(screen.queryByRole('button',{name:'View Pro'})).not.toBeInTheDocument();
 });
 it('keeps the comparison action available on an AI-status failure and explains the retry',async()=>{
   f.status.mockRejectedValue(Object.assign(new Error('permission denied'),{code:'functions/permission-denied'}));
   choose();
   await screen.findByText('AI access could not be verified');
   expect(screen.getByText(/AI access failed/)).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   expect(screen.queryByLabelText('Choose statement file')).not.toBeInTheDocument();
   f.status.mockResolvedValue({isPro:true,statementAiUses:3});
   fireEvent.click(screen.getByRole('button',{name:'Retry AI availability'}));
   await screen.findByText('Included with Pro');
   expect(screen.getByLabelText('Choose statement file')).toBeEnabled();
 });
 it('does not invent trial counts when status fails and leaves manual free',async()=>{f.status.mockRejectedValue(new Error('offline'));choose();await screen.findByRole('button',{name:'Retry AI availability'});expect(screen.queryByText(/3 free AI checks left/)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();});
 it('switches displayed period without changing pay setup',()=>{open();const select=screen.getByLabelText('Check Pay period');fireEvent.change(select,{target:{value:select.options[0].value}});expect(f.anchor).not.toHaveBeenCalled();});
 it('allows saving a contractor statement without missing historical pay rates or a false comparison',async()=>{
   f.data.logs=[{id:'old-day',date:period.start,stops:120,totalParcels:158,total:281.1}];
   choose();
   expect(screen.getByText('Not available yet')).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Enter manually'})).toBeEnabled();
   fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));
   fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'200.00'}});
   fireEvent.click(screen.getByRole('checkbox'));
   expect(screen.queryByRole('button',{name:'Compare with my records'})).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Save statement for later comparison'}));
   await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));
   expect(f.save.mock.calls[0][1]).toMatchObject({status:'statement_received',needsReview:false,statementAmount:200,reviewedStatement:null});
   expect(f.save.mock.calls[0][1]).not.toHaveProperty('payoutComparison');
   expect(screen.getByText('Statement saved')).toBeInTheDocument();
   expect(screen.getByRole('link',{name:'Create invoice'})).toHaveAttribute('href','/app/invoice');
 });

 it('restores a logged period with one confirmed historical fee action without rewriting its gross totals',async()=>{
   const entries=[
     {id:'first',date:period.start,stops:120,totalParcels:158,total:281.10},
     {id:'second',date:'2026-08-18',stops:105,total:209.80},
     {id:'third',date:'2026-08-19',stops:115,total:237.10,payStructureSnapshot:{contractorFeePercent:6}},
   ];
   f.data.logs=entries;
   f.update.mockResolvedValue({success:true});
   open();
   expect(screen.getByText('Not available yet')).toBeInTheDocument();
   expect(screen.getByRole('button',{name:'Confirm missing fee'})).toBeEnabled();
   fireEvent.click(screen.getByRole('button',{name:'Confirm missing fee'}));
   expect(screen.getByRole('heading',{name:'Confirm contractor fee'})).toBeInTheDocument();
   expect(screen.getByLabelText('Historical contractor fee percentage')).toHaveValue('6');
   expect(screen.getByRole('button',{name:'Apply to 2 saved days'})).toBeDisabled();
   fireEvent.click(screen.getByRole('checkbox'));
   fireEvent.click(screen.getByRole('button',{name:'Apply to 2 saved days'}));
   await waitFor(()=>expect(f.update).toHaveBeenCalledTimes(1));
   const changed=f.update.mock.calls[0][0];
   expect(changed).toHaveLength(3);
   expect(changed[0]).toMatchObject({stops:120,totalParcels:158,total:281.10,historicalFeeConfirmation:{percent:6}});
   expect(changed[1].total).toBe(209.80);
   expect(changed[2]).toBe(entries[2]);
   expect(f.save).not.toHaveBeenCalled();
 });
 it('does not silently apply today\'s fee or confirm blank historical values',()=>{
   f.data.logs=[{id:'legacy',date:period.start,stops:120,total:281.10}];
   f.data.paymentConfig={model:'flat_stops',ratePerStop:2.08};
   open();
   fireEvent.click(screen.getByRole('button',{name:'Confirm missing fee'}));
   expect(screen.getByLabelText('Historical contractor fee percentage')).toHaveValue('');
   fireEvent.click(screen.getByRole('checkbox'));
   expect(screen.getByRole('button',{name:'Apply to 1 saved day'})).toBeDisabled();
   fireEvent.click(screen.getByRole('button',{name:'Cancel — keep records unchanged'}));
   expect(f.update).not.toHaveBeenCalled();
 });
 it('hides the missing-rate explanation until requested, without blocking invoicing',()=>{
   f.data.logs=[{id:'old-day',date:period.start,total:281.1,stops:120}];
   open();
   expect(screen.getByRole('link',{name:'Create invoice'})).toHaveAttribute('href','/app/invoice');
   expect(screen.getByRole('button',{name:'Check statement'})).toBeEnabled();
   expect(screen.getByText('Why is the estimate unavailable?')).toBeInTheDocument();
   expect(screen.queryByRole('link',{name:/Review those days/})).not.toBeVisible();
   fireEvent.click(screen.getByText('Why is the estimate unavailable?'));
   expect(screen.getByRole('link',{name:/Review those days/})).toBeVisible();
 });
 it('shows an empty state instead of a zero expected payout',()=>{f.data.logs=[];open();expect(screen.getByText('No work logged yet')).toBeInTheDocument();expect(screen.queryByText('£0.00')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Check statement'})).toBeEnabled();});
 it('shows loading and errors without interim amounts',()=>{f.costs.loading=true;open();expect(screen.getByLabelText('Loading expected payout')).toBeInTheDocument();expect(screen.queryByText('£94.00')).not.toBeInTheDocument();});
 it('does not save on extraction or use gross earnings as payout',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:null,currency:'GBP'});choose();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('');expect(f.save).not.toHaveBeenCalled();});

 it('offers one clear action when the checked statement payout differs',async()=>{
   const current=getPeriodForDate(f.data.payPeriodAnchor,new Date());
   f.data.logs=[{date:current.start,total:100,payStructureSnapshot:{contractorFeePercent:6}}];
   const expected=moneySummary(f.data.logs,f.costs.expenses,current).payout;
   f.data.periodRecords[current.id]={status:'checked',needsReview:false,payoutComparison:{
     scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,
     start:current.start,end:current.end,statementPence:expected+1000,
     expectedPence:expected,revision:await moneyRevision(f.data.logs,f.costs.expenses,current)
   }};
   render(<MemoryRouter initialEntries={['/app/check-pay']}><CheckPayV4/></MemoryRouter>);
   expect(await screen.findByRole('button',{name:/Review payout difference/})).toBeEnabled();
   expect(screen.queryByRole('button',{name:'Enter manually'})).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:/Review payout difference/}));
   expect(screen.getByRole('heading',{name:'Compare statement'})).toBeInTheDocument();
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
 it('does not label foreign extracted money as GBP',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:94,currency:'EUR'});choose();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('');expect(screen.getByLabelText('Gross work earnings (£)')).toHaveValue('');});
 it('requires explicit confirmation after preview before saving',async()=>{choose();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'90'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));expect(f.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm and save check'}));await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));expect(f.save.mock.calls[0][1].payoutComparison.expectedPence).toBe(9400);});
 it('reviews an AI draft before saving, then preserves its verified structured fields',async()=>{f.extract.mockResolvedValue({statementAmount:100,contractorPayout:94,contractorFee:6,contractorCharges:0,currency:'GBP',taxBasis:'excluded',periodStart:period.start,periodEnd:period.end});choose();await screen.findByText('2 free AI checks left');fireEvent.change(screen.getByLabelText('Choose statement file'),{target:{files:[new File(['image'],'statement.png',{type:'image/png'})]}});fireEvent.click(screen.getByRole('button',{name:'Read statement with AI'}));await screen.findByText('Review statement');expect(f.save).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Continue to comparison'})).toBeDisabled();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Continue to comparison'}));expect(f.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Looks good — save and prepare invoice'}));await waitFor(()=>expect(f.save).toHaveBeenCalledTimes(1));expect(f.save.mock.calls[0][1].reviewedStatement).toMatchObject({payoutPence:9400,taxBasis:'excluded',reviewed:true});expect(f.extract).toHaveBeenCalledTimes(1);});
 it('reopens reviewed statement fields without another extraction',async()=>{f.data.periodRecords[period.start+'_'+period.end]={status:'checked',reviewedStatement:{start:period.start,end:period.end,currency:'GBP',taxBasis:'excluded',payoutPence:9400,grossPence:10000,feePence:600,chargesPence:0,charges:[],reviewed:true}};open();fireEvent.click(screen.getByRole('button',{name:'Review previous statement'}));expect(screen.getByText('Review statement')).toBeInTheDocument();expect(screen.getByLabelText('Final contractor payout (£)')).toHaveValue('94');expect(f.extract).not.toHaveBeenCalled();});

 it('blocks saving an outdated comparison when records change',()=>{const view=choose();fireEvent.click(screen.getByRole('button',{name:'Enter manually'}));fireEvent.change(screen.getByLabelText('Statement contractor payout (£)'),{target:{value:'90'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Compare with my records'}));f.data.logs=[{...f.data.logs[0],total:110}];view.rerender(<MemoryRouter initialEntries={[{pathname:'/app/check-pay',state:period}]}><CheckPayV4/></MemoryRouter>);expect(screen.getByRole('button',{name:'Confirm and save check'})).toBeDisabled();expect(screen.getByText(/Records changed since this preview/)).toBeInTheDocument();expect(f.save).not.toHaveBeenCalled();});

});
