import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import DocumentsPage from '../components/DocumentsPage';
import RecordsHub from '../components/RecordsHub';
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Driver Example'}})}));

const f=vi.hoisted(()=>({data:{},invoice:{},download:vi.fn(),deleteInvoice:vi.fn(),confirmSent:vi.fn()}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../contexts/InvoiceContext',()=>({useInvoice:()=>f.invoice}));
vi.mock('../services/invoicePdf',()=>({downloadSavedInvoice:(...a)=>f.download(...a),shareSavedInvoice:vi.fn()}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.mock('../components/EntriesPage',()=>({default:()=>null}));
vi.mock('../components/ExpensesOverview',()=>({default:()=>null}));

const id='2026-08-17_2026-09-13';
const invoice={id:'one',invoiceNumber:6,clientName:'Sample contractor',invoiceAmount:'1000.00',dateFrom:'2026-08-17',dateTo:'2026-09-13',senderSnapshot:{name:'Driver'},clientSnapshot:{name:'Sample contractor'},status:'generated',periodId:id};
const mount=(embedded=false)=>render(<MemoryRouter initialEntries={['/app/documents']}><DocumentsPage embedded={embedded}/></MemoryRouter>);
function Landing(){const location=useLocation();return <div data-testid="link-destination">{JSON.stringify({path:location.pathname,state:location.state})}</div>}
const follow=()=>render(<MemoryRouter initialEntries={['/app/documents']}><Routes>
 <Route path="/app/documents" element={<DocumentsPage/>}/>
 <Route path="/app/invoice" element={<Landing/>}/>
 <Route path="/app/check-pay" element={<Landing/>}/>
 </Routes></MemoryRouter>);
const matched={status:'checked',needsReview:false,payoutComparison:{scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,start:'2026-08-17',end:'2026-09-13',expectedPence:9400,statementPence:9400}};
beforeEach(()=>{vi.clearAllMocks();f.download.mockResolvedValue();f.data={periodRecords:{[id]:{status:'reconciled',payoutComparison:{start:'2026-08-17',end:'2026-09-13'}}},loading:false,loadError:''};f.invoice={invoices:[invoice],loading:false,loadError:'',deleteInvoice:f.deleteInvoice,confirmInvoiceSent:f.confirmSent,retry:vi.fn()};});
describe('Documents on one page',()=>{
 it('shows saved statements and invoices without forcing a second tab',()=>{
  mount();
  expect(screen.getByRole('heading',{name:'Statements'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Invoices'})).toBeInTheDocument();
  expect(screen.getByText(/17 Aug 2026 – 13 Sept 2026/)).toBeInTheDocument();
  expect(screen.getByText(/Reconciled · Not proof of payment/)).toBeInTheDocument();
  expect(screen.getByText('INV-0006')).toBeInTheDocument();
  expect(screen.getByText('£1,000.00')).toBeInTheDocument();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Create invoice manually'})).toHaveAttribute('href','/app/invoice');
  expect(screen.getByRole('link',{name:/Check pay before invoicing/})).toHaveAttribute('href','/app/check-pay');
 });
 it('downloads a saved invoice directly in the same section',async()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Download'}));
  await waitFor(()=>expect(f.download).toHaveBeenCalledWith(invoice));
 });
 it('keeps deletion deliberately behind secondary options',()=>{
  mount();
  const options=screen.getByText('More options').closest('details');
  expect(options).not.toHaveAttribute('open');
  fireEvent.click(options.querySelector('summary'));
  expect(options).toHaveAttribute('open');
  expect(screen.getByRole('button',{name:'Delete invoice record'})).toBeInTheDocument();
 });
 it('preserves correct empty states and an invoice creation path',()=>{
  f.data.periodRecords={};f.invoice.invoices=[];mount();
  expect(screen.getByText('No statements checked yet.')).toBeInTheDocument();
  expect(screen.getByText('No invoices created yet')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/Check statement/})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Create invoice manually'})).toHaveAttribute('href','/app/invoice');
  expect(screen.getByRole('link',{name:/Check pay before invoicing/})).toBeInTheDocument();
 });
 it('does not pretend a failed invoice load means no invoices',()=>{
  f.invoice.loadError='Invoices unavailable';f.invoice.invoices=[];mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Invoices unavailable');
  expect(screen.queryByText('No invoices created yet')).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Create invoice manually'})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/Check pay before invoicing/})).not.toBeInTheDocument();
 });
 it('continues an eligible checked payout with its period, instead of starting an empty invoice',()=>{
  f.data.periodRecords={[id]:matched};f.invoice.invoices=[];follow();
  fireEvent.click(screen.getByRole('link',{name:/Prepare from checked pay/}));
  expect(JSON.parse(screen.getByTestId('link-destination').textContent)).toEqual({path:'/app/invoice',state:{fromPay:true,periodId:id}});
 });
 it('routes an unresolved difference to Pay and leaves manual invoicing optional',()=>{
  f.data.periodRecords={[id]:{...matched,payoutComparison:{...matched.payoutComparison,statementPence:9300}}};
  f.invoice.invoices=[];follow();
  expect(screen.queryByRole('link',{name:/Prepare from checked pay/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link',{name:/Check pay before invoicing/}));
  expect(JSON.parse(screen.getByTestId('link-destination').textContent)).toEqual({path:'/app/check-pay',state:{periodId:id}});
 });
 it('does not promote an invalidated check or an already invoiced period',()=>{
  f.data.periodRecords={[id]:{...matched,needsReview:true}};f.invoice.invoices=[];
  const view=mount();
  expect(screen.queryByRole('link',{name:/Prepare from checked pay/})).not.toBeInTheDocument();
  view.unmount();f.data.periodRecords={[id]:matched};f.invoice.invoices=[invoice];mount();
  expect(screen.queryByRole('link',{name:/Prepare from checked pay/})).not.toBeInTheDocument();
 });
 it('does not offer checked-pay shortcuts while work records are unavailable',()=>{
  f.data.periodRecords={[id]:matched};f.data.loadError='Offline';f.invoice.invoices=[];mount();
  expect(screen.queryByRole('link',{name:/Prepare from checked pay/})).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Create invoice manually'})).not.toBeInTheDocument();
 });
 it('does not repeat Documents title under Records navigation',()=>{
  render(<MemoryRouter initialEntries={['/app/records?tab=documents']}><RecordsHub/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Records'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Documents'})).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Statements'})).toBeInTheDocument();
 });
});

it('lets a driver explicitly mark a saved invoice sent from Records without claiming delivery',async()=>{
 vi.spyOn(window,'confirm').mockReturnValue(true);f.confirmSent.mockResolvedValue();
 mount();
 const opts=screen.getByText('More options').closest('details');
 fireEvent.click(opts.querySelector('summary'));
 fireEvent.click(screen.getByRole('button',{name:'Mark as sent'}));
 await waitFor(()=>expect(f.confirmSent).toHaveBeenCalledWith('one'));
});
