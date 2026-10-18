import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import AppNavigation from '../components/AppNavigation';
import RecordsHub from '../components/RecordsHub';
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'test',displayName:'Driver Example'}})}));

vi.mock('../components/EntriesPage',()=>({default:()=> <div>Daily work history visible</div>}));
vi.mock('../components/ExpensesOverview',()=>({default:()=> <div>Expense records visible</div>}));
vi.mock('../components/DocumentsPage',()=>({default:()=> <div>Statement and invoice documents visible</div>}));

beforeEach(()=>{vi.stubGlobal('scrollTo',vi.fn());vi.stubGlobal('matchMedia',()=>({matches:false,addListener:()=>{},removeListener:()=>{}}));});
const LocationLabel=()=>{const location=useLocation();return <output data-testid="location">{location.pathname+location.search}</output>};
function mount(path){
 return render(<MemoryRouter initialEntries={[path]}>
  <AppNavigation/>
  <Routes>
   <Route path="/app/dashboard" element={<h1>Home screen</h1>}/>
   <Route path="/app/records" element={<RecordsHub/>}/>
   <Route path="/app/check-pay" element={<h1>Pay screen</h1>}/>
   <Route path="/app/routes" element={<h1>Routes screen</h1>}/>
   <Route path="/app/profile" element={<h1>Profile screen</h1>}/>
  </Routes>
  <LocationLabel/>
 </MemoryRouter>);
}
describe('Customer-first navigation',()=>{
 it('has exactly four primary tabs and opens Work records first',()=>{
  mount('/app/dashboard');
  expect(screen.getByRole('navigation',{name:'Main navigation'}).querySelectorAll('button')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button',{name:'Records'}));
  expect(screen.getByText('Daily work history visible')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Work'}).getAttribute('aria-current')).toBe('page');
 });
 it('switches Records sections without hiding their content',()=>{
  mount('/app/records');
  fireEvent.click(screen.getByRole('button',{name:'Expenses'}));
  expect(screen.getByText('Expense records visible')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Documents'}));
  expect(screen.getByText('Statement and invoice documents visible')).toBeTruthy();
  expect(screen.getByTestId('location').textContent).toBe('/app/records?tab=documents');
 });
 it('deep-links to documents, returns to Pay, and keeps Profile reachable',()=>{
  mount('/app/records?tab=documents');
  expect(screen.getByText('Statement and invoice documents visible')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Pay'}));
  expect(screen.getByRole('heading',{name:'Pay screen'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Records'}));
  fireEvent.click(screen.getByRole('button',{name:'Open profile'}));
  expect(screen.getByRole('heading',{name:'Profile screen'})).toBeTruthy();
 });
});
