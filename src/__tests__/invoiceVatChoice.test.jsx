import React from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import InvoiceCreate from '../components/InvoiceCreate';
const stub=vi.hoisted(()=>({context:{},add:vi.fn()}));
vi.mock('../contexts/InvoiceContext',()=>({useInvoice:()=>stub.context}));
beforeEach(()=>{
 stub.add.mockReset();
 stub.context={
  clients:[{id:'contractor',name:'Contractor',email:'accounts@example.com'}],defaultClientId:'contractor',
  senderProfile:{name:'Delivery Driver',address:'United Kingdom',email:'driver@example.com'},
  getNextInvoiceNumber:()=>18,
  saveClient:vi.fn(),saveSenderProfile:vi.fn(),addInvoice:stub.add,confirmInvoiceSent:vi.fn()
 };
});
const prefill={
 periodId:'2026-10-12_2026-11-08',startDate:'2026-10-12',endDate:'2026-11-08',
 statementAmount:'3108.89',vatAmount:'621.78',vatInclusiveAmount:'3730.67'
};
describe('low-friction invoice VAT handoff',()=>{
 it('shows source amounts but never silently adds VAT without user confirmation',async()=>{
  render(<InvoiceCreate prefill={prefill}/>);
  expect(screen.getByLabelText('Amount to invoice')).toHaveValue('3108.89');
  expect(screen.getByText(/Before VAT: £3108.89/)).toBeInTheDocument();
  expect(screen.getByText(/VAT: £621.78/)).toBeInTheDocument();
  expect(screen.getByText(/Total: £3730.67/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:'Include VAT shown on contractor statement'})).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox',{name:'Include VAT shown on contractor statement'}));
  expect(screen.getByLabelText('Amount to invoice')).toHaveValue('3730.67');
  fireEvent.click(screen.getByRole('checkbox',{name:'Include VAT shown on contractor statement'}));
  expect(screen.getByLabelText('Amount to invoice')).toHaveValue('3108.89');
  expect(stub.add).not.toHaveBeenCalled();
 });
 it('editing the total clears the VAT selection instead of preserving a false breakdown',()=>{
  render(<InvoiceCreate prefill={prefill}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Include VAT shown on contractor statement'}));
  fireEvent.change(screen.getByLabelText('Amount to invoice'),{target:{value:'3650.00'}});
  expect(screen.getByRole('checkbox',{name:'Include VAT shown on contractor statement'})).not.toBeChecked();
  expect(screen.getByLabelText('Amount to invoice')).toHaveValue('3650.00');
 });
 it('hides VAT choice for older or non-reconciling contractor statements',()=>{
  render(<InvoiceCreate prefill={{...prefill,vatInclusiveAmount:'3730.66'}}/>);
  expect(screen.queryByRole('checkbox',{name:'Include VAT shown on contractor statement'})).not.toBeInTheDocument();
 });
});