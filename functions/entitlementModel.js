'use strict';

// Only verified Firebase ID-token custom claims, issued by the Admin SDK,
// can grant internal testing access. A user's email or editable profile
// fields must never be used to decide this permission.
function resolveAccess(entitlement, verifiedToken) {
  const data = entitlement || {};
  const isAdmin = verifiedToken?.stopTrackerAdmin === true;
  const isPaidPro = data.plan === 'pro' && ['active', 'trialing'].includes(data.subscriptionStatus);
  return { isAdmin, isPaidPro, isPro: isPaidPro || isAdmin };
}
module.exports = { resolveAccess };
