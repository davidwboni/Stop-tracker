import {beforeEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {expenseReviewPatches} from '../features/expenses/reviewImpact';
import {moneyRevision,moneySummary,payoutComparison} from '../features/money/moneyModel';

vi.stubGlobal('crypto',webcrypto);
const period={id:'2026-08-17_2026-09-13',start:'2026-08-17',end:'2026-09-13'};
const logs=[{id:'work',date:period.start,total:100,payStructureSnapshot:{contractorFeePercent:6}}];
const personal={id:'personal',date:period.start,source:'my_expense',amount:10,category:'Fuel'};
const contractor={id:'contractor',date:period.start,source:'contractor_charge',amount:5,category:'Lease'};
const before=[personal,contractor];
async function checked(expenses=before,work=logs) {
 return {status:'checked',needsReview:false,payoutComparison:{
  source:'manual',scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',
  basisConfirmed:true,start:period.start,end:period.end,
  statementPence:8900,expectedPence:moneySummary(work,expenses,period).payout,
  revision:await moneyRevision(work,expenses,period)
 }};
}
async function patches(record,after,{work=logs,oldExpenses=before}={}) {
 return expenseReviewPatches({logs:work,before:oldExpenses,after,dates:[period.start],
  anchor:period.start,periodRecords:{[period.id]:record},updatedAt:'2026-10-18T00:00:00Z'});
}
describe('statement comparison stability across personal spending',()=>{
 it('keeps a verified check valid after adding personal fuel and updates only its fingerprint',async()=>{
  const original=await checked();
  const after=[...before,{id:'fuel2',date:period.start,source:'my_expense',amount:50,category:'Other'}];
  const p=await patches(original,after);
  expect(p[period.id]).toMatchObject({status:'checked',needsReview:false});
  expect(p[period.id].payoutComparison.revision).not.toBe(original.payoutComparison.revision);
  const updated=moneySummary(logs,after,period);
  expect(updated.payout).toBe(8900);
  expect(updated.takeHome).toBe(2900);
  expect(payoutComparison(p[period.id],period,updated,await moneyRevision(logs,after,period)).state).toBe('matched');
 });
 it('preserves an explicitly resolved comparison if only a personal expense changes',async()=>{
  const record={...await checked(),status:'reconciled',resolvedAt:'2026-09-20'};
  const after=[contractor];
  const p=await patches(record,after);
  expect(p[period.id].status).toBe('reconciled');
  expect(payoutComparison(p[period.id],period,moneySummary(logs,after,period),await moneyRevision(logs,after,period)).state).toBe('reconciled');
 });
 it('requires a recheck when a contractor deduction changes',async()=>{
  const record=await checked();
  const p=await patches(record,[personal,{...contractor,amount:8}]);
  expect(p[period.id]).toMatchObject({status:'needs_review',needsReview:true});
 });
 it('requires a recheck when work changed before personal expenses changed',async()=>{
  const record=await checked();
  const changedLogs=[{...logs[0],total:110}];
  const p=await patches(record,[...before,{id:'new',date:period.start,source:'my_expense',amount:3}],{work:changedLogs});
  expect(p[period.id]).toMatchObject({status:'needs_review',needsReview:true});
 });
 it('never clears an already stale comparison',async()=>{
  const record={...await checked(),status:'needs_review',needsReview:true};
  const p=await patches(record,[...before,{id:'new',date:period.start,source:'my_expense',amount:3}]);
  expect(p).toEqual({});
 });
 it('does not treat changing a contractor charge into a personal expense as harmless',async()=>{
  const record=await checked();
  const p=await patches(record,[personal,{...contractor,source:'my_expense'}]);
  expect(p[period.id]).toMatchObject({status:'needs_review',needsReview:true});
 });
 it('does not invent a valid check for a legacy status with no comparison',async()=>{
  const p=await patches({status:'reconciled'},[...before,{...personal,id:'added'}]);
  expect(p[period.id]).toMatchObject({status:'needs_review',needsReview:true});
 });
});
