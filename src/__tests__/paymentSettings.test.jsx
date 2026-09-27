import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import PaymentSettings from '../components/PaymentSettings';
const fixture=vi.hoisted(()=>({save:vi.fn()}));
vi.mock('../services/firebase',()=>({db:{},functions:{}}));
vi.mock('../services/payStructureStorage',()=>({savePayStructure:fixture.save}));
vi.mock('../contexts/DataContext',()=>({useData:()=>({paymentConfig:{model:'flat_stops',ratePerStop:1.75,excessParcelRate:0,contractorFeePercent:0},hasSavedPayStructure:true,loading:false})}));
vi.mock('../services/productAnalytics',()=>({trackProductEvent:vi.fn()}));
describe('Profile pay structure',()=>{
 it('shows current settings, then a manual editor with all six existing models',()=>{
  render(<PaymentSettings user={{uid:'u1'}} onSettingsSaved={vi.fn()}/>);
  expect(screen.getByText('Current arrangement')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Edit manually · Free'}));
  const options=Array.from(screen.getByLabelText('How are you paid?').options).map(o=>o.textContent);
  expect(options).toEqual(expect.arrayContaining(['Flat per stop','Day rate','Tiered per stop','Per mile','Hourly','Sliding scale']));
 });
 it('updates the preview and persists only when the driver confirms',async()=>{
  fixture.save.mockResolvedValue({model:'flat_stops',ratePerStop:2,excessParcelRate:0,contractorFeePercent:0,versionId:'new'});
  const done=vi.fn();render(<PaymentSettings user={{uid:'u1'}} onSettingsSaved={done}/>);
  fireEvent.click(screen.getByRole('button',{name:'Edit manually · Free'}));
  fireEvent.change(screen.getByLabelText('Rate per stop (£)'),{target:{value:'2'}});
  expect(screen.getAllByText('£240.00').length).toBeGreaterThan(0);expect(fixture.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm pay structure'}));
  await waitFor(()=>expect(fixture.save).toHaveBeenCalledTimes(1));
  expect(done).toHaveBeenCalledWith(expect.objectContaining({ratePerStop:2}));
 });
});
