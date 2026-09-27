import React,{useEffect,useRef,useState} from 'react';
import {interpretPayStructure} from '../services/interpretPayStructure';
import {describePayStructure} from '../features/payperiod/payStructure';
import {blankPay} from '../features/payperiod/paySetupModel';
import PayStructureEditor from './PayStructureEditor';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/pay-setup.css';
export default function PayStructureAISetup({onConfirm,initialConfig=null}){
 const [text,setText]=useState(''),[answer,setAnswer]=useState(''),[questions,setQuestions]=useState([]),[proposal,setProposal]=useState(null),[manual,setManual]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),conversation=useRef('');
 useEffect(()=>{track('pay_setup_started');},[]);
 useEffect(()=>{if(!text&&!answer)return;const guard=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[text,answer]);
 async function run(){
  if(lock.current)return;lock.current=true;setLoading(true);setError('');
  const description=questions.length?`${conversation.current}\nQuestions: ${questions.join(' ')}\nMy answer: ${answer}`:text;
  try{
   if(!navigator.onLine)throw new Error('Connect to use AI, or set up manually.');
   const data=await interpretPayStructure({text:description,currentConfig:initialConfig});
   if(Array.isArray(data.questions)&&data.questions.length){conversation.current=description;setQuestions(data.questions.slice(0,3));setAnswer('');}
   else if(data.config){setProposal({...blankPay(data.config.model),...data.config});setQuestions([]);}
   else throw new Error('Please describe the rate and any contractor deduction, or set up manually.');
  }catch(err){setError(err?.message||'Could not read that. Your description is still here.');}
  finally{lock.current=false;setLoading(false);}
 }
 async function confirm(config){await onConfirm(config);track('pay_setup_completed');setText('');setAnswer('');conversation.current='';}
 if(proposal||manual)return <PayStructureEditor key={proposal?'ai':'manual'} initialConfig={proposal||initialConfig} onConfirm={confirm} onBack={()=>{setManual(false);setProposal(null);}}/>;
 return <div className="home-screen pay-setup">
 {initialConfig&&<div className="home-card"><h3 className="font-bold">Current arrangement</h3><p>{describePayStructure(initialConfig)}</p><p className="home-muted text-sm">Contractor fee: {initialConfig.contractorFeePercent==null?'Not recorded':`${initialConfig.contractorFeePercent}%`}</p></div>}
 <h3 className="text-xl font-bold">{initialConfig?'Describe a change':'Describe how you get paid'}</h3>
 <p className="home-muted">Use your own words, in your preferred language. We’ll prepare editable settings for you to check.</p>
 {questions.length?<><div role="status" className="home-banner"><h4 className="font-bold">A quick clarification</h4>{questions.map((question,i)=><p key={i}>{question}</p>)}</div><label> Your answer<textarea rows={3} maxLength={2000} value={answer} disabled={loading} onChange={e=>setAnswer(e.target.value)}/></label></>:<label>Pay description<textarea rows={5} maxLength={6000} value={text} disabled={loading} onChange={e=>setText(e.target.value)} placeholder="For example: £2.08 per stop, 5p per excess parcel, and a 6% contractor fee before expenses."/></label>}
 <p className="home-muted text-xs">Your description is sent to DeepSeek for interpretation. Stop Tracker saves the confirmed settings, not this description. Leave out names and personal details.</p>
 {error&&<p role="alert" className="home-error">{error}</p>}
 <button className="home-primary" disabled={loading||!(questions.length?answer.trim():text.trim())} onClick={run}>{loading?'Preparing your settings…':questions.length?'Continue':'Prepare my pay structure'}</button>
 <button className="home-secondary" disabled={loading} onClick={()=>setManual(true)}>{initialConfig?'Edit manually':'Set up manually'} · Free</button>
 {questions.length>0&&<button className="home-text-button" disabled={loading} onClick={()=>{setQuestions([]);conversation.current='';}}>Edit original description</button>}
 <p className="home-muted text-sm">You’ll review the calculation before confirming.</p>
 </div>;
}
