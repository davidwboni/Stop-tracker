import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { isoDate } from '../features/payperiod/periods';
import { trackProductEvent } from '../services/productAnalytics';

// Minimal manual entry needed by Home; the full Expenses screen is reviewed separately.
export default function HomeExpenseDialog({ open, onClose, save, isGuest }) {
  const [id] = useState(() => crypto.randomUUID());
  const [date, setDate] = useState(isoDate(new Date()));
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('my_expense');
  const [category, setCategory] = useState('Fuel');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!date || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) { setError('Enter a date and an amount greater than £0, with up to two decimal places.'); return; }
    if (!navigator.onLine && !isGuest) { setError('You’re offline. Keep this form open and save when connected.'); return; }
    setSaving(true); setError('');
    try { await save({ id, date, amount: Number(amount), source, category, description: description.trim() }); trackProductEvent('expense_manual_saved', { source: 'home' }); onClose(); }
    catch (_) { setError('Couldn’t save. Your details are still here. Please retry.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onClose={() => !saving && onClose()} className="relative z-[90]">
    <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
    <div className="home-dialog-position"><Dialog.Panel className="home-dialog home-screen">
      <div className="home-row"><Dialog.Title className="text-xl font-bold">Add expense</Dialog.Title><button className="home-icon" aria-label="Close expense" disabled={saving} onClick={onClose}><X /></button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="home-field">Date<input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="home-field">Amount (£)<input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>
        <label className="home-field">Source<select value={source} onChange={e => setSource(e.target.value)}><option value="my_expense">My expense</option><option value="contractor_charge">Contractor charge</option></select></label>
        <p className="home-muted text-sm">Only add costs not already recorded. Your percentage contractor fee is calculated separately.</p>
        <label className="home-field">Category<select value={category} onChange={e => setCategory(e.target.value)}>{['Fuel', 'Parking', 'Tolls', 'Lease', 'Insurance', 'Servicing', 'Repairs', 'Equipment', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="home-field">Merchant or description (optional)<input maxLength={200} value={description} onChange={e => setDescription(e.target.value)} /></label>
        {error && <p role="alert" className="home-error">{error}</p>}
        {isGuest && <p className="home-muted text-sm">Guest records are saved on this device only.</p>}
        <button className="home-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</button>
      </form>
    </Dialog.Panel></div>
  </Dialog>;
}
