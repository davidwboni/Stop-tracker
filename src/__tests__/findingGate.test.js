import {describe,it,expect} from 'vitest';
import {unresolvedStatementFindings,statementInvoiceReady,mergeFindingDecisions,requiresLimitedCoverageAcceptance} from '../features/statements/findingGate';
const saved={payoutComparison:{statementPence:20000},reviewedStatement:{reviewed:true},
 statementFindings:{flagged:[{date:'2026-09-14',loggedStops:120,statementStops:119,acceptedReason:null},
 {date:'2026-09-15',acceptedReason:'possible_duplicate_accepted'},
 {date:'2026-09-16',acceptedReason:'dispute'}]}};
describe('V5 statement-to-invoice safeguards',()=>{
 it('does not let identical period totals erase unresolved day findings',()=>{
   expect(statementInvoiceReady(saved)).toBe(false);
   expect(unresolvedStatementFindings(saved).map(x=>x.date)).toEqual(['2026-09-14','2026-09-16']);
 });
 it('allows a driver-confirmed acceptable duplicate while leaving source records intact',()=>{
   const checked={...saved,statementFindings:{flagged:saved.statementFindings.flagged.map(d=>({...d,acceptedReason:'possible_duplicate_accepted'}))}};
   expect(statementInvoiceReady(checked)).toBe(true);
   expect(saved.statementFindings.flagged[0].acceptedReason).toBeNull();
 });
 it('a declared dispute remains open; only accepted and verified resolve the block',()=>{
   const disputed={...saved,statementFindings:{flagged:[{date:'2026-09-15',acceptedReason:'dispute'}]}};
   expect(statementInvoiceReady(disputed)).toBe(false);
   const resolved={...disputed,statementFindings:{flagged:[{date:'2026-09-15',acceptedReason:'figures_verified'}]}};
   expect(statementInvoiceReady(resolved)).toBe(true);
 });
 it('preserves old confirmed comparisons that were recorded before finding metadata existed',()=>{
   expect(statementInvoiceReady({payoutComparison:{statementPence:19000}})).toBe(true);
   expect(statementInvoiceReady({statementFindings:{flagged:[]}})).toBe(false);
   expect(statementInvoiceReady({payoutComparison:{},statementFindings:{flagged:[]},reviewedStatement:{reviewed:false}})).toBe(false);
 });
 it('prevents invoice from summary-only or incomplete workday checks until limitation is accepted',()=>{
   const base={payoutComparison:{statementPence:30000},reviewedStatement:{reviewed:true},statementFindings:{flagged:[],hasDaily:false,summaryOnly:true,incompleteDays:0,limitedCoverageAccepted:false}};
   expect(requiresLimitedCoverageAcceptance(base.statementFindings)).toBe(true);
   expect(statementInvoiceReady(base)).toBe(false);
   expect(statementInvoiceReady({...base,statementFindings:{...base.statementFindings,limitedCoverageAccepted:true}})).toBe(true);
   const unknown={...base,statementFindings:{...base.statementFindings,hasDaily:true,summaryOnly:false,incompleteDays:2,limitedCoverageAccepted:false}};
   expect(statementInvoiceReady(unknown)).toBe(false);
   expect(statementInvoiceReady({...unknown,statementFindings:{...unknown.statementFindings,limitedCoverageAccepted:true}})).toBe(true);
   expect(statementInvoiceReady({...base,statementFindings:{...base.statementFindings,flagged:[{date:'2026-09-14',acceptedReason:'dispute'}],limitedCoverageAccepted:true}})).toBe(false);
 });
 it('keeps invoice readiness when all real daily entries are reviewed and complete',()=>{
   const full={payoutComparison:{statementPence:28000},reviewedStatement:{reviewed:true},statementFindings:{hasDaily:true,summaryOnly:false,incompleteDays:0,outsidePeriod:0,limitedCoverageAccepted:true,flagged:[]}};
   expect(requiresLimitedCoverageAcceptance(full.statementFindings)).toBe(false);
   expect(statementInvoiceReady(full)).toBe(true);
 });
 it('restores saved decisions without inventing missing user confirmations',()=>{
   expect(mergeFindingDecisions(saved)).toEqual({'2026-09-15':'possible_duplicate_accepted','2026-09-16':'dispute'});
   expect(mergeFindingDecisions(null)).toEqual({});
 });
});