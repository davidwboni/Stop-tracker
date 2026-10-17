'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAccess } = require('../entitlementModel');

test('free users stay Free even if they supply an editable admin profile field', () => {
  assert.deepEqual(resolveAccess({plan:'free',role:'admin',admin:true},{}), {isAdmin:false,isPaidPro:false,isPro:false});
});
test('only signed Firebase custom claim grants internal premium testing', () => {
  assert.deepEqual(resolveAccess({plan:'free'},{admin:true}), {isAdmin:true,isPaidPro:false,isPro:true});
  assert.deepEqual(resolveAccess({plan:'free'},{admin:'true'}), {isAdmin:false,isPaidPro:false,isPro:false});
  assert.deepEqual(resolveAccess({plan:'free'},{email:'owner@example.com',email_verified:true}), {isAdmin:false,isPaidPro:false,isPro:false});
});
test('paid subscription remains distinct from admin role', () => {
  assert.deepEqual(resolveAccess({plan:'pro',subscriptionStatus:'active'},{}), {isAdmin:false,isPaidPro:true,isPro:true});
  assert.deepEqual(resolveAccess({plan:'pro',subscriptionStatus:'canceled'},{}), {isAdmin:false,isPaidPro:false,isPro:false});
  assert.deepEqual(resolveAccess({plan:'pro',subscriptionStatus:'canceled'},{admin:true}), {isAdmin:true,isPaidPro:false,isPro:true});
});
