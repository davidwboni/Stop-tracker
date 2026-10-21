import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeExpenseDialog from '../components/HomeExpenseDialog';
const fixture=vi.hoisted(()=>({save:vi.fn(),close:vi.fn(),retain:vi.fn(),remove:vi.fn(),extract:vi.fn(),status:vi.fn()}));
vi.mock('../services/firebase',()=>({storage:{},functions:{}}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'owner'}})}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.mock('../services/expenseReceipts',()=>({validateReceipt:()=>{},retainReceipt:fixture.retain,removeReceipt:fixture.remove,extractReceipt:fixture.extract,getReceiptStatus:fixture.status}));
vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
URL.createObjectURL=vi.fn(()=>'blob:test');URL.revokeObjectURL=vi.fn();
beforeEach(()=>{vi.clearAllMocks();fixture.save.mockResolvedValue();fixture.retain.mockResolvedValue({path:'users/owner/receipts/id/file',type:'image/png'});fixture.status.mockResolvedValue({enabled:true,isPro:true});fixture.extract.mockResolvedValue({amount:45.2,date:'2026-09-26',currency:'GBP',description:'Shell',category:'Fuel'});});
const mount=(props={})=>render(<HomeExpenseDialog open onClose={fixture.close} save={fixture.save} {...props}/>);
async function file(){fireEvent.change(screen.getByLabelText('Receipt file'),{target:{files:[new File(['receipt'],'receipt.png',{type:'image/png'})]}});await screen.findByText('Photo selected');}
describe('Add Expense',()=>{
 it('opens a compact method choice without rendering an empty receipt container',()=>{
  mount();
  expect(screen.getByRole('group',{name:'How to add an expense'})).toBeInTheDocument();
  expect(document.querySelector('.ae-panel:has(.ae-choice)')).toBeInTheDocument();
  expect(document.querySelector('.ae-receipt')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Attach receipt/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));
  expect(document.querySelector('.ae-choice')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Attach receipt/})).toBeInTheDocument();
 });
 it('new manual expenses always default to personal costs and do not require category',async()=>{
  mount({initialSource:'contractor_charge'});
  expect(screen.getByRole('group',{name:'How to add an expense'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));
  expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
  expect(screen.queryByText('Contractor charge')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalledTimes(1));
  expect(fixture.save.mock.calls[0][0]).toMatchObject({amount:45.2,source:'my_expense',category:'Other',receipt:null});
 });
 it('keeps today selected by default with an optional description and changeable date',()=>{
   mount();
   fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));
   expect(screen.getByLabelText(/What was it for/)).toHaveValue('');
   expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:/Change date/}));
   expect(screen.getByLabelText('Date')).toBeInTheDocument();
 });
 it('preserves historical contractor-charge source when editing an existing record',async()=>{
   mount({initialExpense:{id:'old-charge',date:'2026-09-26',amount:30,source:'contractor_charge',category:'Lease',description:'Old vehicle lease'}});
   expect(screen.getByText(/older record was saved as a contractor charge/)).toBeInTheDocument();
   fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
   await waitFor(()=>expect(fixture.save).toHaveBeenCalled());
   expect(fixture.save.mock.calls[0][0]).toMatchObject({id:'old-charge',source:'contractor_charge',category:'Lease'});
 });
 it('never uploads a manual attachment without opt-in and never invokes AI',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));await file();fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  expect(screen.getByLabelText('Save receipt with expense')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalled());
  expect(fixture.retain).not.toHaveBeenCalled();expect(fixture.extract).not.toHaveBeenCalled();
 });
 it('keeps the id and draft on failed save, cleans orphan upload, and retries',async()=>{
  fixture.save.mockRejectedValueOnce(new Error('failed'));mount();fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));await file();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByLabelText('Save receipt with expense'));
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await screen.findByText(/Couldn’t save/);
  expect(fixture.remove).toHaveBeenCalled();expect(screen.getByLabelText('Amount (£)')).toHaveValue('45.20');
  const firstId=fixture.save.mock.calls[0][0].id;
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalledTimes(2));
  expect(fixture.save.mock.calls[1][0].id).toBe(firstId);
 });
 it('requires editable AI review and explicit confirmation before any save',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:/Scan receipt with AI/}));await file();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Extract for review'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Extract for review'}));
  await screen.findByText('Review AI-extracted details');
  expect(fixture.save).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm and save expense'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'46.20'}});
  fireEvent.click(screen.getByLabelText("I've checked these details against my receipt"));
  fireEvent.click(screen.getByRole('button',{name:'Confirm and save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalled());
  expect(fixture.save.mock.calls[0][0]).toMatchObject({amount:46.2,category:'Fuel',receipt:null});
 });
 it('allows receipt scanning during temporary beta without claiming the user has Pro',async()=>{
   fixture.status.mockResolvedValue({enabled:true,isPro:false,betaAccess:true});
   mount();fireEvent.click(screen.getByRole('button',{name:/Scan receipt with AI/}));
   await screen.findByText(/Receipt AI is free during testing/);
   await file();
   expect(screen.getByRole('button',{name:'Extract for review'})).toBeEnabled();
   fireEvent.click(screen.getByRole('button',{name:'Extract for review'}));
   expect(await screen.findByText('Review AI-extracted details')).toBeInTheDocument();
   expect(fixture.save).not.toHaveBeenCalled();
 });
 it('does not offer the statement trial for receipt scans',async()=>{
  fixture.status.mockResolvedValue({enabled:true,isPro:false});mount();
  fireEvent.click(screen.getByRole('button',{name:/Scan receipt with AI/}));
  await screen.findByText(/Scanning requires Pro/);
  expect(screen.getByRole('button',{name:'Extract for review'})).toBeDisabled();
 });
 it('requires confirmation to discard and prevents duplicate saves while pending',async()=>{
  let finish;fixture.save.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));mount();fireEvent.click(screen.getByRole('button',{name:/Enter manually/}));
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByRole('button',{name:'Close expense'}));
  expect(screen.getByText('Discard changes?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  fireEvent.click(screen.getByRole('button',{name:'Saving…'}));
  expect(fixture.save).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Close expense'})).toBeDisabled();
  finish();await waitFor(()=>expect(fixture.close).toHaveBeenCalled());
 });
});
