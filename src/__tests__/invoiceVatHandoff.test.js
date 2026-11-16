import {describe,it,expect} from 'vitest';
import {statementInvoiceAmounts} from '../features/statements/invoiceAmounts';
import {invoicePdfBreakdown} from '../services/invoicePdf';
describe('exact contractor statement VAT handoff to invoices',()=>{
 const base={payoutComparison:{statementPence:310889},reviewedStatement:{payoutPence:310889,vatIncludedPayoutPence:373067,vatAmountPence:62178}};
 it('preserves £3,108.89 before VAT, £621.78 VAT, £3,730.67 total',()=>{
   expect(statementInvoiceAmounts(base)).toEqual({netPence:310889,vatPence:62178,vatInclusivePence:373067,vatEvidence:true});
 });
 it('never guesses VAT from missing or contradictory statement figures',()=>{
   expect(statementInvoiceAmounts({...base,reviewedStatement:{vatIncludedPayoutPence:373066,vatAmountPence:62178}}).vatEvidence).toBe(false);
   expect(statementInvoiceAmounts({payoutComparison:{statementPence:310889}}).vatEvidence).toBe(false);
   expect(statementInvoiceAmounts({payoutComparison:{statementPence:null}})).toBeNull();
 });
 it('PDF includes VAT only after one explicit registered-driver confirmation',()=>{
   expect(invoicePdfBreakdown({invoiceAmount:'3108.89'})).toEqual({netPence:310889,vatPence:0,totalPence:310889,vatApplied:false});
   expect(invoicePdfBreakdown({invoiceAmount:'3730.67',netAmount:'3108.89',vatAmount:'621.78',vatConfirmedFromStatement:true}))
    .toEqual({netPence:310889,vatPence:62178,totalPence:373067,vatApplied:true});
 });
 it('rejects a stored PDF if the VAT breakdown has become inconsistent',()=>{
   expect(()=>invoicePdfBreakdown({invoiceAmount:'3730.67',netAmount:'3108.89',vatAmount:'621.77',vatConfirmedFromStatement:true})).toThrow(/no longer match/);
   expect(()=>invoicePdfBreakdown({invoiceAmount:'abc'})).toThrow(/invalid/);
 });
});
