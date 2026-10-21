// Temporary server-controlled preview; never mutates the Stripe entitlement.
// UTC end is exclusive: access ends on 22 November 2026.
// Kill switch: STOP_TRACKER_BETA_ACCESS=false on the Firebase Functions runtime.
const END_UTC = Date.UTC(2026, 10, 22);
const DAILY_SHARED_LIMIT = 100;
const DAILY_ACCOUNT_LIMIT = 8;
function betaAccess(auth, now=Date.now()){
  return !!auth?.uid &&
    auth?.token?.firebase?.sign_in_provider !== 'anonymous' &&
    process.env.STOP_TRACKER_BETA_ACCESS !== 'false' &&
    now < END_UTC;
}
// Reserve against a single shared daily budget BEFORE calling paid APIs.
// All three beta features share the limit, including unsuccessful attempts.
// Never store document contents, addresses or other personal fields here.
async function reserveBetaRequest(tx, db, now, HttpsError){
  const day=new Date(now).toISOString().slice(0,10);
  const ref=db.collection('betaApiBudget').doc(day);
  const saved=(await tx.get(ref)).data()||{};
  const count=Number(saved.requests||0);
  if(!Number.isSafeInteger(count)||count>=DAILY_SHARED_LIMIT)
    throw new HttpsError('resource-exhausted','Beta testing usage limit reached today. Please try tomorrow.');
  tx.set(ref,{requests:count+1,updatedAt:now},{merge:true});
}
// Legacy usage records can contain malformed counts. Treat invalid values as
// exhausted rather than granting extra free trials or returning NaN/null.
function safeUsageCount(value){
  if(value===undefined||value===null||value==='')return 0;
  if(typeof value!=='string'&&typeof value!=='number')return 3;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=0?n:3;
}
module.exports={betaAccess,reserveBetaRequest,safeUsageCount,END_UTC,DAILY_SHARED_LIMIT,DAILY_ACCOUNT_LIMIT};
