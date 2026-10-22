import React,{useState} from 'react';
import {parsePreviousWorkCsv} from '../features/home/previousWorkImport';
export default function PreviousWorkImport({existing=[],onImport,onClose}){
 const [parsed,setParsed]=useState(null),[error,setError]=useState(''),[agree,setAgree]=useState(false),[busy,setBusy]=useState(false);
 const known=new Set(existing.map(row=>row.date));
 const conflicts=(parsed||[]).filter(row=>known.has(row.date));
 async function load(file){
  if(!file)return;
  setParsed(null);setAgree(false);setError('');
  if(!/\.csv$/i.test(file.name)||file.size>750000){setError('Choose a work-log CSV smaller than 750 KB.');return;}
  try{
   const content=await file.text();
   setParsed(parsePreviousWorkCsv(content));
  }catch(err){setError(err?.message||'Could not read the CSV. Nothing was saved.');}
 }
 async function confirm(){
  if(!parsed||conflicts.length||!agree||busy)return;
  setBusy(true);setError('');
  try{await onImport(parsed);onClose();}
  catch(_){setError('The import could not be saved. Your existing workdays are unchanged.');}
  finally{setBusy(false);}
 }
 return <section className="home-card v5-work-import" aria-label="Import previous work records">
  <h3>Import your old work records</h3>
  <p className="home-muted text-sm">Use a CSV from your own work log, with columns <strong>date, stops, gross</strong> and optionally <strong>parcels</strong>. Dates must be YYYY-MM-DD. Contractor statements belong in Pay instead.</p>
  <label className="home-field">Your work CSV<input type="file" accept=".csv,text/csv" aria-label="Choose previous work CSV" disabled={busy} onChange={e=>load(e.target.files?.[0])}/></label>
  {parsed&&<div className="v5-import-preview"><strong>{parsed.length} workdays found</strong><p className="home-muted text-xs">First: {parsed[0]?.date} · Last: {parsed[parsed.length-1]?.date}</p><p className="home-muted text-xs">Values come directly from the file; no old pay rate or contractor deduction will be invented.</p></div>}
  {conflicts.length>0&&<p className="home-banner home-error" role="alert">{conflicts.length} dates already exist in your ledger. Remove duplicates from the CSV before importing. Existing dates will not be overwritten.</p>}
  {parsed?.length>0&&!conflicts.length&&<label className="v5-ack"><input type="checkbox" checked={agree} disabled={busy} onChange={e=>setAgree(e.target.checked)}/> These are my own records, and I have checked the dates, stops and gross earnings. I understand that historic contractor deductions may still need review.</label>}
  {error&&<p className="home-banner home-error" role="alert">{error}</p>}
  {parsed?.length>0&&<button type="button" className="home-primary w-full" disabled={busy||!agree||!!conflicts.length} onClick={confirm}>{busy?'Saving…':`Import ${parsed.length} workdays`}</button>}
  <button type="button" className="home-secondary w-full" disabled={busy} onClick={onClose}>Cancel</button>
 </section>;
}
