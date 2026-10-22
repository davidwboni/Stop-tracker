import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import StatementReview from '../components/StatementReview';
import {createStatementReview,reviewIssues,reviewWarnings,captureIssues,calculatedBeforeVat,confirmBeforeVat,confirmedReview} from '../features/statements/reviewModel';
const period={id:'2026-08-17_2026-09-13',start:'2026-08-17',end:'2026-09-13'};
const extracted={periodStart:period.start,periodEnd:period.end,currency:'GBP',taxBasis:'excluded',contractorPayout:4217.69,statementAmount:5499.55,contractorFee:329.97,contractorCharges:951.89,charges:[{label:'lease',amount:525},{label:'other',amount:426.89}]};
const approved=()=>({...createStatementReview(extracted),reviewed:true,items:createStatementReview(extracted).items.map(i=>({...i,reviewed:true}))});
beforeEach(()=>{URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();});
it('requires only one overall payout confirmation, not separate charge checkboxes',()=>{
 const extractedDraft=createStatementReview(extracted);
 expect(reviewIssues(extractedDraft,period).map(i=>i.field)).toEqual(['reviewed']);
 expect(reviewWarnings(extractedDraft).length).toBeGreaterThan(0);
 expect(reviewIssues(approved(),period)).toEqual([]);
});
it('flags incomplete and inconsistent charges as warnings without blocking payout comparison',()=>{
 const d=approved();expect(confirmedReview(d).payoutPence).toBe(421769);
 d.items[0].amount='526';expect(reviewWarnings(d).some(i=>i.field==='charges')).toBe(true);
 expect(reviewIssues(d,period)).toEqual([]);
 d.payout='4218';expect(reviewWarnings(d).some(i=>i.field==='payout')).toBe(true);
 expect(reviewIssues(d,period)).toEqual([]);
});
it('blocks period/currency/tax mismatches and unknown mandatory payout',()=>{for(const patch of [{start:'2026-08-18'},{currency:'EUR'},{taxBasis:'included'},{taxBasis:'unknown'},{payout:''}])expect(reviewIssues({...approved(),...patch},period).length).toBeGreaterThan(0);});
it('permits payout-only comparison when subtotals or unchecked optional charge rows are present',()=>{
 const d={...approved(),gross:'',fee:'',charges:'',items:[{id:'x',label:'Unknown',amount:'',reviewed:false}]};
 expect(reviewIssues(d,period)).toEqual([]);
 expect(confirmedReview(d).charges).toEqual([]);
 expect(confirmedReview(d).payoutPence).toBe(421769);
});
it('keeps source transient and releases its object URL on exit',()=>{const view=render(<StatementReview draft={approved()} onChange={()=>{}} period={period} periods={[period]} file={new File(['image'],'statement.png',{type:'image/png'})} ready onContinue={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'View original statement'}));expect(screen.getByAltText('Original statement for checking extracted figures')).toHaveAttribute('src','blob:test');view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');});
it('correction clears confirmation and never invokes another AI extraction',()=>{const changed=vi.fn(),next=vi.fn();render(<StatementReview draft={approved()} onChange={changed} period={period} periods={[period]} ready onContinue={next}/>);fireEvent.change(screen.getByLabelText('Final contractor payout (£)'),{target:{value:'4210'}});expect(changed).toHaveBeenCalledWith(expect.objectContaining({payout:'4210',reviewed:false}));expect(next).not.toHaveBeenCalled();});
it('review screen shows one primary action and hides optional charges by default',()=>{
 const reviewed=approved();reviewed.items[0].reviewed=false;
 const next=vi.fn();
 render(<StatementReview draft={reviewed} onChange={()=>{}} period={period} periods={[period]} ready onContinue={next}/>);
 expect(screen.getByRole('button',{name:'Compare with my workdays'})).toBeEnabled();
 expect(screen.queryByRole('button',{name:/required check left/})).not.toBeInTheDocument();
 expect(screen.getByText(/Optional breakdown/)).toBeInTheDocument();
 expect(document.querySelector('.review-optional')).not.toHaveAttribute('open');
 fireEvent.click(screen.getByRole('button',{name:'Compare with my workdays'}));
 expect(next).toHaveBeenCalledTimes(1);
});
it('editing optional charges does not undo checked final payout and VAT confirmation',()=>{
 const changed=vi.fn();
 render(<StatementReview draft={approved()} onChange={changed} period={period} periods={[period]} ready onContinue={()=>{}}/>);
 fireEvent.click(screen.getByText(/Optional breakdown/));
 fireEvent.change(screen.getByLabelText('Total contractor charges (£)'),{target:{value:'950.00'}});
 expect(changed).toHaveBeenCalledWith(expect.objectContaining({charges:'950.00',reviewed:true}));
});
it('when expected pay is unavailable, review still permits saving a checked statement',()=>{
 const next=vi.fn();render(<StatementReview draft={approved()} onChange={()=>{}} period={period} periods={[period]} captureOnly ready onContinue={next}/>);
 const b=screen.getByRole('button',{name:'Save statement — compare later'});
 expect(b).toBeEnabled();fireEvent.click(b);expect(next).toHaveBeenCalledTimes(1);
});

it('allows an inclusive VAT statement to be saved as received but not compared',()=>{
 const draft={...createStatementReview(extracted),taxBasis:'included',payout:'4421.63',reviewed:true,items:createStatementReview(extracted).items.map(i=>({...i,reviewed:true}))};
 expect(reviewIssues(draft,period).some(i=>i.field==='taxBasis')).toBe(true);
 expect(captureIssues(draft,period)).toEqual([]);
 const saved=confirmedReview(draft,{asReceived:true});
 expect(saved).toMatchObject({payoutPence:442163,taxBasis:'included',requiresVatAdjustment:true,reviewed:false});
 const next=vi.fn(),saveDraft=vi.fn();
 render(<StatementReview draft={draft} onChange={()=>{}} period={period} periods={[period]} ready onContinue={next} onSaveDraft={saveDraft}/>);
 const save=screen.getByRole('button',{name:'Save statement — compare later'});
 expect(save).toBeEnabled();
 expect(screen.getByText(/Your statement payout includes VAT/)).toBeInTheDocument();
 fireEvent.click(save);
 expect(saveDraft).toHaveBeenCalledOnce();expect(next).not.toHaveBeenCalled();
});
it('converts only after entering the VAT value printed on statement and preserves both amounts',()=>{
 const initial={...createStatementReview(extracted),taxBasis:'included',payout:'4421.63',vatAmount:'736.94'};
 expect(calculatedBeforeVat(initial)).toBe('3684.69');
 expect(calculatedBeforeVat({...initial,vatAmount:''})).toBeNull();
 expect(calculatedBeforeVat({...initial,vatAmount:'5000'})).toBeNull();
 const adjusted=confirmBeforeVat(initial);
 expect(adjusted).toMatchObject({payout:'3684.69',vatAmount:'736.94',vatIncludedPayout:'4421.63',taxBasis:'excluded',reviewed:false});
 const approved=confirmedReview({...adjusted,reviewed:true});
 expect(approved).toMatchObject({payoutPence:368469,vatIncludedPayoutPence:442163,vatAmountPence:73694,requiresVatAdjustment:false,reviewed:true});
 const onChange=vi.fn();
 render(<StatementReview draft={initial} onChange={onChange} period={period} periods={[period]} ready onContinue={()=>{}} onSaveDraft={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Use £3684.69 before VAT for comparison'}));
 expect(onChange).toHaveBeenCalledWith(expect.objectContaining({payout:'3684.69',taxBasis:'excluded',reviewed:false}));
});
it('allows saving an incomplete comparison as received without treating it as checked',()=>{
 const incomplete={...createStatementReview(extracted),reviewed:false};
 const saveDraft=vi.fn(),compare=vi.fn();
 render(<StatementReview draft={incomplete} onChange={()=>{}} period={period} periods={[period]} ready onContinue={compare} onSaveDraft={saveDraft}/>);
 expect(screen.getByRole('button',{name:'Compare with my workdays'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Save as received — compare later'}));
 expect(saveDraft).toHaveBeenCalledOnce();
 expect(compare).not.toHaveBeenCalled();
});
it('cannot archive a foreign or mismatched pay period as the selected one',()=>{
 const valid={...createStatementReview(extracted),taxBasis:'included',payout:'4421.63'};
 expect(captureIssues({...valid,start:'2026-01-01'},period).map(x=>x.field)).toContain('start');
 expect(captureIssues({...valid,currency:'USD'},period).map(x=>x.field)).toContain('currency');
 expect(captureIssues({...valid,payout:''},period).map(x=>x.field)).toContain('payout');
});
