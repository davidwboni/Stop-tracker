import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import StatementReview from '../components/StatementReview';
import {createStatementReview,reviewIssues,reviewWarnings,confirmedReview} from '../features/statements/reviewModel';
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
