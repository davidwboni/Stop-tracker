import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Check, CalendarDays } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useData } from '../contexts/DataContext';
import { PAY_MODELS } from '../features/payperiod/payStructure';
import { isoDate } from '../features/payperiod/periods';
import { grossForEntry, money, pennies } from '../features/home/homeModel';
import { draftFromLog, sameWork, validateDraft } from '../features/home/quickEntryModel';
import { trackProductEvent as track } from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/quick-entry.css';

export default function DailyQuickEntry({ open, initialDate, onDateChange, onClose, onSaved }) {
  const [date, setDate] = useState(initialDate || isoDate(new Date()));
  useEffect(() => { if (open) setDate(initialDate || isoDate(new Date())); }, [open, initialDate]);
  if (!open) return null;
  return <EntryEditor key={date} date={date} onDateChange={value => { setDate(value); onDateChange?.(value); }} onClose={onClose} onSaved={onSaved} />;
}

function EntryEditor({ date, onDateChange, onClose, onSaved }) {
  const { logs = [], paymentConfig, updateLogs, loading, loadError } = useData();
  const rows = logs.filter(row => row.date === date);
  // Wait for the actual record before initializing the form.
  if (loading || loadError) return <Dialog open onClose={onClose} className="qe-root"><div className="qe-backdrop" /><div className="qe-position"><Dialog.Panel className="home-screen qe-panel"><Dialog.Title>Quick Entry</Dialog.Title><p role={loadError ? 'alert' : 'status'}>{loadError || 'Loading your work…'}</p><button className="home-secondary" onClick={onClose}>Close</button></Dialog.Panel></div></Dialog>;
  return <ReadyEditor date={date} rows={rows} logs={logs} paymentConfig={paymentConfig} updateLogs={updateLogs} onDateChange={onDateChange} onClose={onClose} onSaved={onSaved} />;
}

