function registerAccountDeletion({onCall,HttpsError,admin}){
 return onCall({cors:true,invoker:'public',timeoutSeconds:120,memory:'512MiB'},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Sign in before deleting your account.');
  if(!request.auth.token.auth_time||Date.now()/1000-request.auth.token.auth_time>300)throw new HttpsError('failed-precondition','Sign out and sign back in, then retry deletion within five minutes.');
  const uid=request.auth.uid,db=admin.firestore();const entitlement=(await db.doc('entitlements/'+uid).get()).data()||{};
  if(entitlement.stripeSubscriptionId&& !['canceled','incomplete_expired'].includes(entitlement.subscriptionStatus))throw new HttpsError('failed-precondition','Cancel your subscription in Manage subscription before deleting. Contact support if access remains active.');
  await admin.storage().bucket().deleteFiles({prefix:'users/'+uid+'/'});
  for(const collection of ['users','invoiceData','payPeriodData','addressMemoryData','usage','entitlements'])await db.recursiveDelete(db.doc(collection+'/'+uid));
  await admin.auth().deleteUser(uid);
  return {deleted:true};
 });
}
module.exports={registerAccountDeletion};
