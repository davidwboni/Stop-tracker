#!/usr/bin/env node
'use strict';

// Run LOCALLY from the functions directory with authorized Firebase credentials.
// Dry-run is the default. Never put a service-account key into this repository.
//
// Prerequisites:
//  - npm install in functions/
//  - gcloud auth application-default login with an identity that may manage
//    Firebase Authentication users in project stop-tracker-v1
//
// Dry run:
//   node scripts/grant-owner-admin.js --email YOUR_EMAIL
// Apply (requires project + email confirmation):
//   node scripts/grant-owner-admin.js --email YOUR_EMAIL --apply --project stop-tracker-v1
//
// This grants the Firebase Auth custom claim 'stopTrackerAdmin' only; it does not grant
// access to other users' Firestore data or change Stripe billing state.

const admin = require('firebase-admin');
const args = process.argv.slice(2);
function arg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}
const email = arg('--email');
const projectId = arg('--project') || 'stop-tracker-v1';
const apply = args.includes('--apply');
const confirmed = arg('--confirm-email');

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[-a-z0-9]+$/.test(projectId)) {
    throw new Error('Supply --email EMAIL and optionally --project stop-tracker-v1.');
  }
  if (projectId !== 'stop-tracker-v1') throw new Error('Refusing to modify an unexpected Firebase project.');
  if (apply && confirmed !== email) throw new Error('To apply, also pass --confirm-email with the same address.');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const user = await admin.auth().getUserByEmail(email);
  if (user.disabled) throw new Error('Cannot grant access to a disabled account.');
  if (!user.emailVerified) throw new Error('Verify the account email in Firebase Authentication before granting admin access.');
  const claims = { ...(user.customClaims || {}) };
  if (claims.stopTrackerAdmin === true) {
    process.stdout.write('Account already has Stop Tracker Stop Tracker admin custom claim. No changes needed.\n');
    return;
  }
  process.stdout.write(`Project: ${projectId}. User found; account enabled and email verified.\n`);
  if (!apply) {
    process.stdout.write('Dry run only. Re-run with --apply --confirm-email EMAIL to grant admin.\n');
    return;
  }
  claims.stopTrackerAdmin = true;
  await admin.auth().setCustomUserClaims(user.uid, claims);
  const updated = await admin.auth().getUser(user.uid);
  if (updated.customClaims?.admin !== true) throw new Error('Stop Tracker admin claim was not confirmed after write.');
  process.stdout.write('Admin custom claim confirmed. User must sign out and sign back in to refresh the ID token.\n');
}
main().catch(err=>{
  console.error('Admin provisioning failed:',err?.message || 'unknown');
  process.exitCode=1;
});
