import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import RecordsHub from '../components/RecordsHub';
const f=vi.hoisted(()=>({data:{},expenses:vi.fn()}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Example Driver'}})}));
vi.mock('../contexts/DataContext',()=>({useData:()=>f.data}));
vi.mock('../components/DailyQuickEntry',()=>({default:()=>null}));
vi.mock('../components/ExpensesOverview',()=>({default:({privacyHidden})=><output data-testid="expenses-private">{privacyHidden?'hidden':'visible'}</output>}));
vi.mock('../components/DocumentsPage',()=>({default:()=>null}));
const day=n=>({
 id:'log-'+n,date:'2026-09-'+String(n).padStart(2,'0'),
 stops:100+n,quantity:100+n,totalParcels:105+n,extra:0,
 total:200+n,payStructureSnapshot:{model:'flat_stops',ratePerStop:2.08,contractorFeePercent:6}
});
beforeEach(()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
 localStorage.clear();
 f.data={logs:Array.from({length:12},(_,n)=>day(n+1)),loading:false,loadError:'',updateLogs:vi.fn().mockResolvedValue({success:true})};
});
function mount(){return render(<MemoryRouter initialEntries={['/app/records']}><RecordsHub/></MemoryRouter>);}
describe('Driver-first Work records',()=>{
 it('has one page heading and a compact Your days section with one Add action',()=>{
  mount();
  expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
  expect(screen.getByRole('heading',{name:'Records'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Your days'})).toBeInTheDocument();
  expect(screen.getByText('12 days recorded')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:'Add day'})).toHaveLength(1);
  expect(screen.getByText('Find a day')).toBeInTheDocument();
  expect(screen.queryByText('Back to Home')).not.toBeInTheDocument();
 });
 it('paginates ordered workdays and reset filters without modifying records',()=>{
  mount();
  expect(screen.getByRole('navigation',{name:'Work record pages'})).toHaveTextContent('Page 1 of 2');
  expect(screen.getByRole('button',{name:/View work for Sat, 12 Sept 2026/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  const search=screen.getByText('Find a day').closest('details').querySelector('summary');
  fireEvent.click(search);
  fireEvent.change(screen.getByLabelText('Search date, stops or notes'),{target:{value:'2026-09-05'}});
  expect(screen.getByRole('button',{name:/View work for Sat, 5 Sept 2026/})).toBeInTheDocument();
  expect(screen.queryByText('Page 2 of 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
 });
 it('filters missing historical pay details only inside the selected period',()=>{
  f.data.logs=[day(2),{...day(4),payStructureSnapshot:undefined},day(10),{...day(14),payStructureSnapshot:undefined}];
  render(<MemoryRouter initialEntries={[{pathname:'/app/records',search:'?payReview=1',state:{periodId:'2026-09-01_2026-09-07'}}]}><RecordsHub/></MemoryRouter>);
  expect(screen.getByText('1 day needs pay details')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/View work for Fri, 4 Sept 2026/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/View work for Mon, 14 Sept 2026/})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:/Back to Pay/})).toHaveAttribute('href','/app/check-pay');
 });
 it('hides monetary amounts in Work and keeps the preference across Records tabs',()=>{
  mount();
  expect(screen.getAllByText('£212.00').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
  expect(localStorage.getItem('home-hide-money')).toBe('1');
  expect(screen.queryByText('£212.00')).not.toBeInTheDocument();
  expect(document.querySelector('.work-entry-list')).toHaveTextContent('••••');
  fireEvent.click(screen.getByRole('button',{name:'Expenses'}));
  expect(screen.getByTestId('expenses-private')).toHaveTextContent('hidden');
  fireEvent.click(screen.getByRole('button',{name:'Work'}));
  expect(document.querySelector('.work-entry-list')).toHaveTextContent('••••');
 });
 it('asks to delete a day in a centered dialog without hiding controls below work details',async()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:/View work for Sat, 12 Sept 2026/}));
  expect(screen.getByRole('button',{name:'Edit this day'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Delete record'}));
  const confirmation=screen.getByRole('dialog',{name:'Delete saved day?'});
  expect(confirmation).toHaveClass('drs-root');
  expect(document.querySelector('.drs-confirm-panel')).toBeInTheDocument();
  expect(document.querySelector('.drs-confirm-position')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Edit this day'})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Keep day'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Delete day'})).toBeEnabled();
  expect(f.data.updateLogs).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Keep day'}));
  expect(screen.queryByRole('heading',{name:'Delete saved day?'})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Edit this day'})).toBeInTheDocument();
  expect(f.data.updateLogs).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Delete record'}));
  fireEvent.click(screen.getByRole('button',{name:'Delete day'}));
  await waitFor(()=>expect(f.data.updateLogs).toHaveBeenCalledTimes(1));
  expect(f.data.updateLogs.mock.calls[0][0]).toHaveLength(11);
  expect(f.data.updateLogs.mock.calls[0][0].some(item=>item.id==='log-12')).toBe(false);
  await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Delete saved day?'})).not.toBeInTheDocument());
 });
 it('preserves the record and lets the driver retry if deletion fails',async()=>{
  f.data.updateLogs.mockRejectedValueOnce(new Error('Offline'));
  mount();
  fireEvent.click(screen.getByRole('button',{name:/View work for Sat, 12 Sept 2026/}));
  fireEvent.click(screen.getByRole('button',{name:'Delete record'}));
  fireEvent.click(screen.getByRole('button',{name:'Delete day'}));
  expect(await screen.findByText('This day could not be deleted. Please try again.')).toBeInTheDocument();
  expect(screen.getByRole('dialog',{name:'Delete saved day?'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Keep day'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Delete day'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Keep day'}));
  expect(screen.getByRole('button',{name:'Edit this day'})).toBeInTheDocument();
  expect(screen.getByText('12 days recorded')).toBeInTheDocument();
 });
 it('still opens a saved day for inspection without immediately changing it',()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:/View work for Sat, 12 Sept 2026/}));
  expect(screen.getByRole('heading',{name:/12 September 2026/})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Edit this day'})).toBeInTheDocument();
  expect(f.data.updateLogs).not.toHaveBeenCalled();
 });
});
