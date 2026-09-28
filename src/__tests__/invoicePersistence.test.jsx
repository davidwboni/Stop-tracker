import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {InvoiceProvider,useInvoice} from '../contexts/InvoiceContext';
const f=vi.hoisted(()=>({user:{uid:'a',isGuest:true},get:vi.fn(),transaction:vi.fn()}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:f.user})}));
vi.mock('../services/firebase',()=>({db:{}}));
vi.mock('firebase/firestore',()=>({doc:(_,collection,id)=>({collection,id}),getDoc:(...a)=>f.get(...a),runTransaction:(...a)=>f.transaction(...a)}));
function Harness(){const c=useInvoice(),[error,setError]=React.useState('');return <><span>{c.loading?'Loading':'Ready'}</span><div data-testid="names">{c.invoices.map(i=>i.clientName).join(',')}</div><button disabled={c.loading} onClick={()=>c.addInvoice({invoiceNumber:1,clientName:'Synthetic Client'}).catch(e=>setError(e.message))}>Save invoice</button><p>{error}</p></>;}
beforeEach(()=>{localStorage.clear();f.user={uid:'a',isGuest:true};f.get.mockReset();f.get.mockResolvedValue({data:()=>({})});f.transaction.mockReset();});
afterEach(()=>vi.restoreAllMocks());
it('retains the invoice only after device persistence succeeds',async()=>{
 render(<InvoiceProvider><Harness/></InvoiceProvider>);await screen.findByText('Ready');
 fireEvent.click(screen.getByText('Save invoice'));
 await waitFor(()=>expect(screen.getByTestId('names')).toHaveTextContent('Synthetic Client'));
 expect(JSON.parse(localStorage.getItem('invoiceData_a')).invoices).toHaveLength(1);
});
it('storage failure leaves the ledger unchanged and surfaces the failure',async()=>{
 render(<InvoiceProvider><Harness/></InvoiceProvider>);await screen.findByText('Ready');
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Storage full');});
 fireEvent.click(screen.getByText('Save invoice'));await screen.findByText('Storage full');
 expect(screen.getByTestId('names')).toBeEmptyDOMElement();
});
it('a failed cloud transaction cannot appear as a saved invoice',async()=>{
 f.user={uid:'a',isGuest:false};f.transaction.mockRejectedValue(new Error('Connection failed'));
 render(<InvoiceProvider><Harness/></InvoiceProvider>);await screen.findByText('Ready');
 fireEvent.click(screen.getByText('Save invoice'));await screen.findByText('Connection failed');
 expect(screen.getByTestId('names')).toBeEmptyDOMElement();
});
it('changing account immediately removes the previous account invoice list',async()=>{
 localStorage.setItem('invoiceData_a',JSON.stringify({invoices:[{clientName:'Account A'}],clients:[]}));
 const view=render(<InvoiceProvider><Harness/></InvoiceProvider>);await screen.findByText('Account A');
 f.user={uid:'b',isGuest:true};view.rerender(<InvoiceProvider><Harness/></InvoiceProvider>);
 expect(screen.queryByText('Account A')).not.toBeInTheDocument();await screen.findByText('Ready');
 expect(screen.getByTestId('names')).toBeEmptyDOMElement();
});
