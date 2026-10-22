import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {webcrypto} from 'node:crypto';
import CheckPayV5,{periodFromStatement} from '../components/CheckPayV5';
const stub=vi.hoisted(()=>({data:{},costs:{},status:vi.fn(),extract:vi.fn(),save:vi.fn(),update:vi.fn()}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'v5-tester',displayName:'Driver'}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>stub.data}));
vi.mock('../hooks/useExpenses',()=>({default:()=>stub.costs}));
vi.mock('../services/premium',()=>({getPremiumStatus:(...a)=>stub.status(...a),extractStatement:(...a)=>stub.extract(...a)}));
vi.stubGlobal('crypto',webcrypto);
const period={start:'2026-09-14',end:'2026-10-11',id:'2026-09-14_2026-10-11'};
const logs=[
 {id:'one',date:'2026-09-14',stops:120,totalParcels:135,total:100,payStructureSnapshot:{contractorFeePercent:0}},
 {id:'two',date:'2026-09-15',stops:130,totalParcels:145,total:200,payStructureSnapshot:{contractorFeePercent:0}}
];
const statement=(overrides={})=>({
 periodStart:'2026-09-14',periodEnd:'2026-10-11',currency:'GBP',taxBasis:'excluded',
 contractorPayout:280,statementAmount:300,contractorFee:0,contractorCharges:20,
 daily:[{date:'2026-09-14',stops:119,amount:100},{date:'2026-09-15',stops:130,amount:200}],
 charges:[],...overrides
});
const open=()=>render(<MemoryRouter initialEntries={['/app/check-pay']}><Routes><Route path="/app/check-pay" element={<CheckPayV5/>}/><Route path="/app/invoice" element={<p>Invoice screen</p>}/></Routes></MemoryRouter>);
async function upload(){
 await screen.findByText(/AI included during testing/);
 fireEvent.change(screen.getByLabelText('Upload contractor statement'),{target:{files:[new File(['fake image'],'statement.png',{type:'image/png'})]}});
 await screen.findByText('Your pay check');
}
beforeEach(()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
 vi.clearAllMocks();localStorage.clear();
 stub.data={logs:[...logs],payPeriodAnchor:'2026-09-14',periodRecords:{},
   updatePeriodRecord:stub.save,updateLogs:stub.update,paymentConfig:{contractorFeePercent:0},loading:false,loadError:''};
 stub.costs={expenses:[],loading:false,error:null};
 stub.status.mockResolvedValue({isPro:false,betaAccess:true,statementAiUses:3});
 stub.extract.mockResolvedValue(statement());
 stub.save.mockResolvedValue(true);
});
describe('V5 one-upload pay journey',()=>{
 it('does not lead with legacy VAT and charge confirmations; one AI action',async()=>{
  open();expect(screen.getByRole('heading',{name:'Check your pay'})).toBeInTheDocument();
  expect(screen.getByLabelText('Upload contractor statement')).toBeInTheDocument();
  expect(screen.queryByText('Review statement')).not.toBeInTheDocument();
  expect(screen.queryByText('Final payout VAT treatment')).not.toBeInTheDocument();
  expect(screen.queryByText('Create invoice')).not.toBeInTheDocument();
  await screen.findByText(/AI included during testing/);
 });
 it('reads a statement and automatically reports differences with the corresponding saved day',async()=>{
  open();await upload();
  expect(stub.extract).toHaveBeenCalledOnce();
  expect(screen.getByText(/1 workday needs attention/)).toBeInTheDocument();
  expect(screen.getByText(/120 yours \/ 119 statement/)).toBeInTheDocument();
  expect(screen.getByText('Potential difference')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Save pay check'})).toBeEnabled();
  expect(stub.save).not.toHaveBeenCalled();
 });
 it('persists only after explicit confirmation, uses contractor figure and stores discrepancy evidence',async()=>{
  open();await upload();
  fireEvent.change(screen.getByDisplayValue('Needs review'),{target:{value:'possible_duplicate_accepted'}});
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledTimes(1));
  const [id,patch,strict]=stub.save.mock.calls[0];
  expect(id).toBe(period.id);expect(strict).toBe(true);
  expect(patch).toMatchObject({status:'checked',needsReview:false,reviewedStatement:{payoutPence:28000,reviewed:true},payoutComparison:{source:'ai',statementPence:28000,expectedPence:30000},statementFindings:{hasDaily:true,flagged:[{date:'2026-09-14',acceptedReason:'possible_duplicate_accepted'}]}});
  expect(stub.data.logs).toEqual(logs);
 });
 it('groups all-in pay variations into one acknowledgement rather than requiring each day accepted',async()=>{
  stub.extract.mockResolvedValue(statement({
    daily:[{date:'2026-09-14',stops:120,amount:101.70},{date:'2026-09-15',stops:130,amount:201.10}],
    contractorPayout:280,statementAmount:303,contractorCharges:23
  }));
  stub.save.mockImplementation(async(id,patch)=>{stub.data.periodRecords={...stub.data.periodRecords,[id]:patch};return true;});
  open();await upload();
  expect(screen.getByText('Stops match · Daily earnings differ')).toBeInTheDocument();
  expect(screen.getByText(/2 days with matching stop counts/)).toBeInTheDocument();
  expect(screen.queryByText('Workdays to review')).not.toBeInTheDocument();
  expect(screen.getByText(/you don't need to review each day separately/i)).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Needs review')).not.toBeInTheDocument();
  const disclosure=screen.getByText('View 2 daily amount differences');
  fireEvent.click(disclosure);
  expect(screen.getByText(/£100.00 logged \/ £101.70 statement/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:/I understand that 2 days have all-in earnings amounts/})).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledTimes(1));
  expect(stub.save.mock.calls[0][1]).toMatchObject({
    needsReview:true,statementFindings:{flagged:[],earningsDifferences:2,limitedCoverageAccepted:false}
  });
  expect(screen.queryByRole('button',{name:'Prepare invoice from statement'})).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button',{name:'Review limited pay check'}));
  fireEvent.click(screen.getByRole('checkbox',{name:/I understand that 2 days have all-in earnings amounts/}));
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledTimes(2));
  expect(stub.save.mock.calls[1][1]).toMatchObject({needsReview:false,statementFindings:{flagged:[],earningsDifferences:2,limitedCoverageAccepted:true}});
  expect(await screen.findByRole('button',{name:'Accept difference & prepare invoice'})).toBeInTheDocument();
 });
 it('keeps the invoice closed when identical totals hide a missing stop until the driver accepts it',async()=>{
  stub.extract.mockResolvedValue(statement({contractorPayout:300,contractorCharges:0,statementAmount:300}));
  stub.save.mockImplementation(async(id,patch)=>{stub.data.periodRecords={...stub.data.periodRecords,[id]:patch};return true;});
  open();await upload();
  expect(screen.getByText(/1 workday needs attention/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledOnce());
  expect(stub.save.mock.calls[0][1]).toMatchObject({status:'checked',needsReview:true});
  expect(await screen.findByRole('button',{name:'Review differences'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Prepare invoice from statement'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review differences'}));
  expect(screen.getByText(/120 yours \/ 119 statement/)).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue('Needs review'),{target:{value:'possible_duplicate_accepted'}});
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledTimes(2));
  expect(stub.save.mock.calls[1][1]).toMatchObject({needsReview:false,statementFindings:{flagged:[{date:'2026-09-14',acceptedReason:'possible_duplicate_accepted'}]}});
  expect(await screen.findByRole('button',{name:'Prepare invoice from statement'})).toBeInTheDocument();
 });
 it('saves a totals-only AI check but prevents invoicing until the driver accepts incomplete coverage',async()=>{
  stub.extract.mockResolvedValue(statement({daily:[],extractionMode:'summary_only',contractorPayout:300,contractorCharges:0}));
  stub.save.mockImplementation(async(id,patch)=>{stub.data.periodRecords={...stub.data.periodRecords,[id]:patch};return true;});
  open();await upload();
  expect(screen.getByText(/Limited check: Some workday details could not be verified/)).toBeInTheDocument();
  const ack=screen.getByRole('checkbox',{name:/I understand that not every workday detail was verified/});
  expect(ack).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledOnce());
  const first=stub.save.mock.calls[0][1];
  expect(first).toMatchObject({status:'checked',needsReview:true,statementFindings:{summaryOnly:true,hasDaily:false,limitedCoverageAccepted:false}});
  expect(screen.queryByRole('button',{name:'Prepare invoice from statement'})).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button',{name:/Review limited pay check/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/I understand that not every workday detail was verified/}));
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalledTimes(2));
  expect(stub.save.mock.calls[1][1]).toMatchObject({needsReview:false,statementFindings:{limitedCoverageAccepted:true}});
  expect(await screen.findByRole('button',{name:'Prepare invoice from statement'})).toBeInTheDocument();
 });
 it('shows the historic fee repair action alongside result instead of burying it in old settings',async()=>{
  stub.data.logs=[{...logs[0],payStructureSnapshot:{}}];
  open();await upload();
  expect(screen.getByText(/One missing detail · Confirm a contractor deduction for 1 saved day/)).toBeInTheDocument();
  fireEvent.click(screen.getByText(/One missing detail · Confirm a contractor deduction for 1 saved day/));
  expect(screen.getByRole('textbox',{name:'Contractor fee (%)'})).toHaveValue('0');
  expect(screen.getByRole('button',{name:'Confirm old deduction'})).toBeDisabled();
 });
 it('links only missing gross earnings to the correct saved period instead of blocking an AI scan',async()=>{
   stub.data.logs=[{...logs[0],total:null,payStructureSnapshot:{contractorFeePercent:0}},logs[1]];
   open();await upload();
   expect(screen.getByRole('region',{name:'Review missing work earnings'})).toBeInTheDocument();
   expect(screen.getByRole('link',{name:/Review saved workdays/})).toHaveAttribute('href','/app/records?payReview=1');
   expect(screen.getByRole('button',{name:'Save statement — check later'})).toBeEnabled();
 });
 it('detects the dates on a non-28-day statement without rewriting the work history',async()=>{
  stub.extract.mockResolvedValue(statement({periodStart:'2026-09-14',periodEnd:'2026-10-04',contractorPayout:300}));
  open();await upload();
  expect(screen.getByText(/14 Sept 2026 – 4 Oct 2026/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalled());
  expect(stub.save.mock.calls[0][0]).toBe('2026-09-14_2026-10-04');
  expect(stub.data.logs).toEqual(logs);
 });
 it('saves a VAT-inclusive figure as unchecked when net VAT is unknown',async()=>{
  stub.extract.mockResolvedValue(statement({taxBasis:'included',contractorPayout:360,vatAmount:null,beforeVatPayout:null}));
  open();await upload();
  expect(screen.getByRole('button',{name:'Save statement — check later'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Save statement — check later'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalled());
  const saved=stub.save.mock.calls[0][1];
  expect(saved).toMatchObject({status:'statement_received',needsReview:true,reviewedStatement:{payoutPence:36000,taxBasis:'included',reviewed:false}});
  expect(saved.payoutComparison).toBeNull();
 });
 it('stores a verified VAT conversion in pence without overwriting VAT-inclusive original',async()=>{
  stub.extract.mockResolvedValue(statement({taxBasis:'included',contractorPayout:360,vatAmount:60,beforeVatPayout:300}));
  open();await upload();
  expect(screen.getByRole('button',{name:'Save pay check'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Save pay check'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalled());
  expect(stub.save.mock.calls[0][1].reviewedStatement).toMatchObject({payoutPence:30000,vatIncludedPayoutPence:36000,vatAmountPence:6000});
 });
 it('does not manufacture an expected payout when historical fee is unknown',async()=>{
  stub.data.logs=[{...logs[0],payStructureSnapshot:{}}];
  open();await upload();
  expect(screen.getByRole('button',{name:'Save statement — check later'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Save statement — check later'}));
  await waitFor(()=>expect(stub.save).toHaveBeenCalled());
  expect(stub.save.mock.calls[0][1].payoutComparison).toBeNull();
 });
 it('reports invalid, implausibly long and missing date ranges without guessing',()=>{
  expect(periodFromStatement({periodStart:'2026-09-14',periodEnd:'2026-10-04'})).toMatchObject({id:'2026-09-14_2026-10-04'});
  expect(periodFromStatement({periodStart:'2026-09-14',periodEnd:'2028-10-04'})).toBeNull();
  expect(periodFromStatement({periodStart:'2026-09-14',periodEnd:null})).toBeNull();
 });
});
