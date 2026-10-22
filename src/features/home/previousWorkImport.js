import {validDate} from '../expenses/expenseModel';

// Import only the driver's OWN historical notes; contractor statement rows are
// separate evidence and should be reconciled in Pay, not treated as work logged.
export function parsePreviousWorkCsv(text){
 if(typeof text!=='string'||text.length>750000)throw new Error('Choose a CSV smaller than 750 KB.');
 const records=[];let current=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&!cell)quoted=true;else if(quoted)quoted=false;else throw Error('Invalid CSV quoting.');}
  else if(c===','&&!quoted){current.push(cell);cell='';}
  else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;current.push(cell);cell='';if(current.some(v=>v.trim()))records.push(current);current=[];}
  else cell+=c;
 }
 if(quoted)throw new Error('Incomplete quoted CSV row.');
 current.push(cell);if(current.some(v=>v.trim()))records.push(current);
 if(records.length<2)throw new Error('CSV needs headings and at least one workday.');
 const names=records.shift().map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,''));
 const find=(...options)=>names.findIndex(n=>options.includes(n));
 const col={date:find('date','workdate'),stops:find('stops','deliveries'),parcels:find('parcels','totalparcels'),gross:find('gross','grossearnings','earnings')};
 if(col.date<0||col.stops<0||col.gross<0)throw new Error('CSV headings must include date, stops and gross; parcels is optional.');
 if(records.length>366)throw new Error('Import at most 366 workdays at once.');
 const seen=new Set();
 return records.map((r,i)=>{
  const n=i+2,date=String(r[col.date]||'').trim(),stops=String(r[col.stops]||'').trim(),gross=String(r[col.gross]||'').trim();
  const parcels=col.parcels<0?'':String(r[col.parcels]||'').trim();
  if(!validDate(date))throw new Error('Row '+n+': use YYYY-MM-DD for dates.');
  if(seen.has(date))throw new Error('Row '+n+': repeated date in CSV.');
  seen.add(date);
  if(!/^\d+$/.test(stops)||Number(stops)>1000)throw new Error('Row '+n+': invalid stop count.');
  if(!/^\d+(\.\d{1,2})?$/.test(gross)||!Number.isSafeInteger(Math.round(Number(gross)*100)))throw new Error('Row '+n+': invalid gross amount.');
  if(parcels&&(!/^\d+$/.test(parcels)||Number(parcels)>5000))throw new Error('Row '+n+': invalid parcel count.');
  return {date,stops:Number(stops),total:Number(gross),...(parcels?{totalParcels:Number(parcels)}:{}),
   origin:'driver_csv_import',importConfirmed:true};
 });
}
