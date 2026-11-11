import {describe,it,expect} from 'vitest';
import {readablePayResult} from '../features/statements/readablePayResult';

const rows=[
 {id:0,label:'mileage',amountPence:11735,status:'unverified'},
 {id:1,label:'insurance',amountPence:35483,status:'unverified'},
 {id:2,label:'lease',amountPence:58532,status:'unverified'},
 {id:3,label:'other',amountPence:1800,status:'unverified'},
 {id:4,label:'mileage',amountPence:4763,status:'unverified'},
 {id:5,label:'fuel',amountPence:46849,status:'fuel_discount_unknown'}
];
const check={canCompare:true,expectedPence:464555,payoutBeforeVat:310889,difference:-153666};
const statement={contractorCharges:1591.62,contractorPayout:3730.67,vatAmount:621.78};
const summary={costs:{contractor:0},payout:464555};
const audit={status:'balanced'};

describe('clear pay comparison, never treating charges as missing wages',()=>{
 it('explains six listed deductions separately from the raw estimate gap',()=>{
  const result=readablePayResult({check,statement,summary,audit,chargeEvidence:rows});
  expect(result).toMatchObject({
   expected:464555,paid:310889,
   rawGap:-153666,listedCharges:159162,reportedCharges:159162,
   itemizedConsistent:true,chargesCount:6,unmatched:6,
   adjustedEstimate:305393,remainingVariance:5496,bridgeAvailable:true
  });
  expect(result.remainingVariance).not.toBe(Math.abs(result.rawGap));
 });
 it('does not subtract contractor charges twice when already logged in work estimates',()=>{
  const result=readablePayResult({check,statement,summary:{costs:{contractor:585.32}},audit,chargeEvidence:rows});
  expect(result.alreadyIncludedCharges).toBe(58532);
  expect(result.bridgeAvailable).toBe(false);
  expect(result.adjustedEstimate).toBe(null);
  expect(result.remainingVariance).toBe(null);
 });
 it('does not invent a charge-adjusted estimate if itemized charges disagree with printed total',()=>{
  const result=readablePayResult({check,statement:{...statement,contractorCharges:1600},summary,audit,chargeEvidence:rows});
  expect(result.listedCharges).toBe(159162);
  expect(result.reportedCharges).toBe(160000);
  expect(result.itemizedConsistent).toBe(false);
  expect(result.bridgeAvailable).toBe(false);
 });
 it('does not adjust when statement arithmetic is unverified',()=>{
  for(const status of ['mismatch','not_checked']){
   expect(readablePayResult({check,statement,summary,audit:{status},chargeEvidence:rows}).bridgeAvailable).toBe(false);
  }
 });
 it('does not compare unlike VAT bases or unverified pay rates',()=>{
  for(const c of [{...check,canCompare:false},{...check,expectedPence:null},{...check,payoutBeforeVat:null}]){
   expect(readablePayResult({check:c,statement,summary,audit,chargeEvidence:rows}).remainingVariance).toBeNull();
  }
 });
 it('does not treat partial/unreadable charges as a full amount',()=>{
  const r=readablePayResult({check,statement,summary,audit,chargeEvidence:[...rows,{label:'fuel card',amountPence:null}]});
  expect(r.listedCharges).toBeNull();
  expect(r.bridgeAvailable).toBe(false);
 });
 it('counts independent evidence only when explicitly confirmed by a matching record',()=>{
  const evidence=[{...rows[0],status:'matches_recorded_charge'},...rows.slice(1)];
  const r=readablePayResult({check,statement,summary,audit,chargeEvidence:evidence});
  expect(r.independentConfirmed).toBe(1);
  expect(r.unmatched).toBe(5);
 });
 it('never bridges an estimate smaller than the listed charges',()=>{
  const r=readablePayResult({check:{...check,expectedPence:100000},statement,summary,audit,chargeEvidence:rows});
  expect(r.bridgeAvailable).toBe(false);
 });
});
