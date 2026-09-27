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
async function file(){fireEvent.change(screen.getByLabelText('Receipt file'),{target:{files:[new File(['receipt'],'receipt.png',{type:'image/png'})]}});await screen.findByText('Photo attached');}
describe('Add Expense',()=>{
 it('defaults Other and the supplied source, with one manual save',async()=>{
  mount({initialSource:'contractor_charge'});
  expect(screen.getByLabelText('Category')).toHaveValue('Other');
  expect(screen.getByRole('button',{name:'Contractor charge'})).toHaveAttribute('aria-pressed','true');
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalledTimes(1));
  expect(fixture.save.mock.calls[0][0]).toMatchObject({amount:45.2,source:'contractor_charge',receipt:null});
 });
 it('never uploads a manual attachment without opt-in and never invokes AI',async()=>{
  mount();await file();fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  expect(screen.getByLabelText('Save receipt to my records')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalled());
  expect(fixture.retain).not.toHaveBeenCalled();expect(fixture.extract).not.toHaveBeenCalled();
 });
 it('keeps the id and draft on failed save, cleans orphan upload, and retries',async()=>{
  fixture.save.mockRejectedValueOnce(new Error('failed'));mount();await file();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByLabelText('Save receipt to my records'));
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await screen.findByText(/Couldn’t save/);
  expect(fixture.remove).toHaveBeenCalled();expect(screen.getByLabelText('Amount (£)')).toHaveValue('45.20');
  const firstId=fixture.save.mock.calls[0][0].id;
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalledTimes(2));
  expect(fixture.save.mock.calls[1][0].id).toBe(firstId);
 });
 it('requires editable AI review and explicit confirmation before any save',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Scan with AI Pro'}));await file();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Extract for review'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Extract for review'}));
  await screen.findByText('Review extracted details');
  expect(fixture.save).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm and save expense'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'46.20'}});
  fireEvent.click(screen.getByLabelText('I checked these details against the receipt'));
  fireEvent.click(screen.getByRole('button',{name:'Confirm and save expense'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalled());
  expect(fixture.save.mock.calls[0][0]).toMatchObject({amount:46.2,category:'Fuel',receipt:null});
 });
 it('does not offer the statement trial for receipt scans',async()=>{
  fixture.status.mockResolvedValue({enabled:true,isPro:false});mount();
  fireEvent.click(screen.getByRole('button',{name:'Scan with AI Pro'}));
  await screen.findByText(/Receipt scanning requires Pro/);
  expect(screen.getByRole('button',{name:'Extract for review'})).toBeDisabled();
 });
 it('requires confirmation to discard and prevents duplicate saves while pending',async()=>{
  let finish;fixture.save.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));mount();
  fireEvent.change(screen.getByLabelText('Amount (£)'),{target:{value:'45.20'}});
  fireEvent.click(screen.getByRole('button',{name:'Close expense'}));
  expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
  fireEvent.click(screen.getByRole('button',{name:'Save expense'}));
  fireEvent.click(screen.getByRole('button',{name:'Saving…'}));
  expect(fixture.save).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Close expense'})).toBeDisabled();
  finish();await waitFor(()=>expect(fixture.close).toHaveBeenCalled());
 });
});
