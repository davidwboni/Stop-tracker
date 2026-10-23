import {describe,it,expect} from 'vitest';
import {statementChargeEvidence} from '../features/statements/chargeEvidence';
const period={start:'2026-09-14',end:'2026-10-11'};
describe('fuel-card and contractor charge evidence',()=>{
 it('does not flag a discounted fuel-card charge simply because the pump receipt was greater',()=>{
  const result=statementChargeEvidence({charges:[{label:'Fuel Usage',amount:74}]},[
   {date:'2026-09-17',source:'my_expense',category:'Fuel',amount:80}],period);
  expect(result[0].status).toBe('fuel_discount_unknown');
  expect(result[0].explanation).toMatch(/No discount is assumed/);
 });
 it('uses only explicitly recorded fuel discounts, not an assumed percentage',()=>{
  const result=statementChargeEvidence({charges:[{label:'Fuel Usage',amount:74}]},[
   {date:'2026-09-17',source:'my_expense',category:'Fuel',amount:80,fuelCardDiscount:6}],period);
  expect(result[0].status).toBe('fuel_discount_consistent');
  expect(result[0].amountPence).toBe(7400);
 });
 it('does not mistake fuel I paid for personally as evidence for the contractor fuel-card charge',()=>{
  const checked=statementChargeEvidence({charges:[{label:'Fuel Usage',amount:74}]},[
   {date:'2026-09-17',source:'my_expense',category:'Fuel',amount:80,fuelCardDiscount:6,fuelPaidViaContractor:false}
  ],period);
  expect(checked[0].status).toBe('fuel_discount_unknown');
 });
 it('compares only fuel-card tagged receipts, even with other personal fuel costs in the same period',()=>{
  const result=statementChargeEvidence({charges:[{label:'Fuel Usage',amount:74}]},[
   {date:'2026-09-17',source:'my_expense',category:'Fuel',amount:80,fuelCardDiscount:6,fuelPaidViaContractor:true},
   {date:'2026-09-18',source:'my_expense',category:'Fuel',amount:25,fuelPaidViaContractor:false}
  ],period);
  expect(result[0].status).toBe('fuel_discount_consistent');
 });
 it('compares separately logged contractor lease and insurance charges where evidence exists',()=>{
  const result=statementChargeEvidence({charges:[{label:'Lease',amount:150},{label:'Insurance',amount:55}]},[
   {date:'2026-09-17',source:'contractor_charge',category:'Lease',amount:150},
   {date:'2026-09-17',source:'contractor_charge',category:'Insurance',amount:60}
  ],period);
  expect(result.map(x=>x.status)).toEqual(['matches_recorded_charge','different_from_recorded_charge']);
 });
 it('does not manufacture a match when reference data is absent or outside the statement period',()=>{
  const result=statementChargeEvidence({charges:[{label:'Management Fee',amount:40}]},[
   {date:'2026-09-13',source:'contractor_charge',category:'Management fee',amount:40}],period);
  expect(result[0].status).toBe('unverified');
 });
});