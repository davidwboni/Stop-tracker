import React from 'react';
import {describe,it,expect,beforeEach,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import RoutePlanner from '../components/RoutePlanner';

vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:{uid:'route-test'}})}));
vi.mock('../components/HeaderControls',()=>({default:()=>null}));
vi.mock('../components/GoogleRouteMap',()=>({default:({addresses})=><div data-testid="route-map-pins">{addresses.length} locations shown</div>}));
vi.mock('../components/RouteMap',()=>({default:({addresses})=><div data-testid="route-map-pins">{addresses.length} locations shown</div>}));
vi.mock('../services/addressSearch',()=>({searchAddresses:vi.fn(async()=>[]),computeBiasCenter:vi.fn(),searchPostcodes:vi.fn(async()=>[]),isPostcodeLike:vi.fn(()=>false),resolvePostcode:vi.fn()}));
vi.mock('../services/googlePlaces',()=>({resolvePlace:vi.fn()}));
vi.mock('../services/googleRoutes',()=>({optimizeRouteGoogle:vi.fn()}));
vi.mock('../services/premium',()=>({getPremiumStatus:vi.fn(async()=>({isPro:false,routeOptimizationUses:0}))}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));

const depot={address:'Depot A',postcode:'RH10 1AA',latitude:51.11,longitude:-.18};
const stop={address:'Delivery B',postcode:'RH10 2BB',latitude:51.12,longitude:-.2};
const mount=()=>render(<MemoryRouter><RoutePlanner/></MemoryRouter>);
beforeEach(()=>{
 localStorage.clear();
 localStorage.setItem('recentAddresses_route-test',JSON.stringify([depot,stop]));
});

describe('Routes mobile planning',()=>{
 it('updates live map as start and delivery are added, while keeping start locked in manual ordering',async()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Recent addresses'}));
  fireEvent.click(screen.getByRole('button',{name:/Depot A/}));
  expect(screen.getByText('Your start')).toBeInTheDocument();
  expect(screen.getByTestId('route-map-pins')).toHaveTextContent('1 locations shown');
  expect(screen.getByRole('button',{name:'Use my location as start'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Recent addresses'}));
  fireEvent.click(screen.getByRole('button',{name:/Delivery B/}));
  expect(screen.getByText('1 delivery stops')).toBeInTheDocument();
  expect(screen.getByTestId('route-map-pins')).toHaveTextContent('2 locations shown');
  expect(screen.getByText('Depot / start')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Move stop 1 down'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Move stop 2 up'})).toBeDisabled();
 });
 it('offers an expanded map and returns to the same unsaved route',()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Recent addresses'}));
  fireEvent.click(screen.getByRole('button',{name:/Depot A/}));
  fireEvent.click(screen.getByRole('button',{name:'Expand route map'}));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:/Your route · 0 delivery stops/})).toBeInTheDocument();
  expect(screen.getByTestId('route-map-pins')).toHaveTextContent('1 locations shown');
  fireEvent.click(screen.getByRole('button',{name:'Close map'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByTestId('route-map-pins')).toHaveTextContent('1 locations shown');
 });
});
