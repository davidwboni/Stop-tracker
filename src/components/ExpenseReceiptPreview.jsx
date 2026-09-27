import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
export default function ExpenseReceiptPreview({ receipt }) {
  const { user }=useAuth();
  const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  if(!receipt)return null;
  async function load(){setBusy(true);setError('');try{const service=await import('../services/expenseReceipts');setUrl(URL.createObjectURL(await service.readReceipt(user?.uid,receipt)));}catch(_){setError('Could not open this receipt. Connect and retry, or use the device where you saved it.');}finally{setBusy(false);}}
  return <div className="space-y-2">{url?<>{receipt.type?.startsWith('image/')&&<img src={url} alt="Saved expense receipt" className="max-h-80 mx-auto"/>}<a href={url} download={receipt.type==='application/pdf'?'receipt.pdf':'receipt-image'} target="_blank" rel="noopener noreferrer" className="home-secondary w-full">Open / download receipt</a></>:<button className="home-secondary w-full" disabled={busy} onClick={load}>{busy?'Loading receipt…':'View receipt'}</button>}{error&&<p role="alert" className="home-error">{error}</p>}</div>;
}
