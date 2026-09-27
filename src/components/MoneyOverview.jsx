import React,{useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {Eye,EyeOff,AlertTriangle,ChevronRight} from 'lucide-react';
import {useData} from '../contexts/DataContext';
import {useAuth} from '../contexts/AuthContext';
import useExpenses from '../hooks/useExpenses';
import {isoDate,listPeriods,getPeriodForDate} from '../features/payperiod/periods';
import {money} from '../features/home/homeModel';
import {recurringOccurrences} from '../features/expenses/expenseModel';
import {moneySummary,moneyRevision,payoutComparison,validRange} from '../features/money/moneyModel';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/expenses.css';
import '../styles/money.css';
const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export default function MoneyOverview(){
 const {logs=[],payPeriodAnchor,periodRecords={},loading,loadError,forceSync,syncing}=useData();
 const {user}=useAuth();const costs=useExpenses();const location=useLocation();const nav=useNavigate();
 const [selected,setSelected]=useState(null),[hidden,setHidden]=useState(()=>{try{return localStorage.getItem('home-hide-money')==='1';}catch(_){return false;}});
 const [revision,setRevision]=useState(null),[offline,setOffline]=useState(!navigator.onLine),[refreshError,setRefreshError]=useState('');
 const today=isoDate(new Date());
 const periods=useMemo(()=>payPeriodAnchor?listPeriods(logs,payPeriodAnchor,13):[],[logs,payPeriodAnchor]);
 const requested=validRange(location.state)?{start:location.state.start,end:location.state.end,id:location.state.start+'_'+location.state.end}:null;
 const fallback={id:'month',start:today.slice(0,7)+'-01',end:isoDate(new Date(new Date().getFullYear(),new Date().getMonth()+1,0))};
 const activePeriod=selected||requested||periods[0]||fallback;
 const period={id:activePeriod.id,start:activePeriod.start,end:activePeriod.end};
 const choices=periods.some(p=>p.id===period.id)?periods:[period,...periods];
 const summary=useMemo(()=>moneySummary(logs,costs.expenses,period),[logs,costs.expenses,period.start,period.end]);
 const busy=loading||costs.loading;
 const unavailable=busy||!!loadError||!!costs.error;
 const comparison=payoutComparison(periodRecords[period.id],period,summary,revision,unavailable);
 const expectedCosts=recurringOccurrences(costs.rules||[],costs.expenses,period);
 const fullPeriod=payPeriodAnchor&&getPeriodForDate(payPeriodAnchor,period.start).id===period.id;
 const cash=p=>hidden?'••••':p==null?'Needs complete records':money(p/100);
 useEffect(()=>{track('money_overview_viewed',{source:'money'});},[]);
 useEffect(()=>{setSelected(null);},[location.key]);
 useEffect(()=>{let active=true;setRevision(null);moneyRevision(logs,costs.expenses,period).then(v=>{if(active)setRevision(v);}).catch(()=>{});return()=>{active=false;};},[logs,costs.expenses,period.start,period.end]);
 useEffect(()=>{const changed=()=>setOffline(!navigator.onLine);window.addEventListener('online',changed);window.addEventListener('offline',changed);return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};},[]);
 function toggle(){const next=!hidden;setHidden(next);try{localStorage.setItem('home-hide-money',next?'1':'0');}catch(_){}}
 async function retry(){setRefreshError('');costs.retry();if(await forceSync?.()===false)setRefreshError('Could not refresh work records. Please retry when connected.');}
 function check(){track('money_comparison_opened',{source:'money'});nav('/app/check-pay',{state:{periodId:period.id,start:period.start,end:period.end,comparisonScope:'contractor_payout'}});}
 const stateLabel={none:period.end<today?'Awaiting statement':'Tracking',incomplete:'Complete the comparison',unavailable:'Comparison unavailable',stale:'Needs recheck',matched:'Checked · figures match',difference:'Difference found',reconciled:'Period reconciled'}[comparison.state];
 const action={none:'Check pay',incomplete:'Review statement',unavailable:'Check pay',stale:'Recheck period',matched:'View check',difference:'Review difference',reconciled:'View check'}[comparison.state];
 return <div className="home-screen expense-page money-page">
 <header className="home-row"><h1 className="text-3xl font-bold">Money</h1><div className="flex gap-2"><button className="home-icon" aria-label={hidden?'Show monetary amounts':'Hide monetary amounts'} aria-pressed={hidden} onClick={toggle}>{hidden?<EyeOff/>:<Eye/>}</button><button className="home-icon" aria-label="Open profile" onClick={()=>nav('/app/profile')}>{user?.displayName?.[0]||'D'}</button></div></header>
 <label className="home-field expense-period mt-5">{payPeriodAnchor?'Pay period':'This month'}<select aria-label="Money period" value={period.id} onChange={e=>{setSelected(choices.find(p=>p.id===e.target.value));track('money_period_changed',{source:'money'});}}>{choices.map(p=><option key={p.id} value={p.id}>{fmt(p.start)} – {fmt(p.end)}</option>)}</select></label>
 <nav className="expense-sections" aria-label="Money sections"><Link to="/app/money" aria-current="page" state={period}>Overview</Link><Link to="/app/money/expenses" state={period}>Expenses</Link><Link to="/app/stats" state={period}>Insights</Link></nav>
 {!payPeriodAnchor&&<p className="home-banner">Set your pay-period dates before checking a statement. <Link className="underline" to="/app/periods">Set pay period</Link></p>}
 {(offline||costs.cached)&&<p role="status" className="home-banner">{user?.isGuest?'Showing records saved on this device.':'Showing cached records; freshness has not been verified.'} {offline?'Connect to refresh.':''}</p>}
 {(loadError||costs.error||refreshError)&&<div className="home-banner" role="alert">{loadError||costs.error||refreshError}<button className="home-text-button" disabled={syncing} onClick={retry}>Retry</button></div>}
 <div className="money-columns"><section className="home-card money-records" aria-busy={busy}>
 <div className="home-row"><h2 className="text-xl font-bold">From your records</h2><span className="money-badge">Estimated</span></div>
 {busy?<div className="home-skeleton" role="status" aria-label="Loading money records"/>:<>
 {!summary.rows.length&&!loadError&&<div className="money-empty"><h3>No work recorded this period</h3><Link className="home-text-button" to="/app/dashboard">Log work</Link></div>}
 <dl className="money-waterfall"><div><dt>Work earnings</dt><dd>{loadError?'Unavailable':cash(summary.gross)}</dd></div><div><dt>Contractor fee{summary.feeRate!=null?` · ${summary.feeRate}%`:''}</dt><dd>{loadError?'Unavailable':cash(summary.fee==null?null:-summary.fee)}</dd></div><div><dt><Link to="/app/money/expenses" state={period}>Contractor charges</Link></dt><dd>{costs.error?'Unavailable':cash(-Math.round(summary.costs.contractor*100))}</dd></div><div><dt><Link to="/app/money/expenses" state={period}>My business expenses</Link></dt><dd>{costs.error?'Unavailable':cash(-Math.round(summary.costs.own*100))}</dd></div></dl>
 <div className="money-net"><h3>Estimated take-home</h3><strong>{unavailable?'Unavailable':cash(summary.takeHome)}</strong><p className="home-muted text-sm">Before personal tax · Based on recorded costs</p></div>
 {summary.fee==null&&!loadError&&<p className="home-banner">Some work records have no saved contractor fee. Check those records before relying on take-home.</p>}
 <details className="money-details" onToggle={e=>{if(e.currentTarget.open)track('money_breakdown_opened',{source:'money'});}}><summary>View calculation</summary><p className="home-muted text-sm">Saved daily earnings minus the fee saved with each entry, then recorded contractor charges and your own expenses. Each daily fee is rounded to pennies before addition.</p><p className="mt-3">Expected contractor payout: <strong>{unavailable?'Unavailable':cash(summary.payout)}</strong></p><Link className="home-text-button" to="/app/entries">View work records</Link></details>
 {!!expectedCosts.length&&<Link className="home-text-button" to="/app/money/expenses" state={period}>Expected costs not yet recorded ({expectedCosts.length})</Link>}
 </>}
 </section><section className="home-card money-comparison" aria-busy={busy}>
 <div className="home-row flex-wrap"><h2 className="text-xl font-bold">Statement comparison</h2><span className="money-badge">{stateLabel}</span></div><p className="home-muted mt-2">Contractor payout</p>
 {busy?<div className="home-skeleton" role="status" aria-label="Loading comparison"/>:<>
 <dl className="money-waterfall"><div><dt>Expected from records</dt><dd>{unavailable?'Unavailable':cash(summary.payout)}</dd></div><div><dt>On your statement</dt><dd>{comparison.statement==null?'Not verified':cash(comparison.statement)}</dd></div></dl>
 <p className="home-muted text-sm">Your own business expenses are excluded from both figures.</p>
 {comparison.state==='difference'&&<div className="money-difference"><AlertTriangle aria-hidden="true"/><div><strong>{cash(comparison.difference)}</strong><p>{hidden?'Statement differs from your records':`Statement is ${cash(Math.abs(comparison.difference))} ${comparison.difference<0?'lower':'higher'}`}</p></div></div>}
 {comparison.state==='incomplete'&&<p className="home-banner">This saved check does not yet verify contractor payout for the same period, GBP currency and tax basis. Gross earnings cannot be compared with net payout.</p>}
 {comparison.state==='stale'&&<p className="home-banner">Records changed since this check. The statement value above is from the previous check; compare again before relying on a difference.</p>}
 {comparison.state==='matched'&&<p className="home-banner">The payout figures match. This does not confirm that payment arrived.</p>}
 {comparison.state==='reconciled'&&<p className="home-banner">This comparison was resolved. Payment receipt and personal taxes are separate.</p>}
 {!fullPeriod?<p className="home-banner">Select a full pay period to compare a statement.</p>:<button className="home-primary w-full mt-5" disabled={unavailable||summary.payout==null} onClick={check}>{action}<ChevronRight/></button>}
 <p className="home-muted text-xs text-center mt-3">{comparison.state==='reconciled'?'Comparison resolved':'Not yet reconciled'}</p>
 </>}
 </section></div></div>;
}
