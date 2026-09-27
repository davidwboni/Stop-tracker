import {useEffect,useState} from 'react';
import {collection,onSnapshot} from 'firebase/firestore';
import {db} from '../services/firebase';
export default function usePayStructureHistory(user){
 const [state,setState]=useState({owner:null,versions:[],loading:true,error:''});
 useEffect(()=>{
  if(!user?.uid)return;
  setState({owner:user.uid,versions:[],loading:true,error:''});
  const accept=versions=>setState({owner:user.uid,versions:versions.sort((a,b)=>(b.savedAt||'').localeCompare(a.savedAt||'')),loading:false,error:''});
  const fail=()=>setState({owner:user.uid,versions:[],loading:false,error:'Saved rate versions could not be loaded.'});
  if(user.isGuest){const load=()=>{try{const rows=JSON.parse(localStorage.getItem(`payStructures_${user.uid}`)||'[]');if(!Array.isArray(rows))throw new Error();accept(rows);}catch(_){fail();}};load();window.addEventListener('pay-structures-changed',load);window.addEventListener('storage',load);return()=>{window.removeEventListener('pay-structures-changed',load);window.removeEventListener('storage',load);};}
  const timer=setTimeout(fail,12000);
  const off=onSnapshot(collection(db,'users',user.uid,'payStructures'),snap=>{clearTimeout(timer);accept(snap.docs.map(d=>({...d.data(),id:d.id})));},()=>{clearTimeout(timer);fail();});
  return()=>{clearTimeout(timer);off();};
 },[user?.uid,user?.isGuest]);
 return state.owner===user?.uid?state:{versions:[],loading:true,error:''};
}
