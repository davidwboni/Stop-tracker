import { beforeEach, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }));
vi.mock('firebase/firestore', async original => ({
  ...await original(),
  getFirestore: () => ({ settings: () => {} }),
  enableIndexedDbPersistence: () => Promise.resolve(),
  doc: (_db, path) => path,
  setDoc: fake.write,
  getDoc: fake.read,
  getDocFromServer: fake.read,
  serverTimestamp: () => 'server-time',
  waitForPendingWrites: () => Promise.resolve(),
}));
import { syncData } from '../services/firebase';

beforeEach(() => {
  localStorage.clear();
  fake.write.mockReset().mockResolvedValue();
  fake.read.mockReset();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

it('replays queued delivery logs as an array and clears only completed entries', async () => {
  localStorage.setItem('u-pendingTransactions', JSON.stringify([{ collection: 'deliveryLogs', data: { logs: [{ id: 1 }] } }]));
  const result = await syncData.processPendingTransactions('u');
  expect(result.success).toBe(true);
  expect(fake.write).toHaveBeenCalledWith('users/u/deliveryLogs/data', { logs: [{ id: 1 }], updatedAt: 'server-time' }, { merge: true });
  expect(localStorage.getItem('u-pendingTransactions')).toBeNull();
});

it('retains failed entries and does not replace cache during refresh', async () => {
  const queue = [{ collection: 'deliveryLogs', data: { logs: [{ id: 2 }] }, timestamp: '2020-01-01' }];
  localStorage.setItem('u-pendingTransactions', JSON.stringify(queue));
  localStorage.setItem('u-deliveryLogs', JSON.stringify({ logs: [{ id: 2 }] }));
  fake.write.mockRejectedValue(new Error('offline'));
  expect((await syncData.forceRefreshAllData('u')).success).toBe(false);
  expect(JSON.parse(localStorage.getItem('u-pendingTransactions'))).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem('u-deliveryLogs')).logs).toEqual([{ id: 2 }]);
  expect(fake.read).not.toHaveBeenCalled();
});

it('keeps a new entry added while an older write is in flight', async () => {
  localStorage.setItem('u-pendingTransactions', JSON.stringify([{ collection: 'deliveryLogs', data: { logs: [{ id: 1 }] } }]));
  let release;
  fake.write.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const processing = syncData.processPendingTransactions('u');
  await syncData.saveDeliveryLogs('u', [{ id: 1 }, { id: 2 }]);
  release();
  await processing;
  const queue = JSON.parse(localStorage.getItem('u-pendingTransactions'));
  expect(queue).toHaveLength(1);
  expect(queue[0].data.logs).toEqual([{ id: 1 }, { id: 2 }]);
});
