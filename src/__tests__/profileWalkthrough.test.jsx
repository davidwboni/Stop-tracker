import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AppWalkthrough from '../components/AppWalkthrough';
import {ProfileAvatar} from '../components/HeaderControls';
vi.mock('../contexts/DataContext',()=>({useData:()=>({loading:false,isNewUser:false})}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'walkthrough-test',displayName:'Driver Example'}})}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
vi.stubGlobal('ResizeObserver',class {observe(){} unobserve(){} disconnect(){}});
Element.prototype.scrollIntoView=vi.fn();
describe('Profile identity and optional onboarding',()=>{
 it('uses the same initials in the profile identity avatar',()=>{
  render(<span className="st-profile-shortcut"><ProfileAvatar name="Driver Example"/></span>);
  expect(screen.getByText('DE')).toBeInTheDocument();
 });
 it('allows optional walkthrough replay after signup',async()=>{
  render(<MemoryRouter><button data-tour="log-work">Log your day</button><AppWalkthrough/></MemoryRouter>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent(window,new Event('st-walkthrough-replay'));
  await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
  expect(screen.getByText('Log your work')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Skip tour'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 });
});
