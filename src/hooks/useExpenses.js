import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';

export default function useExpenses() {
  const { user } = useAuth();
  const [state, setState] = useState({ owner: null, expenses: [], loading: true, error: '', pending: false });
  const [retry, setRetry] = useState(0);
  const key = `expenses_${user?.uid}`;
  useEffect(() => {
    if (!user?.uid) return;
    const empty = { owner: user.uid, expenses: [], loading: true, error: '', pending: false };
    setState(empty);
    if (user.isGuest) {
      const load = () => {
        try { setState({ ...empty, loading: false, expenses: JSON.parse(localStorage.getItem(key) || '[]') }); }
        catch (_) { setState({ ...empty, loading: false, error: 'Expenses could not be loaded.' }); }
      };
      load(); window.addEventListener('expenses-changed', load);
      return () => window.removeEventListener('expenses-changed', load);
    }
    const timer = setTimeout(() => setState(s => s.loading ? { ...s, loading: false, error: 'Expenses are taking too long to load.' } : s), 12000);
    const off = onSnapshot(collection(db, 'users', user.uid, 'expenses'), { includeMetadataChanges: true }, snapshot => {
      clearTimeout(timer);
      // An empty offline cache is not proof that the account has no expenses.
      setState({ owner: user.uid, expenses: snapshot.docs.map(d => ({ ...d.data(), id: d.id })), loading: false,
        error: snapshot.metadata.fromCache && snapshot.empty ? 'Expenses could not be verified offline.' : '',
        pending: snapshot.metadata.hasPendingWrites, cached: snapshot.metadata.fromCache });
    }, () => { clearTimeout(timer); setState(s => ({ ...s, loading: false, error: 'Expenses could not be loaded.' })); });
    return () => { clearTimeout(timer); off(); };
  }, [user?.uid, user?.isGuest, key, retry]);
  const save = useCallback(async expense => {
    if (!user?.uid) throw new Error('Sign in before saving.');
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) throw new Error('Enter a valid amount.');
    const record = { ...expense, updatedAt: new Date().toISOString() };
    if (user.isGuest) {
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([record, ...rows.filter(e => e.id !== record.id)]));
      window.dispatchEvent(new Event('expenses-changed'));
    } else {
      // Retain the form until the server confirms. Stable IDs make retries idempotent.
      await setDoc(doc(db, 'users', user.uid, 'expenses', expense.id), record);
    }
  }, [user?.uid, user?.isGuest, key]);
  return { ...(state.owner === user?.uid ? state : { expenses: [], loading: true, error: '', pending: false }), save, retry: () => setRetry(n => n + 1) };
}
