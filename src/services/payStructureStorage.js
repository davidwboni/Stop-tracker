import {doc,runTransaction} from 'firebase/firestore';
import {db} from './firebase';
import {cleanPaySetup} from '../features/payperiod/paySetupModel';
export async function savePayStructure({user,config,previous,onboardingOptions}){
 if(!user?.uid)throw new Error('Sign in before saving.');
 const id=crypto.randomUUID(),savedAt=new Date().toISOString();
 const saved={...cleanPaySetup(config),versionId:id};
 const version={id,savedAt,config:saved};
 if(user.isGuest){
  const key=`guestConfig_${user.uid}`,historyKey=`payStructures_${user.uid}`;
  const before=localStorage.getItem(key),oldHistory=localStorage.getItem(historyKey);
  const onboardKey=`onboarded_${user.uid}`,anchorKey=`payPeriodAnchor_${user.uid}`;
  const beforeOnboard=localStorage.getItem(onboardKey),beforeAnchor=localStorage.getItem(anchorKey);
  const history=JSON.parse(oldHistory||'[]');
  if(previous&&!previous.versionId&&!history.some(v=>v.id==='legacy'))history.push({id:'legacy',savedAt:null,config:previous});
  try{localStorage.setItem(historyKey,JSON.stringify([version,...history]));localStorage.setItem(key,JSON.stringify(saved));if(onboardingOptions){localStorage.setItem(anchorKey,onboardingOptions.payPeriodAnchor);localStorage.setItem(onboardKey,'1');}}
  catch(error){for(const [k,v] of [[onboardKey,beforeOnboard],[anchorKey,beforeAnchor]]){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}if(oldHistory===null)localStorage.removeItem(historyKey);else localStorage.setItem(historyKey,oldHistory);if(before===null)localStorage.removeItem(key);else localStorage.setItem(key,before);throw error;}
  window.dispatchEvent(new Event('pay-structures-changed'));return saved;
 }
 if(!navigator.onLine)throw new Error('Connect before saving.');
 await runTransaction(db,async tx=>{
  const userRef=doc(db,'users',user.uid);const snapshot=await tx.get(userRef);const current=snapshot.data()?.paymentConfig;
  if((current?.versionId||null)!==(previous?.versionId||null))throw new Error('Rates changed elsewhere. Reload before saving.');
  if(current&&!current.versionId)tx.set(doc(db,'users',user.uid,'payStructures','legacy'),{id:'legacy',savedAt:null,config:current});
  tx.set(doc(db,'users',user.uid,'payStructures',id),version);
  tx.set(userRef,{paymentConfig:saved,updatedAt:savedAt,...(onboardingOptions?{onboarded:true,payPeriodAnchor:onboardingOptions.payPeriodAnchor}:{})},{merge:true});
 });
 return saved;
}
