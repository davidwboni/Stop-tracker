import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import HeaderControls from '../components/HeaderControls';

const fixture=vi.hoisted(()=>({user:{uid:'test',displayName:'Alex Driver',photoURL:null}}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:fixture.user})}));
beforeEach(()=>{fixture.user={uid:'test',displayName:'Alex Driver',photoURL:null};});
const mount=(props={})=>render(<MemoryRouter initialEntries={['/app/dashboard']}>
 <Routes>
  <Route path="/app/dashboard" element={<HeaderControls {...props}/>}/>
  <Route path="/app/profile" element={<h1>Account profile</h1>}/>
 </Routes>
</MemoryRouter>);
describe('App header foundation',()=>{
 it('renders consistent initials and opens account profile',()=>{
  mount();
  expect(screen.getByRole('button',{name:'Open profile'})).toHaveTextContent('AD');
  fireEvent.click(screen.getByRole('button',{name:'Open profile'}));
  expect(screen.getByRole('heading',{name:'Account profile'})).toBeInTheDocument();
 });
 it('uses the saved profile photo when available',()=>{
  fixture.user.photoURL='https://example.com/avatar.png';
  mount();
  const button=screen.getByRole('button',{name:'Open profile'});
  expect(button.querySelector('img')).toHaveAttribute('src','https://example.com/avatar.png');
  expect(button.querySelector('img')).toHaveAttribute('alt','');
 });
 it('only shows the visibility control on a screen with private money',()=>{
  const onToggleMoney=vi.fn();
  const view=mount({hidden:false,onToggleMoney});
  expect(screen.getByRole('button',{name:'Hide monetary amounts'})).toHaveAttribute('aria-pressed','false');
  fireEvent.click(screen.getByRole('button',{name:'Hide monetary amounts'}));
  expect(onToggleMoney).toHaveBeenCalledOnce();
  view.unmount();
  mount();
  expect(screen.queryByRole('button',{name:/monetary amounts/})).not.toBeInTheDocument();
 });
});
