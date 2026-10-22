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
 it('groups all-in earnings changes when contractor and logged stops are identical',()=>{
  const dates=Array.from({length:27},(_,i)=>{
   const date=new Date(Date.UTC(2026,8,14+i));
   return date.toISOString().slice(0,10);
  }).filter(date=>date<=period.end);
  const statementDays=dates.map((date,i)=>({date,stops:104+i,amount:207.62+i}));
  const own=dates.map((date,i)=>({date,stops:104+i,totalParcels:110+i,extraWorkAmount:5}));
  const saved=dates.map((date,i)=>({gross:205.92+i,unavailable:false}));
  const result=buildStatementAutoCheck({...statement,daily:statementDays},period,own,saved,368469);
  expect(result.flagged).toHaveLength(0);
  expect(result.matched).toHaveLength(dates.length);
  expect(result.earningsVariations).toHaveLength(dates.length);
  expect(result.earningsVariations[0]).toMatchObject({date:'2026-09-14',loggedStops:104,statementStops:104,loggedGross:20592,statementGross:20762,grossDifferencePence:170,earningsUnverified:true});
  expect(result.payoutBeforeVat).toBe(368469);
  expect(result.canCompare).toBe(true); // period payout still uses like-for-like pre-VAT total
 });
 it('flags real missing stops but groups only same-stop daily earnings variances',()=>{
  const testStatement={...statement,daily:[
   {date:'2026-09-14',stops:104,amount:207.62},
   {date:'2026-09-15',stops:139,amount:264.50}
  ]};
  const own=[{date:'2026-09-14',stops:104},{date:'2026-09-15',stops:140}];
  const dayGross=[{gross:205.92,unavailable:false},{gross:262.2,unavailable:false}];
  const result=buildStatementAutoCheck(testStatement,period,own,dayGross,368469);
  expect(result.flagged).toHaveLength(1);
  expect(result.flagged[0]).toMatchObject({date:'2026-09-15',reason:'Different stop counts'});
  expect(result.earningsVariations).toHaveLength(1);
  expect(result.earningsVariations[0].date).toBe('2026-09-14');
 });
 it('does not silently verify earnings when the contractor gives no daily stop counts',()=>{
  const result=buildStatementAutoCheck({...statement,daily:[{date:period.start,stops:null,amount:250}]},period,
    [{date:period.start,stops:104}],[{gross:200,unavailable:false}],368469);
  expect(result.flagged).toHaveLength(0);
  expect(result.matched).toHaveLength(0);
  expect(result.unknown).toHaveLength(1);
  expect(result.unknown[0].reason).toBe('Insufficient daily stop figures');
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
 it('does not flag contractor off-days with confirmed zero work and zero pay as missing driver logs',()=>{
  const c=buildStatementAutoCheck({
    ...statement,
    daily:[
      {date:'2026-09-14',stops:104,amount:207.62},
      {date:'2026-09-16',stops:0,amount:0},
      {date:'2026-09-17',stops:0,amount:15}
    ]
  },period,rows.slice(0,1),days.slice(0,1),null);
  expect(c.flagged.map(x=>x.date)).toEqual(['2026-09-17']);
  expect(c.dayRows.some(x=>x.date==='2026-09-16')).toBe(false);
 });
 it('does not call missing gross values a mismatch when stop counts match',()=>{
  const s={...statement,daily:[{date:'2026-09-14',stops:104,amount:null}]};
  const c=buildStatementAutoCheck(s,period,rows.slice(0,1),[{gross:null,unavailable:true}],null);
  expect(c.matched).toHaveLength(1);
  expect(c.flagged).toHaveLength(0);
 });
});
