import {describe,it,expect} from 'vitest';
import {compactStatementScan} from '../features/statements/scanDraft';
describe('private and bounded persistent AI drafts',()=>{
 it('preserves financial evidence while discarding source image and personal details',()=>{
   const draft=compactStatementScan({
     currency:'GBP',periodStart:'2026-10-12',periodEnd:'2026-11-08',taxBasis:'included',
     contractorPayout:3730.67,vatAmount:621.78,statementAmount:5990.62,contractorCharges:1591.62,
     driverName:'PRIVATE DRIVER',bankAccount:'PRIVATE ACCOUNT',fileBase64:'LONG-SECRET',
     daily:[{date:'2026-10-21',stops:97,amount:205.33,driverName:'PRIVATE'}],
     charges:[{label:'Vehicle lease',amount:585.32,iban:'PRIVATE'}],
     extraPayments:[{date:'2026-11-02',amount:150,category:'route',driverName:'PRIVATE'}]
   });
   expect(draft).toMatchObject({
     currency:'GBP',contractorPayout:3730.67,vatAmount:621.78,
     daily:[{date:'2026-10-21',stops:97,amount:205.33}],
     charges:[{label:'Vehicle lease',amount:585.32}]
   });
   const raw=JSON.stringify(draft);
   expect(raw).not.toContain('PRIVATE');
   expect(raw).not.toContain('LONG-SECRET');
   expect(raw).not.toContain('bankAccount');
   expect(raw).not.toContain('fileBase64');
 });
 it('caps malformed or huge provider output to a small known schema',()=>{
   const fake=Array.from({length:500},(_,i)=>({date:'2026-10-21',stops:200,amount:150}));
   const result=compactStatementScan({currency:'UNKNOWN',taxBasis:'ambiguous',daily:fake,charges:Array(80).fill({label:'x'.repeat(500),amount:5})});
   expect(result.daily).toHaveLength(366);
   expect(result.charges).toHaveLength(40);
   expect(result.charges[0].label.length).toBe(100);
   expect(result.taxBasis).toBe('unknown');
   expect(result.currency).toBe('unknown');
 });
 it('does not fabricate a missing contractor payout',()=>{
   expect(compactStatementScan({daily:[{date:'2026-10-12',stops:110}]}).contractorPayout).toBeNull();
 });
});