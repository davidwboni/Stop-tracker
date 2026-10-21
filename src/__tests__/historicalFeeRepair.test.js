import {describe,it,expect} from 'vitest';
import {historicalFeeIssue,applyConfirmedHistoricalFee,validHistoricalFee} from '../features/money/historicalFeeRepair';
import {moneySummary} from '../features/money/moneyModel';
import {summarizeDay} from '../features/home/homeModel';
const p={start:'2026-09-14',end:'2026-10-11'};
const saved=[
 {id:'a',date:'2026-09-14',stops:120,totalParcels:158,total:281.1,notes:'keep intact'},
 {id:'b',date:'2026-09-15',stops:100,total:209.5,payStructureSnapshot:{model:'flat_stops',contractorFeePercent:5.5,ratePerStop:2.08}},
 {id:'c',date:'2026-09-17',stops:114,total:221.2,payStructureSnapshot:{contractorFeePercent:''}},
 {id:'d',date:'2026-10-12',stops:130,total:280},
];
describe('confirmed historical contractor fee recovery',()=>{
 it('reports only saved in-period workdays that lack a fee',()=>{
  const {rows,missingFee,missingGross}=historicalFeeIssue(saved,p);
  expect(rows).toHaveLength(3);expect(missingFee.map(r=>r.id)).toEqual(['a','c']);expect(missingGross).toHaveLength(0);
 });
 it('keeps original work fields, earnings, existing rates and out-of-period entries unchanged',()=>{
  const logs=applyConfirmedHistoricalFee(saved,p,'6','2026-10-21T22:00:00Z');
  expect(logs[0]).toMatchObject({id:'a',stops:120,totalParcels:158,total:281.1,notes:'keep intact',historicalFeeConfirmation:{percent:6,method:'driver_confirmed_period'}});
  expect(logs[1]).toBe(saved[1]);expect(logs[3]).toBe(saved[3]);
  expect(logs[2].payStructureSnapshot.contractorFeePercent).toBe('');
  expect(logs[2].historicalFeeConfirmation.percent).toBe(6);
  expect(logs[0].historicalFeeConfirmation.confirmedAt).toBe('2026-10-21T22:00:00Z');
  expect(saved[0].payStructureSnapshot).toBeUndefined();
 });
 it('restores an expected contractor payout when all gross totals exist',()=>{
  expect(moneySummary(saved,[],p).payout).toBeNull();
  const patched=applyConfirmedHistoricalFee(saved,p,'6');
  const result=moneySummary(patched,[],p);
  expect(result.payout).not.toBeNull();
  expect(result.gross).toBe(71180);
  expect(result.payout).toBeLessThan(result.gross);
 });
 it('never manufactures a missing gross amount',()=>{
  const withMissing=[...saved,{id:'e',date:'2026-09-18',total:null,stops:100}];
  expect(historicalFeeIssue(withMissing,p).missingGross.map(x=>x.id)).toEqual(['e']);
  expect(moneySummary(applyConfirmedHistoricalFee(withMissing,p,6),[],p).payout).toBeNull();
 });
 it('does not treat a blank historical percentage as a zero fee',()=>{
  expect(summarizeDay(saved[2]).fee).toBeNull();
  expect(summarizeDay({...saved[0],payStructureSnapshot:{contractorFeePercent:0}}).fee).toBe(0);
  expect(validHistoricalFee('')).toBe(false);
 });
 it('rejects invalid fee percentages including negative, over 100 and malformed strings',()=>{
  for(const x of ['',null,-1,101,'6.123','abc','6e2',true])expect(()=>applyConfirmedHistoricalFee(saved,p,x)).toThrow();
  expect(applyConfirmedHistoricalFee(saved,p,'0')[0].historicalFeeConfirmation.percent).toBe(0);
  expect(applyConfirmedHistoricalFee(saved,p,'100')[0].historicalFeeConfirmation.percent).toBe(100);
 });
 it('does not permit reapplying to all-complete records',()=>{
  const patched=applyConfirmedHistoricalFee(saved,p,6);
  expect(()=>applyConfirmedHistoricalFee(patched,p,7)).toThrow(/No saved days/);
 });
});