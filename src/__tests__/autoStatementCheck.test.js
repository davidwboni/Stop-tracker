import {describe,it,expect} from 'vitest';
import {buildStatementAutoCheck} from '../features/statements/autoCheck';
const period={start:'2026-09-14',end:'2026-10-11'};
const statement={
 currency:'GBP',taxBasis:'included',periodStart:period.start,periodEnd:period.end,
 contractorPayout:4421.63,vatAmount:736.94,beforeVatPayout:3684.69,
 daily:[{date:'2026-09-14',stops:104,amount:207.62},{date:'2026-09-15',stops:140,amount:264.50}]
};
const rows=[{date:'2026-09-14',stops:104},{date:'2026-09-15',stops:139}];
const days=[{gross:207.62,unavailable:false},{gross:263.50,unavailable:false}];
describe('AI-first comparison',()=>{
 it('uses explicitly printed VAT for before-VAT payout; no guesswork',()=>{
  const c=buildStatementAutoCheck(statement,period,rows,days,368469);
  expect(c.rawPayout).toBe(442163);
  expect(c.vat).toBe(73694);
  expect(c.payoutBeforeVat).toBe(368469);
  expect(c.vatSource).toBe('printed_net');
  expect(c.difference).toBe(0);
  expect(c.canCompare).toBe(true);
 });
 it('highlights exact days with recorded-vs-statement stops and gross differences automatically',()=>{
  const c=buildStatementAutoCheck(statement,period,rows,days,368469);
  expect(c.flagged).toHaveLength(1);
  expect(c.flagged[0]).toMatchObject({date:'2026-09-15',loggedStops:139,statementStops:140,loggedGross:26350,statementGross:26450});
  expect(c.matched).toHaveLength(1);
 });
 it('does not call an absent day a confirmed match',()=>{
  const more={...statement,daily:[...statement.daily,{date:'2026-09-16',stops:120,amount:212}]};
  const c=buildStatementAutoCheck(more,period,rows,days,null);
  expect(c.flagged.some(d=>d.reason==='Not logged in Stop Tracker')).toBe(true);
  expect(c.canCompare).toBe(false);
  expect(c.matched).toHaveLength(1);
 });
 it('does not silently assume VAT or compare tax-incompatible totals',()=>{
  const c=buildStatementAutoCheck({...statement,beforeVatPayout:null,vatAmount:null},period,rows,days,368469);
  expect(c.payoutBeforeVat).toBe(null);
  expect(c.canCompare).toBe(false);
  expect(c.difference).toBe(null);
 });
 it('allows a printed VAT adjustment without printed net total but never an invented percentage',()=>{
  const c=buildStatementAutoCheck({...statement,beforeVatPayout:null},period,rows,days,368469);
  expect(c.payoutBeforeVat).toBe(368469);
  expect(c.vatSource).toBe('printed_vat');
 });
 it('rejects currency and period mismatch for automatic comparison',()=>{
  const foreign=buildStatementAutoCheck({...statement,currency:'EUR'},period,rows,days,368469);
  expect(foreign.canCompare).toBe(false);expect(foreign.dayRows).toHaveLength(0);
  const shifted=buildStatementAutoCheck({...statement,periodEnd:'2026-10-12'},period,rows,days,368469);
  expect(shifted.canCompare).toBe(false);expect(shifted.dayRows).toHaveLength(0);
 });
 it('does not pretend a duplicate contractor date is a match',()=>{
  const daily=[statement.daily[0],statement.daily[0]];
  const c=buildStatementAutoCheck({...statement,daily},period,rows.slice(0,1),days.slice(0,1),368469);
  expect(c.flagged[0].reason).toMatch(/Duplicate/);
 });
 it('handles absent daily rows without suggesting any day matched',()=>{
  const c=buildStatementAutoCheck({...statement,daily:[],extractionMode:'summary_only'},period,rows,days,null);
  expect(c.hasDaily).toBe(false);expect(c.matched).toHaveLength(0);expect(c.summaryOnly).toBe(true);
 });
 it('never converts a missing logged stop number into a false zero-stop mismatch',()=>{
  const c=buildStatementAutoCheck(
    {...statement,daily:[{date:'2026-09-14',stops:104,amount:207.62}]},
    period,
    [{date:'2026-09-14',stops:null}],
    [{gross:207.62,unavailable:false}],null
  );
  expect(c.flagged).toHaveLength(0);
  expect(c.dayRows[0].loggedStops).toBeNull();
  expect(c.dayRows[0].statementStops).toBe(104);
 });
 it('does not call missing gross values a mismatch when stop counts match',()=>{
  const s={...statement,daily:[{date:'2026-09-14',stops:104,amount:null}]};
  const c=buildStatementAutoCheck(s,period,rows.slice(0,1),[{gross:null,unavailable:true}],null);
  expect(c.matched).toHaveLength(1);
  expect(c.flagged).toHaveLength(0);
 });
});
