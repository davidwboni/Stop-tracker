import React from 'react';
import {describe,it,expect} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import PayResultSummary from '../components/PayResultSummary';
import {readablePayResult} from '../features/statements/readablePayResult';

const period={start:'2026-10-12',end:'2026-11-08'};
const amounts=[11735,35483,58532,1800,4763,46849];
const evidence=amounts.map((amountPence,id)=>({id,amountPence,label:'Charge '+id,status:'unverified'}));
const check={
 canCompare:true,periodOk:true,currencyOk:true,flagged:Array.from({length:6},(_,i)=>({date:'2026-10-'+(12+i)})),
 earningsVariations:Array.from({length:13},(_,i)=>({date:'2026-10-'+(14+i)})),
 hasDaily:true,expectedPence:464555,payoutBeforeVat:310889,rawPayout:373067,vat:62178,difference:-153666
};
const audit={status:'balanced'};
const statement={contractorCharges:1591.62};
const summary={payout:464555,costs:{contractor:0},rows:Array.from({length:19},()=>({}))};
const read=readablePayResult({check,statement,summary,audit,chargeEvidence:evidence});
const base={ai:statement,view:check,step:'result',period,rowSummary:summary,showComparableWork:true,scopeNeedsConfirmation:false,audit,canCompare:true,readable:read,hidden:false};
describe('mobile-first readable Pay result',()=>{
 it('shows the payout, estimate, charges, and only three short issue counts',()=>{
  render(<PayResultSummary {...base}/>);
  const result=screen.getByRole('region',{name:'Pay check summary'});
  expect(within(result).getByText('£3,108.89')).toBeInTheDocument();
  expect(within(result).getByText('£4,645.55')).toBeInTheDocument();
  expect(within(result).getByText('£1,591.62')).toBeInTheDocument();
  expect(within(result).getByText('Stop/date issues')).toBeInTheDocument();
  expect(within(result).getByText('Pay variations')).toBeInTheDocument();
  expect(within(result).getByText('Charge items')).toBeInTheDocument();
  expect(within(result).getByText('Estimate after those charges')).toBeInTheDocument();
  expect(within(result).getByText('£3,053.93')).toBeInTheDocument();
  expect(within(result).getByText('£54.96 higher')).toBeInTheDocument();
  expect(within(result).queryByText('£1,536.66')).not.toBeInTheDocument();
  expect(result.querySelector('.v5-result-math')).not.toHaveAttribute('open');
  expect(result.querySelectorAll('.v5-quick-summary p')).toHaveLength(0);
 });
 it('still explains the full unadjusted £1,536.66 gap only on demand',()=>{
  render(<PayResultSummary {...base}/>);
  const detail=screen.getByText('Understand the calculation');
  fireEvent.click(detail);
  const section=detail.closest('details');
  expect(section).toHaveAttribute('open');
  expect(within(section).getByText('£1,536.66')).toBeInTheDocument();
  expect(within(section).getByText(/different figures/)).toBeInTheDocument();
 });
 it('does not suggest a charge-adjusted result when charges already appear in the ledger',()=>{
  const withCharge=readablePayResult({check,statement,summary:{...summary,costs:{contractor:585.32}},audit,chargeEvidence:evidence});
  render(<PayResultSummary {...base} readable={withCharge}/>);
  expect(screen.queryByText('Estimate after those charges')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Understand the calculation'));
  expect(screen.getByText(/has not subtracted them twice/)).toBeInTheDocument();
 });
 it('never presents a numeric payout as confirmed for VAT-unknown or date-mismatched statements',()=>{
  render(<PayResultSummary {...base} view={{...check,payoutBeforeVat:null}} canCompare={false} scopeNeedsConfirmation={true} showComparableWork={false}
    readable={{...read,expected:null,paid:null,rawGap:null,bridgeAvailable:false}}/>);
  expect(screen.getByText('VAT needs checking')).toBeInTheDocument();
  expect(screen.getByText(/Confirm the statement dates above/)).toBeInTheDocument();
  expect(screen.queryByText('£54.96 higher')).not.toBeInTheDocument();
 });
 it('honours financial privacy mode across all visible amounts',()=>{
  render(<PayResultSummary {...base} hidden/>);
  expect(screen.getAllByText('••••').length).toBeGreaterThan(2);
  expect(screen.queryByText('£3,108.89')).not.toBeInTheDocument();
  expect(screen.queryByText('£1,591.62')).not.toBeInTheDocument();
 });
});