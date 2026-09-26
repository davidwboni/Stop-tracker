import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Package, Plus, History, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import DailyQuickEntry from './DailyQuickEntry';
import HomeExpenseDialog from './HomeExpenseDialog';
import useExpenses from '../hooks/useExpenses';
import { getPeriodForDate, isoDate } from '../features/payperiod/periods';
import { money, pennies, summarizeDay, weekFor } from '../features/home/homeModel';
import { trackProductEvent as track } from '../services/productAnalytics';
import '../styles/home.css';

const shortDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const readHidden = () => { try { return localStorage.getItem('home-hide-money') === '1'; } catch (_) { return false; } };
export default function SimpleDashboard() {
  const { user } = useAuth();
  const { logs = [], loading, loadError, forceSync, paymentConfig, payPeriodAnchor, periodRecords = {}, isNewUser, lastSaveStatus } = useData();
  const costs = useExpenses();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());
  const [hidden, setHidden] = useState(readHidden);
  const [quickOpen, setQuickOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState('');
  const today = isoDate(now);
  const [entryDate, setEntryDate] = useState(today);
  const todayRows = logs.filter(l => l.date === today);
  const todayLog = todayRows[0];
  const day = summarizeDay(todayLog, costs.expenses);
  const week = weekFor(now);
  const weekRows = logs.filter(l => l.date >= week.start && l.date <= today);
  const weekKnown = weekRows.every(l => l.total != null && Number.isFinite(Number(l.total)));
  const weekGross = weekRows.reduce((sum, l) => sum + pennies(l.total || 0), 0) / 100;
  const period = useMemo(() => payPeriodAnchor ? getPeriodForDate(payPeriodAnchor, now) : null, [payPeriodAnchor, now]);
  const periodRecord = period ? periodRecords[period.id] : null;
  const hasDifference = periodRecord && (Number(periodRecord.differenceAmount) !== 0 || Number(periodRecord.differenceStops) !== 0) && (periodRecord.differenceAmount != null || periodRecord.differenceStops != null);
  const periodStatus = hasDifference ? 'Difference found' : periodRecord?.status === 'reconciled' ? 'Checked' : 'Tracking';
  const cash = value => hidden ? '••••' : money(value);
  const model = day?.model || paymentConfig?.model;
  const primaryMetric = model === 'per_day' ? ['Yes', 'Worked today'] : model === 'hourly' ? [todayLog?.quantity ?? todayLog?.hours ?? '—', 'Hours'] : model === 'per_mile' ? [todayLog?.quantity ?? todayLog?.miles ?? '—', 'Miles'] : [todayLog?.stops ?? '—', 'Stops'];
  const parcelRelevant = ['flat_stops', 'tiered_stops', 'sliding_scale'].includes(model) && Number((day?.config || paymentConfig)?.excessParcelRate) > 0;
  const prompt = model === 'per_day' ? 'Did you work today?' : model === 'hourly' ? 'How many hours did you work today?' : model === 'per_mile' ? 'How many miles did you drive today?' : 'How many stops did you do today?';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const refresh = () => { setNow(new Date()); setOnline(navigator.onLine); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => { if (!loading) track('home_viewed', { state: loadError ? 'error' : todayLog ? 'saved' : 'empty' }); }, [loading, loadError, todayLog]);
  useEffect(() => {
    if (loading || loadError || todayLog || isNewUser || location.state?.walkthrough || hour < 13) return;
    try {
      if (!localStorage.getItem(`daily-quick-entry-dismissed-${user?.uid}-${today}`)) {
        localStorage.setItem(`daily-quick-entry-dismissed-${user?.uid}-${today}`, '1');
        setEntryDate(today); setQuickOpen(true); track('quick_entry_opened', { mode: 'new', source: 'home' });
      }
    } catch (_) { /* Explicit Quick Entry remains available without browser storage. */ }
  }, [loading, loadError, todayLog, isNewUser, location.state?.walkthrough, hour, user?.uid, today]);
  function openEntry(date = today) {
    setEntryDate(date); setQuickOpen(true);
    track('quick_entry_opened', { mode: logs.some(l => l.date === date) ? 'edit' : 'new', source: 'home' });
  }
  function toggleHidden() { const next = !hidden; setHidden(next); try { localStorage.setItem('home-hide-money', next ? '1' : '0'); } catch (_) {} }
  const records = () => { track('records_opened', { source: 'home' }); navigate('/app/entries'); };
  const goMoney = range => { track('money_overview_viewed', { source: 'home' }); navigate('/app/money', { state: range }); };

  return <div className="home-screen home-layout">
    <header className="home-header">
      <div className="home-row"><div className="home-brand"><Package aria-hidden="true" /><span>STOP TRACKER</span></div><div className="flex gap-2"><button className="home-icon" onClick={toggleHidden} aria-label={hidden ? 'Show monetary amounts' : 'Hide monetary amounts'} aria-pressed={hidden}>{hidden ? <EyeOff /> : <Eye />}</button><button className="home-icon" aria-label="Open profile" onClick={() => navigate('/app/profile')}>{user?.displayName?.[0]?.toUpperCase() || 'D'}</button></div></div>
      <h1>{greeting}, {user?.displayName?.split(' ')[0] || 'Driver'}</h1>
      <p className="home-muted">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
    </header>
    {(!online || lastSaveStatus === 'local' || costs.pending) && <p role="status" className="home-banner">{!online ? 'Offline · showing available records' : 'Changes on this device · waiting to sync'}</p>}
    {notice && <p role="status" className="home-banner">{notice}</p>}
    <div className="home-columns">
      <div className="space-y-3">
        <section className="home-card" aria-labelledby="today-title" aria-busy={loading}>
          <div className="home-row"><h2 id="today-title">Today</h2><span className="home-badge">Estimated</span></div>
          {loading ? <div role="status" aria-label="Loading today's work" className="home-skeleton" /> : loadError ? <div role="alert" className="space-y-3 py-5"><p>{loadError}</p><button className="home-secondary" onClick={forceSync}>Retry loading records</button></div> : todayLog && !day?.unavailable ? <>
            <div className="home-metrics"><div><strong>{primaryMetric[0]}</strong><span>{primaryMetric[1]}</span></div>{parcelRelevant && <div><strong>{day.excess ?? '—'}</strong><span>Excess parcels{day.excess == null ? ' · not recorded' : ''}</span></div>}</div>
            <div className="home-hero"><h3>{day.takeHome == null ? 'Recorded gross earnings' : 'Estimated take-home'}</h3><div className={`home-money ${day.takeHome < 0 ? 'home-negative' : ''}`} aria-live="polite">{costs.loading && day.takeHome != null ? '…' : costs.error && day.takeHome != null ? 'Unavailable' : cash(day.takeHome ?? day.gross)}</div><p className="home-muted text-sm">Recorded costs only<br />Before personal tax</p></div>
            {day.feeRate == null && <p className="home-banner">No contractor fee was recorded with this entry. Its original gross is preserved; take-home cannot be verified.</p>}
            {todayRows.length > 1 && <p className="home-banner">Multiple records exist for today. <button onClick={records} className="underline">Review records</button> before editing.</p>}
            <dl className="home-breakdown"><div><dt>Gross earnings</dt><dd>{cash(day.gross)}</dd></div><div><dt>After contractor fee{day.feeRate != null ? ` (${day.feeRate}%)` : ''}</dt><dd>{day.afterFee == null ? 'Not recorded' : cash(day.afterFee)}</dd></div><div><dt><button className="home-text-button" onClick={() => goMoney({ start: today, end: today })}>Expenses today</button></dt><dd>{costs.loading ? 'Loading…' : costs.error ? 'Unavailable' : cash(-day.expenses)}</dd></div></dl>
            {costs.error && <p role="alert" className="home-error">{costs.error} <button className="home-text-button underline" onClick={costs.retry}>Retry</button></p>}
            {costs.expenses.some(e => e.periodOnly) && <p className="home-muted text-sm">Period-wide charges are not included in today’s estimate.</p>}
            <button className="home-link-row" aria-expanded={expanded} aria-controls="home-calculation" onClick={() => { setExpanded(!expanded); if (!expanded) track('home_calculation_expanded'); }}>View calculation<ChevronDown className={expanded ? 'rotate-180' : ''} /></button>
            {expanded && <div id="home-calculation" className="home-detail">
              {day.config?.model === 'flat_stops' && <p>{todayLog.stops} stops × {cash(day.config.ratePerStop)}</p>}
              {day.config?.model === 'per_day' && <p>Day rate: {cash(day.config.ratePerDay)}</p>}
              {day.config && parcelRelevant && day.excess != null && <p>{day.excess} excess parcels × {cash(day.config.excessParcelRate)}</p>}
              <p>Extra work: {cash(Number(todayLog.extra) || 0)}</p>
              {day.fee != null && <p>Contractor fee: {cash(-day.fee)}</p>}
              <p>Contractor charges: {cash(-day.dailyExpenses.filter(e => e.source === 'contractor_charge').reduce((s, e) => s + Number(e.amount), 0))}</p>
              <p>My expenses: {cash(-day.dailyExpenses.filter(e => e.source === 'my_expense').reduce((s, e) => s + Number(e.amount), 0))}</p>
              <p className="home-muted">Uses the earnings saved with this record. Period reconciliation is separate from payment received.</p>
            </div>}
          </> : <div className="home-empty"><h3>{todayLog ? 'This entry needs checking' : prompt}</h3><p className="home-muted">{todayLog ? 'The saved earnings could not be read. Review the record before relying on a total.' : 'Use Quick Entry below. Your estimate appears after saving.'}</p><button className="home-text-button" onClick={() => navigate('/app/settings')}>Review pay structure <ChevronRight size={16} /></button></div>}
        </section>
        <div className="home-secondary-actions"><button className="home-secondary" onClick={() => { track('expense_opened', { source: 'home' }); setExpenseOpen(true); }}><Plus size={20} />Add expense</button><button className="home-secondary" onClick={records}><History size={20} />View records</button></div>
      </div>
      <aside className="space-y-3">
        <section className="home-card"><div className="home-row"><h2>This week so far</h2><span className="home-badge">Estimated</span></div><p className="home-muted text-sm mt-2">{shortDate(week.start)}–{shortDate(week.end)}</p><p className="home-week-money">{loading ? '…' : loadError || !weekKnown ? 'Unavailable' : weekRows.length ? cash(weekGross) : 'No work logged'}</p><p className="home-muted text-sm">Gross earnings</p><button className="home-link-row" onClick={() => goMoney(week)}>View week<ChevronRight /></button></section>
        <button className="home-card home-period" onClick={() => period ? goMoney(period) : navigate('/app/periods')}><span><strong>Current pay period</strong><span className="home-muted block mt-1">{period ? `${shortDate(period.start)}–${shortDate(period.end)} · ${periodStatus}` : 'Set your pay-period dates'}</span></span><ChevronRight /></button>
        <button data-tour="past-entry" className="home-text-button" onClick={() => { const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); openEntry(isoDate(yesterday)); }}>Log another day<ChevronRight size={16} /></button>
      </aside>
    </div>
    {!quickOpen && <div className="home-entry-dock"><p className="home-muted text-xs mb-2">{todayLog ? 'Today saved · Tap to edit' : 'Your work. Your records. Your pay.'}</p><button data-tour="log-work" className="home-primary w-full" disabled={loading || !!loadError} onClick={() => todayRows.length > 1 ? records() : openEntry()}><Plus size={22} />Quick Entry</button></div>}
    {createPortal(<DailyQuickEntry open={quickOpen} initialDate={entryDate} onDateChange={setEntryDate} onClose={() => setQuickOpen(false)} onSaved={() => { setQuickOpen(false); setNotice('Work saved'); }} />, document.body)}
    {expenseOpen && <HomeExpenseDialog open onClose={() => setExpenseOpen(false)} save={costs.save} isGuest={user?.isGuest} />}
  </div>;
}
