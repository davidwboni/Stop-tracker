import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ call: vi.fn(), close: vi.fn(), remove: vi.fn() }));
vi.mock('firebase/functions', () => ({ httpsCallable: () => mocks.call }));
vi.mock('../services/firebase', () => ({ functions: {} }));
vi.mock('idb', () => ({ openDB: async () => ({
  getAllKeys: async () => ['users/alice/receipts/1', 'users/bob/receipts/2'],
  delete: mocks.remove, close: mocks.close,
}) }));
import { deleteAccountRecords } from '../services/accountData';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.call.mockResolvedValue({});
});

it('clears both account cache key formats without clearing another user', async () => {
  for (const key of ['savedRoutes_alice', 'alice-deliveryLogs', 'alice-pendingTransactions', 'bob-deliveryLogs']) localStorage.setItem(key, 'data');
  await deleteAccountRecords('alice');
  expect(localStorage.getItem('savedRoutes_alice')).toBeNull();
  expect(localStorage.getItem('alice-deliveryLogs')).toBeNull();
  expect(localStorage.getItem('alice-pendingTransactions')).toBeNull();
  expect(localStorage.getItem('bob-deliveryLogs')).toBe('data');
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('receipts', 'users/alice/receipts/1');
});

it('retains the local cache if server deletion fails', async () => {
  localStorage.setItem('alice-deliveryLogs', 'data');
  mocks.call.mockRejectedValue(new Error('failed'));
  await expect(deleteAccountRecords('alice')).rejects.toThrow('failed');
  expect(localStorage.getItem('alice-deliveryLogs')).toBe('data');
});
