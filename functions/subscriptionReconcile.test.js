const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reconcileSubscription } = require('./subscriptionReconcile');

function fixture() {
  let state = {};
  const ref = {};
  return {
    state: () => state,
    db: {
      collection: () => ({ doc: () => ref }),
      runTransaction: async fn => fn({
        get: async () => ({ data: () => ({ ...state }) }),
        set: (_ref, values) => { state = { ...state, ...values }; },
      }),
    },
  };
}
const sub = status => ({ id: 'sub_a', status, created: 1, metadata: { firebaseUid: 'alice' } });
const args = f => ({ db: f.db, uid: 'alice', customer: 'cus_a', timestamp: () => 1 });

test('reconciles current Stripe state instead of an old webhook snapshot', async () => {
  const f = fixture();
  await reconcileSubscription({ ...args(f), listSubscriptions: async () => ({ data: [sub('canceled')] }) });
  assert.equal(f.state().plan, 'free');
  assert.equal(f.state().subscriptionStatus, 'canceled');
});

test('an earlier slow reconciliation cannot overwrite a later result', async () => {
  const f = fixture();
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const first = reconcileSubscription({ ...args(f), listSubscriptions: async () => { await waiting; return { data: [sub('active')] }; } });
  await new Promise(resolve => setImmediate(resolve));
  await reconcileSubscription({ ...args(f), listSubscriptions: async () => ({ data: [sub('canceled')] }) });
  release();
  await first;
  assert.equal(f.state().plan, 'free');
});

test('does not update entitlements from an incomplete subscription list', async () => {
  const f = fixture();
  await assert.rejects(reconcileSubscription({ ...args(f), listSubscriptions: async () => ({ data: [sub('active')], has_more: true }) }));
  assert.equal(f.state().plan, undefined);
});
