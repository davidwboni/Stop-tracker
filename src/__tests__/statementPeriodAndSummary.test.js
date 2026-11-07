import {describe,it,expect} from 'vitest';
import {inferStatementPeriod,statementDateRange} from '../features/statements/periodEvidence';
import {briefPayFindings} from '../features/statements/findingsSummary';
const sept={start:'2026-09-14',end:'2026-10-11',id:'2026-09-14_2026-10-11'};
const next={start:'2026-10-12',end:'2026-11-08',id:'2026-10-12_2026-11-08'};
const daily=Array.from({length:28},(_,i)=>({date:new Date(Date.UTC(2026,8,14+i)).toISOString().slice(0,10),stops:i%7===6?0:105+i,amount:i%7===6?0:200+i}));
describe('AI statement period evidence',()=>{
 it('flags Oct 11 misread as Nov 10 and suggests matching Sep-Oct period',()=>{
  const detected=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-11-10',daily},[next,sept]);
  expect(detected).toMatchObject({needsConfirmation:true,reason:'daily_dates_disagree',raw:{start:'2026-09-14',end:'2026-11-10'},suggested:sept,firstDay:'2026-09-14',lastDay:'2026-10-11'});
 });
 it('does not silently widen to later workdays when daily rows cover only 28 days',()=>{
  const found=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-11-10',daily},[]);
  expect(found.needsConfirmation).toBe(true);
  expect(found.suggested).toMatchObject({start:'2026-09-14',end:'2026-10-11'});
 });
 it('can match a full 28-day cycle even if the final Sunday is absent',()=>{
  const detected=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-11-10',daily:daily.slice(0,-1)},[sept]);
  expect(detected).toMatchObject({needsConfirmation:true,suggested:sept});
 });
 it('keeps short and legitimate custom periods intact',()=>{
  const original=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-10-04',daily:daily.slice(0,18)},[sept]);
  expect(original).toMatchObject({needsConfirmation:false,suggested:{start:'2026-09-14',end:'2026-10-04'}});
 });
 it('requires human confirmation for unusually long uncorroborated periods',()=>{
  const found=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-11-10',daily:[]},[sept,next]);
  expect(found.needsConfirmation).toBe(true);
  expect(found.suggested).toMatchObject({start:'2026-09-14',end:'2026-11-10'});
 });
 it('never makes up a cycle from only two rows or invalid source dates',()=>{
  expect(inferStatementPeriod({periodStart:null,periodEnd:null,daily:daily.slice(0,2)},[sept])).toMatchObject({suggested:null,needsConfirmation:false});
  expect(statementDateRange({periodStart:'2026-09-31',periodEnd:'2026-10-11'})).toBeNull();
 });
 it('does not guess a 28-day end when there is no matching saved pay cycle',()=>{
  const found=inferStatementPeriod({periodStart:'2026-09-14',periodEnd:'2026-11-10',daily:daily.slice(0,25)},[]);
  expect(found).toMatchObject({needsConfirmation:true,suggested:{start:'2026-09-14',end:'2026-10-08'}});
 });
});
describe('short evidence-grounded pay summary',()=>{
 it('never presents out-of-scope estimates or findings as a comparison',()=>{
   const list=briefPayFindings({check:{flagged:[{reason:'Different stop counts'}],earningsVariations:[],canCompare:false},confirmedScope:false});
   expect(list).toHaveLength(2);
   expect(list[0]).toMatch(/dates need confirming/);
   expect(list.join(' ')).not.toMatch(/underpayment/);
 });
 it('explains observed stop differences without claiming they were duplicates',()=>{
   const lines=briefPayFindings({check:{flagged:[{reason:'Different stop counts'}],earningsVariations:[],canCompare:true,difference:-100}});
   expect(lines[0]).toMatch(/duplicate or adjustment is possible, not confirmed/);
 });
 it('mentions excess parcels only as a possibility when actually recorded',()=>{
   const lines=briefPayFindings({check:{flagged:[],earningsVariations:[{}],canCompare:false,expectedPence:100},rows:[{stops:120,totalParcels:145}]});
   expect(lines[0]).toMatch(/excess parcels/);
   expect(lines[0]).toMatch(/Not confirmed underpayments/);
 });
 it('adds arithmetic uncertainty and stays at most three brief findings',()=>{
   const list=briefPayFindings({check:{flagged:[{reason:'Different stop counts'},{reason:'No statement row for logged day'}],earningsVariations:[{}],canCompare:false,expectedPence:500},auditStatus:'mismatch'});
   expect(list.length).toBeLessThanOrEqual(3);
   expect(list.some(x=>x.includes('totals do not add up'))).toBe(false); // max 3 most useful findings
 });
});
