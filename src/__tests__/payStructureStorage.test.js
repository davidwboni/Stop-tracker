import {beforeEach,it,expect,vi} from 'vitest';
import {savePayStructure} from '../services/payStructureStorage';
const f=vi.hoisted(()=>({run:vi.fn(),writes:[]}));
vi.mock('../services/firebase',()=>({db:{}}));
vi.mock('firebase/firestore',()=>({doc:(_, ...parts)=>parts.join('/'),runTransaction:f.run}));
const cfg={model:'flat_stops',ratePerStop:2.08,excessParcelRate:.05,contractorFeePercent:6};
beforeEach(()=>{localStorage.clear();f.writes=[];f.run.mockImplementation(async(_,fn)=>fn({get:async()=>({data:()=>({paymentConfig:cfg})}),set:(ref,payload)=>f.writes.push({ref,payload})}));});
it('guest save retains the old rate version, new version and latest config',async()=>{
 localStorage.setItem('guestConfig_guest',JSON.stringify(cfg));
 const saved=await savePayStructure({user:{uid:'guest',isGuest:true},config:{...cfg,ratePerStop:2.1},previous:cfg});
 const versions=JSON.parse(localStorage.getItem('payStructures_guest'));
 expect(versions).toHaveLength(2);expect(versions[1]).toMatchObject({id:'legacy',config:cfg});expect(saved.versionId).toBe(versions[0].id);
 expect(JSON.parse(localStorage.getItem('guestConfig_guest')).ratePerStop).toBe(2.1);
});
it('signed-in transaction saves new version and latest config atomically',async()=>{
 const saved=await savePayStructure({user:{uid:'driver'},config:{...cfg,ratePerStop:2.1},previous:cfg});
 expect(f.writes.map(w=>w.ref)).toEqual(expect.arrayContaining([`users/driver/payStructures/${saved.versionId}`,'users/driver']));
 expect(f.writes.find(w=>w.ref==='users/driver').payload.paymentConfig.ratePerStop).toBe(2.1);
});
it('conflicting settings refuse to overwrite another device',async()=>{
 f.run.mockImplementation(async(_,fn)=>fn({get:async()=>({data:()=>({paymentConfig:{...cfg,versionId:'other'}})}),set:vi.fn()}));
 await expect(savePayStructure({user:{uid:'driver'},config:cfg,previous:cfg})).rejects.toThrow('changed elsewhere');
});
