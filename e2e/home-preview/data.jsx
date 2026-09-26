import React, { createContext, useContext, useState } from 'react';
import { isoDate } from '../../src/features/payperiod/periods';
const Context = createContext();
export const useData = () => useContext(Context);
export const config = { model: 'flat_stops', ratePerStop: 2.08, excessParcelRate: .05, contractorFeePercent: 6 };
export function FixtureProvider({ children }) {
  const today = isoDate(new Date());
  const mode = new URLSearchParams(location.search).get('state');
  const [logs, setLogs] = useState(mode === 'empty' ? [] : [{ id: 'sample', date: today, stops: 120, quantity: 120, totalParcels: 158, extra: 30, total: 281.5, payStructureSnapshot: config }]);
  return <Context.Provider value={{ logs, paymentConfig: config, loading: mode === 'loading', loadError: mode === 'error' ? 'Your saved work could not be loaded. Please retry.' : '', isNewUser: true, payPeriodAnchor: '2026-09-14', periodRecords: {}, updateLogs: async rows => {setLogs(rows); return {success:true};}, forceSync: () => {}, lastSaveStatus: '' }}>{children}</Context.Provider>;
}