function ReadyEditor({ date, rows, logs, paymentConfig, updateLogs, onDateChange, onClose, onSaved }) {
  const original = useRef(rows[0]);
  const config = useRef(original.current?.payStructureSnapshot || paymentConfig).current;
  const meta = PAY_MODELS.find(model => model.id === config?.model);
  const baseline = useRef(draftFromLog(original.current, config?.model)).current;
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [viewport, setViewport] = useState(null);
  const saveLock = useRef(false);
  const id = useRef(original.current?.id || crypto.randomUUID());
  const titleRef = useRef(null);
  const formRef = useRef(null);
  const closeHandler = useRef(null);
  const reducedMotion = useReducedMotion();
  const today = isoDate(new Date());
  const editing = !!original.current;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const parcelsRelevant = ['flat_stops', 'tiered_stops', 'sliding_scale'].includes(config?.model) && Number(config?.excessParcelRate) > 0;
  const validity = validateDraft(draft, config?.model, parcelsRelevant, date, today);
  const workUnchanged = editing && sameWork(draft, baseline);
  const legacy = editing && !original.current.payStructureSnapshot;
  const calculated = meta && !Object.keys(validity).length ? grossForEntry(config, { quantity: Number(draft.quantity), miles: Number(draft.miles || 0), totalParcels: parcelsRelevant ? draft.parcels : '', extra: draft.extraWork ? Number(draft.amount || 0) : 0 }) : null;
  const gross = legacy && workUnchanged ? original.current.total : calculated;
  const grossKnown = gross != null && Number.isFinite(Number(gross)) && Number.isSafeInteger(pennies(gross));
  const rate = legacy && workUnchanged ? null : config?.contractorFeePercent;
  const feeKnown = rate != null && Number.isFinite(Number(rate)) && Number(rate) >= 0 && Number(rate) <= 100;
  const fee = feeKnown && grossKnown ? Math.round(pennies(gross) * Number(rate) / 100) / 100 : null;
  const transition = { duration: reducedMotion ? 0 : 0.2 };
  const question = { per_day: 'Did you work today?', hourly: 'How many hours did you work?', per_mile: 'How many miles did you drive?' }[config?.model] || 'How many stops did you do today?';
  const primaryLabel = { per_day: 'Worked today', hourly: 'Hours worked', per_mile: 'Miles driven' }[config?.model] || 'Stops';

  useEffect(() => {
    const view = window.visualViewport;
    if (!view) return;
    const update = () => setViewport({ height: view.height, top: view.offsetTop });
    update(); view.addEventListener('resize', update); view.addEventListener('scroll', update);
    return () => { view.removeEventListener('resize', update); view.removeEventListener('scroll', update); };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  closeHandler.current = () => {
    if (saveLock.current) return;
    if (pending) { setPending(null); return; }
    if (dirty) setPending({ kind: 'close' });
    else { track('quick_entry_dismissed', { mode: editing ? 'edit' : 'new' }); onClose(); }
  };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let listener;
    NativeApp.addListener('backButton', () => {
      const active = document.activeElement;
      if (window.visualViewport && window.innerHeight - window.visualViewport.height > 150 && active?.matches('input, textarea')) active.blur();
      else closeHandler.current?.();
    }).then(handle => { if (disposed) handle.remove(); else listener = handle; });
    return () => { disposed = true; listener?.remove(); };
  }, []);

  function change(field, value) {
    setDraft(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined, save: undefined }));
  }
  function changeDate(value) {
    if (!value || value === date) return;
    if (dirty) setPending({ kind: 'date', value });
    else onDateChange(value);
  }
  function discard() {
    if (pending.kind === 'date') onDateChange(pending.value);
    else { track('quick_entry_dismissed', { mode: editing ? 'edit' : 'new' }); onClose(); }
    setPending(null);
  }
  async function save(event) {
    event.preventDefault();
    if (saveLock.current) return;
    const nextErrors = { ...validity };
    if (!meta || !grossKnown) nextErrors.save = 'Earnings could not be calculated. Check your pay structure.';
    if (rows.length > 1) nextErrors.save = 'Multiple records exist for this date. Review them in View records before editing.';
    if (JSON.stringify(rows[0]) !== JSON.stringify(original.current)) nextErrors.save = 'This record changed while you were editing. Close and reopen it before saving.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        const target = formRef.current?.querySelector('[aria-invalid="true"], [role="alert"]');
        target?.scrollIntoView?.({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
        target?.focus?.();
      });
      track('quick_entry_validation_failed', { mode: editing ? 'edit' : 'new' });
      return;
    }
    saveLock.current = true; setSaving(true); setErrors({});
    try {
      const quantity = Number(draft.quantity);
      const record = { ...original.current, id: id.current, date, quantity,
        stops: meta.primary.field === 'stops' ? quantity : (original.current?.stops || 0),
        miles: meta.primary.field === 'miles' ? quantity : Number(draft.miles || 0),
        extraWork: draft.extraWork, extra: draft.extraWork ? Number(draft.amount || 0) : 0,
        extraType: draft.extraWork ? draft.extraType || null : null, notes: draft.notes.trim(),
        total: Number(gross), payModel: config.model, timestamp: new Date().toISOString() };
      if (parcelsRelevant && draft.parcels !== '') record.totalParcels = Number(draft.parcels);
      else delete record.totalParcels;
      if (meta.primary.field === 'hours') record.hours = quantity;
      if (!legacy || !workUnchanged) record.payStructureSnapshot = JSON.parse(JSON.stringify(config));
      const result = await updateLogs([record, ...logs.filter(row => row.date !== date)].sort((a, b) => b.date.localeCompare(a.date)));
      if (result?.success === false) throw new Error('Save rejected');
      track('daily_entry_saved', { mode: editing ? 'edit' : 'new', source: 'home' });
      onSaved?.(record, result);
    } catch (_) { setErrors({ save: "Couldn't save. Your entry is still here — please try again." }); }
    finally { saveLock.current = false; setSaving(false); }
  }
  const error = field => errors[field] ? <p id={'qe-error-' + field} role="alert" className="home-error">{errors[field]}</p> : null;
  const inputProps = field => ({ value: draft[field], onChange: event => change(field, event.target.value), 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? 'qe-error-' + field : undefined });
  return <Dialog open onClose={() => closeHandler.current?.()} initialFocus={titleRef} className="qe-root">
    <div className="qe-backdrop" aria-hidden="true" />
    <div className="qe-position" style={viewport ? { height: viewport.height, top: viewport.top } : undefined}>
      <Dialog.Panel as={motion.div} initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="home-screen qe-panel">
        <header className="qe-header"><div><Dialog.Title ref={titleRef} tabIndex={-1} className="qe-title">{editing ? 'Edit entry' : 'Quick Entry'}</Dialog.Title><p className="home-muted">Log your work. See your estimate.</p></div><button type="button" className="home-icon" aria-label="Close Quick Entry" disabled={saving} onClick={() => closeHandler.current?.()}><X /></button></header>
        {pending ? <div className="qe-discard" role="alert"><h3>Discard unsaved changes?</h3><p>Your changes have not been saved.</p><button className="home-primary w-full" onClick={() => setPending(null)}>Keep editing</button><button className="home-secondary w-full" onClick={discard}>{pending.kind === 'date' ? 'Discard and change date' : 'Discard changes'}</button></div> :
        <form ref={formRef} onSubmit={save} noValidate className="qe-form">
          <fieldset disabled={saving} className="qe-scroll">
            <label className="home-field qe-date"><span><CalendarDays size={18} aria-hidden="true" />Entry date</span><input aria-label="Entry date" type="date" max={today} value={date} onChange={event => changeDate(event.target.value)} /></label>{error('date')}
            <h3 className="qe-question">{question}</h3>
            {meta?.primary.field === 'day' ? <div className="qe-worked" role="group" aria-label="Worked today"><button type="button" aria-pressed={draft.quantity === '1'} onClick={() => change('quantity', '1')}>Yes, I worked</button><button type="button" aria-pressed={draft.quantity === '0'} onClick={() => change('quantity', '0')}>No work today</button></div> :
            <div className={parcelsRelevant ? 'qe-counts' : 'qe-counts qe-single'}><label className="home-field">{primaryLabel}<input {...inputProps('quantity')} inputMode={meta?.primary.field === 'stops' ? 'numeric' : 'decimal'} placeholder="0" autoComplete="off" /></label>{parcelsRelevant && <label className="home-field">Total parcels<input {...inputProps('parcels')} inputMode="numeric" placeholder="Optional" autoComplete="off" /></label>}</div>}
            {error('quantity')}{error('parcels')}
            {parcelsRelevant && <><p className="home-muted qe-hint">Parcels can be added later if unknown.</p><div className="qe-excess"><div><strong>Excess parcels</strong><p className="home-muted">{draft.parcels === '' ? 'Parcel earnings not included yet.' : validity.parcels || validity.quantity ? 'Check the counts above.' : draft.parcels + ' parcels − ' + draft.quantity + ' stops'}</p></div><strong>{draft.parcels === '' || validity.parcels || validity.quantity ? '—' : Number(draft.parcels) - Number(draft.quantity)}</strong></div></>}
            {config?.model === 'sliding_scale' && <label className="home-field">Miles driven<input {...inputProps('miles')} inputMode="decimal" />{error('miles')}</label>}
            <section className="qe-extra"><button type="button" className="qe-extra-toggle" role="switch" aria-checked={draft.extraWork} aria-controls="qe-extras" onClick={() => change('extraWork', !draft.extraWork)}><span>Did you do extra work?</span><span className={'qe-switch ' + (draft.extraWork ? 'qe-switch-on' : '')} aria-hidden="true"><span /></span></button>
            {draft.extraWork && <motion.div id="qe-extras" initial={reducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="qe-extra-fields"><label className="home-field">Extra type (optional)<select {...inputProps('extraType')}><option value="">Choose a type</option>{Array.from(new Set(['Extra run', 'Collection', 'Return', 'Extra route', 'Other', draft.extraType].filter(Boolean))).map(type => <option key={type}>{type}</option>)}</select></label><label className="home-field">Extra amount (£)<input {...inputProps('amount')} inputMode="decimal" placeholder="Optional" /></label>{error('amount')}{draft.amount === '' && <p className="home-muted qe-hint">No extra payment included until an amount is entered.</p>}<label className="home-field">Notes (optional)<textarea {...inputProps('notes')} rows={2} maxLength={1000} placeholder="What did you do?" /></label></motion.div>}</section>
            {legacy && <p className="qe-hint home-banner">This older entry has no saved rates. Its original gross stays unchanged unless you change work quantities or extra payment; those changes use your current pay structure.</p>}
            <section className="qe-summary" aria-label="Earnings preview"><div className="home-row"><h3>Your earnings</h3><span className="home-badge">Estimated</span></div><dl><div><dt>Gross earnings</dt><dd>{grossKnown ? money(gross) : '—'}</dd></div><div><dt>Contractor fee{feeKnown ? ' · ' + rate + '%' : ''}</dt><dd>{fee != null ? money(-fee) : 'Not recorded'}</dd></div><div className="qe-after"><dt>After contractor fee</dt><dd aria-live="polite">{fee != null ? money((pennies(gross) - pennies(fee)) / 100) : '—'}</dd></div></dl><p className="home-muted qe-hint">Before expenses and personal tax</p></section>
            {rows.length > 1 && <p role="alert" className="home-error">Multiple records exist for this day. Review them in View records before saving.</p>}
            {error('save')}
          </fieldset>
          <footer className="qe-footer"><button type="submit" className="home-primary w-full" disabled={saving || rows.length > 1 || !meta}><Check size={20} aria-hidden="true" />{saving ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}</button><p className="home-muted qe-hint">{saving ? 'Keep this open until saving finishes.' : 'You can edit this later.'}</p></footer>
        </form>}
      </Dialog.Panel>
    </div>
  </Dialog>;
}
