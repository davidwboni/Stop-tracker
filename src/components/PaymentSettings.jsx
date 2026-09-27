import React,{useState} from 'react';
import {useData} from '../contexts/DataContext';
import PayStructureAISetup from './PayStructureAISetup';
import {savePayStructure} from '../services/payStructureStorage';
import '../styles/home.css';
export default function PaymentSettings({user,onSettingsSaved}){
 const {paymentConfig,hasSavedPayStructure,loading,loadError}=useData();const [saved,setSaved]=useState(false);
 async function confirm(config){const result=await savePayStructure({user,config,previous:hasSavedPayStructure===false?null:paymentConfig});onSettingsSaved?.(result);setSaved(true);}
 return <div className="home-screen max-w-xl mx-auto space-y-5 pb-28"><h1 className="text-3xl font-bold">Pay structure</h1><p className="home-muted">Set how your work turns into expected pay.</p>
 {loading?<p role="status">Loading your settings…</p>:loadError?<p role="alert">Your settings could not be loaded. Reload before making changes.</p>:saved?<div className="home-card space-y-4" role="status"><h2 className="text-xl font-bold">{user?.isGuest?'Saved on this device':'Pay structure saved'}</h2><p>New entries use these settings. Saved days keep their original rates.</p><button className="home-secondary" onClick={()=>setSaved(false)}>Review settings</button></div>:<PayStructureAISetup initialConfig={hasSavedPayStructure===false?null:paymentConfig} onConfirm={confirm}/>}
 {user?.isGuest&&<p className="home-muted text-sm">Guest settings and rate history are saved on this device only.</p>}
 </div>;
}
