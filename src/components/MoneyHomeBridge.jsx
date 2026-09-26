import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import { isoDate, getPeriodForDate } from '../features/payperiod/periods';
import { money, summarizeDay } from '../features/home/homeModel';
import '../styles/home.css';

// Functional destination for approved Home links; full Money design follows its own review.
export default function MoneyHomeBridge() {
  const { logs = [], payPeriodAnchor, loading, loadError } = useData();
  const costs = useExpenses();
  const location = useLocation();
  const period = location.state?.start ? location.state : getPeriodForDate(payPeriodAnchor || isoDate(new Date()));
  const rows = logs.filter(l => l.date >= period.start && l.date <= period.end);
  const expenses = costs.expenses.filter(e => e.date >= period.start && e.date <= period.end);
  const days = rows.map(l => summarizeDay(l, []));
  const gross = days.reduce((s, d) => s + (d?.gross || 0), 0);
  const known = days.length > 0 && days.every(d => d && !d.unavailable && d.afterFee != null);
  const totalCosts = expenses.reduce((s, e) => s + Number(e.amount), 0);
  return <div className="home-screen max-w-2xl mx-auto space-y-4 pb-24"><h1 className="text-2xl font-bold">Money</h1><p className="home-muted">{period.start} – {period.end} · Estimated</p>
    <div className="flex gap-4"><Link className="home-text-button" to="/app/stats">Insights</Link><Link className="home-text-button" to="/app/periods">Pay periods</Link><Link className="home-text-button" to="/app/check-pay">Check Pay</Link></div>
    <section className="home-card"><h2>Recorded totals</h2>{loading ? <p>Loading…</p> : loadError ? <p role="alert">{loadError}</p> : <dl className="home-breakdown"><div><dt>Gross earnings</dt><dd>{days.some(d => d?.unavailable) ? 'Unavailable' : money(gross)}</dd></div><div><dt>Recorded expenses</dt><dd>{costs.loading ? 'Loading…' : costs.error ? 'Unavailable' : money(totalCosts)}</dd></div><div><dt>Estimated take-home</dt><dd>{known && !costs.loading && !costs.error ? money(days.reduce((s, d) => s + d.afterFee, 0) - totalCosts) : 'Needs complete records'}</dd></div></dl>}<p className="home-muted text-sm mt-3">Recorded costs only. Before personal tax. Older entries without saved contractor fees need checking.</p></section>
    <section className="home-card"><h2>Expenses in this range</h2>{costs.error ? <p role="alert">{costs.error}<button className="home-text-button" onClick={costs.retry}>Retry</button></p> : expenses.length ? expenses.map(e => <div key={e.id} className="home-link-row"><span>{e.description || e.category}<small className="block home-muted">{e.date} · {e.source === 'contractor_charge' ? 'Contractor charge' : 'My expense'}</small></span><span>{money(e.amount)}</span></div>) : <p className="home-muted mt-3">{costs.loading ? 'Loading…' : 'No expenses recorded in this range.'}</p>}</section>
  </div>;
}
