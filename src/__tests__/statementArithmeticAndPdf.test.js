import {describe,it,expect} from 'vitest';
import {auditStatementArithmetic} from '../features/statements/statementAudit';
import {pdfStatementRenderScale} from '../features/statements/prepareImage';

const valid={
 currency:'GBP',taxBasis:'included',statementStops:250,
 deliverySubtotal:1200.35,extraPaymentsTotal:70.20,statementAmount:1270.55,
 contractorFee:76.23,contractorCharges:199.32,
 beforeVatPayout:995,vatAmount:199,contractorPayout:1194,
 daily:[{date:'2026-09-14',stops:120,amount:590.15},{date:'2026-09-15',stops:130,amount:610.20}],
 extraPayments:[{date:'2026-09-16',category:'route_cover',amount:30},{date:'2026-10-16',category:'fuel_supplement',amount:40.20}]
};
describe('original contractor statement arithmetic without extra driver taps',()=>{
 it('confirms independently printed delivery, extras, deductions and VAT totals in pence',()=>{
  const audit=auditStatementArithmetic(valid);
  expect(audit.status).toBe('balanced');
  expect(audit.checks.map(c=>c.key)).toEqual(['gross','before_vat','after_vat']);
  expect(audit.checks.every(c=>c.matches)).toBe(true);
  expect(audit.dailyCoverage).toBe(true);
 });
 it('rejects one misread gross, net or VAT amount without changing the printed source figures',()=>{
  for(const [key,value,code] of [['statementAmount',1270.50,'gross'],['beforeVatPayout',994.99,'before_vat'],['contractorPayout',1194.01,'after_vat']]){
    const audit=auditStatementArithmetic({...valid,[key]:value});
    expect(audit.status).toBe('mismatch');
    expect(audit.mismatches.map(c=>c.key)).toContain(code);
  }
 });
 it('never infers zero for missing fees, VAT or extra payments',()=>{
  const audit=auditStatementArithmetic({statementAmount:100,contractorPayout:100,taxBasis:'included'});
  expect(audit.status).toBe('not_checked');
  expect(audit.checks).toEqual([]);
 });
 it('notices omitted daily stops separately from payout arithmetic',()=>{
  const audit=auditStatementArithmetic({...valid,daily:[valid.daily[0]]});
  expect(audit.status).toBe('balanced');
  expect(audit.dailyCoverage).toBe(false);
 });
});
describe('phone-safe high-resolution PDF scanning',()=>{
 it('gives fine-print letter pages sufficient rendering resolution',()=>{
  const scale=pdfStatementRenderScale(792,612);
  expect(scale).toBeGreaterThanOrEqual(2);
  expect(792*scale).toBeGreaterThan(1500);
 });
 it('scales very large documents to fit within a bounded canvas pixel area',()=>{
  const scale=pdfStatementRenderScale(8000,7000);
  expect(8000*7000*scale*scale).toBeLessThanOrEqual(12000000.1);
  expect(pdfStatementRenderScale(0,0)).toBe(1.2);
 });
});
