import React from 'react';
import {money,pennies} from '../features/home/homeModel';
export const emptyStatementDetails=()=>({stops:'',gross:'',extras:'',charges:'',vat:'',daily:{}});
export function validStatementDetails(d){
 const amount=v=>v===''||(/^-?\d+(\.\d{1,2})?$/.test(String(v))&&Number.isSafeInteger(pennies(Number(v))));
 const count=v=>v===''||(/^\d+$/.test(String(v))&&Number.isSafeInteger(Number(v)));
 return count(d.stops)&&['gross','extras','charges','vat'].every(k=>amount(d[k]))&&Object.values(d.daily).every(r=>count(r.stops)&&amount(r.amount));
}
export default function StatementWorkDetails({value,onChange,rows,readOnly=false,hidden=false}){
 const change=(key,v)=>onChange({...value,[key]:v});
 const fields=[['stops','Statement stops','numeric'],['gross','Gross work earnings (£)','decimal'],['extras','Extra payments (£)','decimal'],['charges','Contractor charges (£)','decimal'],['vat','VAT shown (£)','decimal']];
 const cash=v=>hidden?'••••':money(v);
 return <details className="money-details"><summary>Optional: work figures and daily comparison</summary><p className="home-muted text-sm">These explain differences. Gross earnings and daily amounts are kept separate from the final contractor payout.</p>
 <div className="check-work-fields">{fields.map(([key,label,inputMode])=>readOnly?<p key={key}>{label}: <strong>{value[key]===''?'Not entered':key==='stops'?value[key]:cash(Number(value[key]))}</strong></p>:<label key={key} className="home-field">{label}<input inputMode={inputMode} value={value[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div>
 {rows.map(row=>{const d=value.daily[row.date]||{stops:'',amount:''};const set=(key,v)=>change('daily',{...value.daily,[row.date]:{...d,[key]:v}});return <section className="check-work-day" key={row.date}><h3>{row.date}</h3><p className="home-muted text-sm">Your record: {row.stops??'—'} stops · {cash(Number(row.total)||0)} gross</p>{readOnly?<p>{d.stops!==''?`Statement stops: ${d.stops}; difference ${Number(d.stops)-(Number(row.stops)||0)}. `:'Stops not entered. '}{d.amount!==''?`Statement gross: ${cash(Number(d.amount))}; difference ${cash((pennies(Number(d.amount))-pennies(Number(row.total)||0))/100)}.`:'Gross amount not entered.'}</p>:<div className="check-work-fields"><label className="home-field">Statement stops · {row.date}<input inputMode="numeric" value={d.stops} onChange={e=>set('stops',e.target.value)}/></label><label className="home-field">Statement gross (£) · {row.date}<input inputMode="decimal" value={d.amount} onChange={e=>set('amount',e.target.value)}/></label></div>}</section>;})}
 </details>;
}
