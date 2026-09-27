import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { getPeriodForDate } from '../features/payperiod/periods';
import { splitExpenseRecords, validateExpense, validDate } from '../features/expenses/expenseModel';
import { db } from '../services/firebase';

export default function useExpenses() {
  const { user } = useAuth();
  const { payPeriodAnchor, periodRecords = {}, adoptPeriodRecords } = useData();
  const [state, setState] = useState({ owner:null, expenses:[], rules:[], loading:true, error:'', pending:false });
  const [retry, setRetry] = useState(0);
  const key = `expenses_${user?.uid}`;
  useEffect(() => {
    if (!user?.uid) return;
    const empty = { owner:user.uid, expenses:[], rules:[], loading:true, error:'', pending:false };
    setState(s => s.owner===user.uid ? {...s,loading:true,error:''} : empty);
    const accept = (rows, metadata = {}) => {
      try { setState({ ...empty, ...splitExpenseRecords(rows), loading:false, ...metadata }); }
      catch (_) { setState(s => ({...s,owner:user.uid,loading:false,error:'Some expense records could not be read. Totals are unavailable.'})); }
    };
    if (user.isGuest) {
      const load = () => { try { accept(JSON.parse(localStorage.getItem(key)||'[]')); } catch (_) { setState(s => ({...s,loading:false,error:'Expenses could not be loaded.'})); } };
      load(); window.addEventListener('expenses-changed',load); window.addEventListener('storage',load);
      return () => {window.removeEventListener('expenses-changed',load);window.removeEventListener('storage',load);};
    }
    const timer=setTimeout(()=>setState(s=>s.loading?{...s,loading:false,error:'Expenses are taking too long to load.'}:s),12000);
    const off=onSnapshot(collection(db,'users',user.uid,'expenses'),{includeMetadataChanges:true},snapshot=>{
      clearTimeout(timer);
      accept(snapshot.docs.map(d=>({...d.data(),id:d.id})),{error:snapshot.metadata.fromCache&&snapshot.empty?'Expenses could not be verified offline.':'',pending:snapshot.metadata.hasPendingWrites,cached:snapshot.metadata.fromCache});
    },()=>{clearTimeout(timer);setState(s=>({...s,loading:false,error:'Expenses could not be loaded.'}));});
    return ()=>{clearTimeout(timer);off();};
  },[user?.uid,user?.isGuest,key,retry]);

  const mutate = useCallback(async (writes, removeId, affectedDates = []) => {
    if (!user?.uid) throw new Error('Sign in before saving.');
    if (!user.isGuest && !navigator.onLine) throw new Error('Connect before changing expenses.');
    const changedAt=new Date().toISOString();
    const patches={};
    if (payPeriodAnchor) for (const date of affectedDates.filter(validDate)) {
      const period=getPeriodForDate(payPeriodAnchor,date);
      const old=periodRecords[period.id];
      if (old && ['reconciled','checked','needs_review'].includes(old.status)) patches[period.id]={...old,status:'needs_review',needsReview:true,updatedAt:changedAt};
    }
    const records=writes.map(e=>({...e,updatedAt:changedAt}));
    if(user.isGuest){
      const periodKey=`periodRecords_${user.uid}`;
      const before=localStorage.getItem(key), beforePeriods=localStorage.getItem(periodKey);
      const rows=JSON.parse(before||'[]');
      const next=[...records,...rows.filter(e=>e.id!==removeId&&!records.some(w=>w.id===e.id))];
      try {
        localStorage.setItem(key,JSON.stringify(next));
        if(Object.keys(patches).length) localStorage.setItem(periodKey,JSON.stringify({...JSON.parse(beforePeriods||'{}'),...patches}));
      }catch(error){
        if(before===null)localStorage.removeItem(key);else localStorage.setItem(key,before);
        if(beforePeriods===null)localStorage.removeItem(periodKey);else localStorage.setItem(periodKey,beforePeriods);
        throw error;
      }
      window.dispatchEvent(new Event('expenses-changed'));
    }else{
      const batch=writeBatch(db);
      records.forEach(e=>batch.set(doc(db,'users',user.uid,'expenses',e.id),e));
      if(removeId)batch.delete(doc(db,'users',user.uid,'expenses',removeId));
      if(Object.keys(patches).length)batch.update(doc(db,'users',user.uid),Object.fromEntries(Object.entries(patches).map(([id,record])=>['periodRecords.'+id,record])));
      await batch.commit();
    }
    if(Object.keys(patches).length)adoptPeriodRecords?.(patches);
  },[user?.uid,user?.isGuest,key,payPeriodAnchor,periodRecords,adoptPeriodRecords]);
  const stopRecurring=useCallback(async id=>{
    const rule=state.rules.find(r=>r.id===id);
    if(!rule)throw new Error('Recurring cost not found.');
    await mutate([{...rule,active:false}],null);
  },[state.rules,mutate]);
  const save=useCallback(async e=>{
    if(!validateExpense(e))throw new Error('Check the date, amount and source.');
    if(e.recurringRuleId && e.occurrenceDate && state.expenses.some(row=>row.id!==e.id && row.recurringRuleId===e.recurringRuleId && row.occurrenceDate===e.occurrenceDate)) throw new Error('This recurring cost is already recorded.');
    const previous=state.expenses.find(row=>row.id===e.id);
    await mutate([e],null,[previous?.date,e.date]);
  },[mutate,state.expenses]);
  const remove=useCallback(async e=>{await mutate([],e.id,[e.date]);},[mutate]);
  const makeRecurring=useCallback(async(e,frequency,nextDate)=>{
    if(!validateExpense(e)||!validDate(nextDate)||nextDate<=e.date||!['weekly','four_weekly','monthly'].includes(frequency))throw new Error('Choose a valid next date and frequency.');
    const ruleId='rule_'+e.id;
    const rule={id:ruleId,kind:'recurring_rule',active:true,amount:e.amount,source:e.source,category:e.category,description:e.description||'',frequency,nextDate};
    await mutate([rule,{...e,recurringRuleId:ruleId,occurrenceDate:e.date}],null);
  },[mutate]);
  return { ...(state.owner===user?.uid?state:{expenses:[],rules:[],loading:true,error:'',pending:false}),save,remove,makeRecurring,stopRecurring,retry:()=>setRetry(n=>n+1) };
}
