// Reserve a sequence before querying Stripe; only the most recent reconciliation
// may publish its result. Events are notifications, not authoritative snapshots.
async function reconcileSubscription({ db, uid, customer, listSubscriptions, timestamp }) {
  const ref = db.collection('entitlements').doc(uid);
  const sequence = await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() || {};
    if (data.stripeCustomerId && data.stripeCustomerId !== customer) {
      throw new Error('Stripe customer does not match entitlement');
    }
    const next = (Number(data.reconcileSequence) || 0) + 1;
    tx.set(ref, { reconcileSequence: next }, { merge: true });
    return next;
  });
  const response = await listSubscriptions(customer);
  if (response.has_more || !Array.isArray(response.data)) throw new Error('Incomplete subscription list');
  const subscriptions = response.data.filter(sub => sub.metadata?.firebaseUid === uid)
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  const sub = subscriptions.find(item => ['active', 'trialing'].includes(item.status)) || subscriptions[0];
  if (!sub) throw new Error('No matching subscription');
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data() || {};
    if (current.reconcileSequence !== sequence) return;
    const active = ['active', 'trialing'].includes(sub.status);
    tx.set(ref, {
      plan: active ? 'pro' : 'free', subscriptionStatus: sub.status,
      stripeCustomerId: customer, stripeSubscriptionId: sub.id,
      priceId: sub.items?.data?.[0]?.price?.id || null,
      currentPeriodEnd: sub.items?.data?.[0]?.current_period_end || null,
      updatedAt: timestamp(),
    }, { merge: true });
  });
}
module.exports = { reconcileSubscription };
