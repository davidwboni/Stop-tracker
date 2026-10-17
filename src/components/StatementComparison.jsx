import React,{useState} from 'react';
import StatementWorkDetails from './StatementWorkDetails';
import {money,pennies} from '../features/home/homeModel';
import {trackProductEvent as track} from '../services/productAnalytics';
export function comparisonLines(review,summary){
 const fields=[['Work earnings','grossPence',summary.gross],['Contractor fee','feePence',summary.fee],['Contractor charges','chargesPence',pennies(summary.costs.contractor)]];
 return fields.map(([label,key,expected])=>({label,expected,statement:review?.[key],difference:Number.isSafeInteger(expected)&&Number.isSafeInteger(review?.[key])?review[key]-expected:null}));
}
export default function StatementComparison({period,expected,statement,summary,review,workDetails,saved,resolved,stale,unavailable,hidden,saving,error,onSave,onEdit,onBack,onResolve}){
 const [confirm,setConfirm]=useState(false),[reason,setReason]=useState('');
 const cash=v=>hidden?'••••':money(v/100),difference=statement-expected;
 const lines=comparisonLines(review,summary);
 const dailyRows=(summary?.rows||[]).map(row=>{
   const recorded=workDetails?.daily?.[row.date];
   const hasAmount=recorded?.amount!==''&&recorded?.amount!=null&&/^\d+(\.\d{1,2})?$/.test(String(recorded.amount))&&Number.isFinite(Number(row.total));
   const expectedGross=hasAmount?pennies(Number(row.total)):null;
   const statementGross=hasAmount?pennies(Number(recorded.amount)):null;
   return {date:row.date,stops:row.stops,statementStops:recorded?.stops,expectedGross,statementGross,difference:hasAmount?statementGross-expectedGross:null};
 }).filter(row=>row.difference!=null);
 const mismatchedDays=dailyRows.filter(row=>row.difference!==0||row.statementStops!==''&&row.statementStops!=null&&Number(row.statementStops)!==Number(row.stops));
 const reportText=[
   'Stop Tracker — Statement comparison for review',
   'Pay period: '+period.start+' to '+period.end,
   'Your expected contractor payout: '+money(expected/100),
   'Reviewed contractor statement payout: '+money(statement/100),
   'Payout difference: '+money(difference/100)+' (statement minus expected)',
   '',
   'Amounts supplied for comparison:',
   ...lines.map(line=>line.label+': '+(line.statement==null?'Statement subtotal not available':money(line.statement/100))+' | Your records '+(line.expected==null?'unavailable':money(line.expected/100))),
   '',
   mismatchedDays.length?'Daily items to review:':'Daily figures: '+(dailyRows.length?'No mismatches found in '+dailyRows.length+' entered daily comparisons.':'Not provided; specific days cannot be verified.'),
   ...mismatchedDays.map(row=>row.date+': your gross '+money(row.expectedGross/100)+', statement gross '+money(row.statementGross/100)+', difference '+money(row.difference/100)+(row.statementStops!==''&&row.statementStops!=null?'; recorded stops '+row.stops+', statement stops '+row.statementStops:'')),
   '',
   'This is a reconciliation aid, not proof of underpayment or payment receipt. Verify the original contractor statement and agreed rates before disputing.'
 ].join('\n');
 function downloadReport(){
   const blob=new Blob([reportText],{type:'text/plain;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='stop-tracker-review-'+period.start+'-'+period.end+'.txt';document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),3000);
   track('discrepancy_report_downloaded');
 }
 return <section className="home-screen comparison-page">
 <header><h1>Compare statement</h1><p className="home-muted">{period.start} – {period.end}</p></header><span className="money-badge">{resolved?'Period reconciled':saved?'Checked · Unresolved':'Preview · Not saved'}</span>
 <section className={'home-card comparison-hero '+(difference?'comparison-warning':'comparison-match')}><p>{unavailable?'Comparison unavailable':difference===0?'Payout totals match':'Statement is'}</p><h2>{unavailable?'Check your records':difference===0?'No payout difference':hidden?'Different from your estimate':`${cash(Math.abs(difference))} ${difference<0?'lower':'higher'}`}</h2><p className="home-muted">{difference!==0?'than your expected contractor payout':'Matching totals do not prove every line item matches.'}</p><dl className="money-waterfall"><div><dt>Expected · Estimated</dt><dd>{unavailable?'Unavailable':cash(expected)}</dd></div><div><dt>Statement · Reviewed</dt><dd>{cash(statement)}</dd></div></dl><p className="home-muted text-sm">Before your own business expenses and personal tax. Compared on the VAT basis you confirmed.</p></section>
 <section className="home-card"><h2>Where the difference appears</h2>{lines.every(l=>l.difference==null)?<p className="home-muted mt-3">Totals-only comparison. Add statement details to explain the difference.</p>:lines.map(l=><details className="money-details" key={l.label} onToggle={e=>{if(e.currentTarget.open)track('comparison_detail_opened');}}><summary>{l.label} <span>{l.difference==null?'Not compared':l.difference===0?'No difference':`${l.difference>0?'+':''}${cash(l.difference)}`}</span></summary><dl className="money-waterfall"><div><dt>Your records</dt><dd>{l.expected==null?'Unavailable':cash(l.expected)}</dd></div><div><dt>Statement</dt><dd>{l.statement==null?'Not entered':cash(l.statement)}</dd></div></dl>{l.label!=='Work earnings'&&l.difference>0&&<p className="home-muted text-sm">Higher charges reduce your payout.</p>}</details>)}{review?.charges?.length>0&&<details className="money-details"><summary>Reviewed statement charges</summary>{review.charges.map((c,i)=><p className="home-row py-2" key={i}><span>{c.label}</span><strong>{cash(c.amountPence)}</strong></p>)}<p className="home-muted text-sm">These are statement figures. No expense records were added or changed.</p></details>}</section>
 {workDetails&&<section className="home-card"><h2>Daily comparison</h2>
  <p className="home-muted text-sm mt-2">{dailyRows.length?mismatchedDays.length?mismatchedDays.length+' of '+dailyRows.length+' entered daily figures need reviewing.':'No difference in the '+dailyRows.length+' daily figures supplied.':'Specific daily differences require a statement breakdown. The total payout comparison alone cannot identify missing days.'}</p>
  {mismatchedDays.slice(0,8).map(row=><details className="money-details" key={row.date}><summary>{row.date} <span>{hidden?'••••':cash(row.difference)}</span></summary>
    <dl className="money-waterfall"><div><dt>Your gross earnings</dt><dd>{cash(row.expectedGross)}</dd></div><div><dt>Statement gross earnings</dt><dd>{cash(row.statementGross)}</dd></div>{row.statementStops!==''&&row.statementStops!=null&&<div><dt>Stops recorded / on statement</dt><dd>{row.stops} / {row.statementStops}</dd></div>}</dl>
  </details>)}
  {mismatchedDays.length>8&&<p className="home-muted text-sm">Showing 8 of {mismatchedDays.length} flagged days. All entered daily differences appear in the exported report.</p>}
  <StatementWorkDetails value={workDetails} rows={summary.rows} readOnly hidden={hidden}/>
 </section>}
 {saved&&difference!==0&&!stale&&!unavailable&&!hidden&&<section className="home-card space-y-3"><h2>Share a discrepancy report</h2><p className="home-muted text-sm">Prepare an evidence summary to send to your contractor. It only lists daily differences when daily statement figures were provided and reviewed.</p><button className="home-secondary w-full" onClick={downloadReport}>Download discrepancy report</button><p className="home-muted text-xs">Review the downloaded report, then share it yourself. Stop Tracker does not automatically contact the contractor.</p></section>}
 {stale&&<p role="alert" className="home-banner">Records changed since this preview. Edit statement figures to review the updated comparison.</p>}
 {resolved&&<p role="status" className="home-banner">You marked this comparison resolved. This does not confirm that payment arrived.</p>}
 {error&&<p role="alert" className="home-error">{error}</p>}
 {!saved?<button className="home-primary w-full" disabled={saving||stale||unavailable} onClick={onSave}>{saving?'Saving check…':'Confirm and save check'}</button>:!resolved&&!confirm?<button className="home-secondary w-full" disabled={stale||unavailable} onClick={()=>{setConfirm(true);track('reconciliation_started');}}>Mark comparison resolved</button>:null}
 {saved&&!resolved&&confirm&&<section className="home-card space-y-3"><h2>Resolve this comparison?</h2><p className="home-muted">Only continue once you have checked the difference and are satisfied with the outcome. The original figures remain in your records.</p><label className="home-field">Outcome<select value={reason} onChange={e=>setReason(e.target.value)}><option value="">Choose an outcome</option><option value="figures_verified">Figures verified and accepted</option><option value="explained_difference">Difference explained and accepted</option></select></label><button className="home-primary w-full" disabled={!reason||saving||stale||unavailable} onClick={()=>onResolve(reason)}>{saving?'Saving resolution…':'Confirm resolved'}</button><button className="home-text-button" disabled={saving} onClick={()=>setConfirm(false)}>Keep unresolved</button></section>}
 <button className="home-secondary w-full" disabled={saving} onClick={onEdit}>Edit statement figures</button><button className="home-text-button" disabled={saving} onClick={onBack}>Back to Check Pay</button><p className="home-muted text-sm">Saving records this check. Payment receipt and personal taxes are separate.</p>
 </section>;
}
