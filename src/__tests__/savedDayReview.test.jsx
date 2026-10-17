import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import EntriesPage from '../components/EntriesPage';

const state=vi.hoisted(()=>({data:{},save:vi.fn()}));
vi.mock('../contexts/DataContext',()=>({useData:()=>state.data}));
vi.mock('../components/DailyQuickEntry',()=>({
 default:({open,initialDate})=>open?<output data-testid="compact-entry-editor">Editing {initialDate}</output>:null
}));
const config={model:'flat_stops',ratePerStop:2.08,contractorFeePercent:6,excessParcelRate:0.05};
const row={id:'work-1',date:'2026-09-26',stops:120,quantity:120,totalParcels:158,total:281.5,extraWork:true,extraType:'Collection',extra:30,notes:'Extra collection at depot',payStructureSnapshot:config};
beforeEach(()=>{
 localStorage.clear();state.save=vi.fn(async()=>({success:true}));
 state.data={logs:[row],loading:false,loadError:'',updateLogs:(...args)=>state.save(...args)};
});
const mount=()=>render(<MemoryRouter initialEntries={['/app/records']}><EntriesPage/></MemoryRouter>);
describe('approved saved-day flow',()=>{
 it('opens a readable summary first, not the editable form',()=>{
  mount();
  expect(screen.queryByTestId('compact-entry-editor')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/View work for/i}));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Saved workday')).toBeInTheDocument();
  expect(screen.getByText('Extra collection at depot')).toBeInTheDocument();
  expect(screen.getAllByText(/£281\.50/).length).toBeGreaterThan(0);
  expect(screen.queryByTestId('compact-entry-editor')).not.toBeInTheDocument();
 });
 it('opens the compact editor with the existing day only after Edit is tapped',()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:/View work for/i}));
  fireEvent.click(screen.getByRole('button',{name:'Edit this day'}));
  expect(screen.getByTestId('compact-entry-editor')).toHaveTextContent('2026-09-26');
  expect(screen.queryByText('Saved workday')).not.toBeInTheDocument();
 });
 it('requires an explicit confirmation before deleting the original record',async()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:/View work for/i}));
  fireEvent.click(screen.getByRole('button',{name:'Delete record'}));
  expect(state.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Keep day'}));
  expect(state.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Delete record'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm delete'}));
  await waitFor(()=>expect(state.save).toHaveBeenCalledTimes(1));
  expect(state.save.mock.calls[0][0]).toEqual([]);
 });
});
