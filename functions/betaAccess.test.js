const {test}=require('node:test');
const assert=require('node:assert/strict');
const {betaAccess,reserveBetaRequest,END_UTC,DAILY_ACCOUNT_LIMIT,DAILY_SHARED_LIMIT}=require('./betaAccess');
class HttpError extends Error {constructor(code,message){super(message);this.code=code;}}
const permanent={uid:'driver-1',token:{firebase:{sign_in_provider:'password'}}};
test('preview is time-limited, reversible and restricted to permanent signed-in users',()=>{
 const old=process.env.STOP_TRACKER_BETA_ACCESS;
 try {
   delete process.env.STOP_TRACKER_BETA_ACCESS;
   assert.equal(betaAccess(permanent,Date.UTC(2026,9,21)),true);
   assert.equal(betaAccess(permanent,END_UTC),false);
   assert.equal(betaAccess({uid:'guest',token:{firebase:{sign_in_provider:'anonymous'}}},Date.UTC(2026,9,21)),false);
   assert.equal(betaAccess(null,Date.UTC(2026,9,21)),false);
   process.env.STOP_TRACKER_BETA_ACCESS='false';
   assert.equal(betaAccess(permanent,Date.UTC(2026,9,21)),false);
   assert.equal(DAILY_ACCOUNT_LIMIT,8);
 } finally {if(old===undefined)delete process.env.STOP_TRACKER_BETA_ACCESS;else process.env.STOP_TRACKER_BETA_ACCESS=old;}
});
test('shared budget reserves at most 100 requests per day without storing personal data',async()=>{
 const writes=[];let count=0;
 const ref={id:'2026-10-21'};
 const db={collection:name=>{assert.equal(name,'betaApiBudget');return {doc:day=>{assert.equal(day,'2026-10-21');return ref}}}};
 const tx={get:async r=>{assert.equal(r,ref);return {data:()=>({requests:count})}},set:(r,patch,options)=>{writes.push(patch);count=patch.requests;assert.deepEqual(options,{merge:true})}};
 for(let i=0;i<DAILY_SHARED_LIMIT;i++)await reserveBetaRequest(tx,db,Date.UTC(2026,9,21),HttpError);
 assert.equal(count,100);assert.equal(writes.length,100);
 await assert.rejects(reserveBetaRequest(tx,db,Date.UTC(2026,9,21),HttpError),{code:'resource-exhausted'});
 assert.ok(writes.every(x=>Object.keys(x).sort().join(',')==='requests,updatedAt'));
});

test('legacy usage counters are valid integers and cannot grant extra free attempts',()=>{
 const {safeUsageCount}=require('./betaAccess');
 assert.equal(safeUsageCount(undefined),0);
 assert.equal(safeUsageCount(null),0);
 assert.equal(safeUsageCount(''),0);
 assert.equal(safeUsageCount('2'),2);
 assert.equal(safeUsageCount(3),3);
 for(const input of [NaN,Infinity,-1,1.5,'oops','Infinity',{},true,Number.MAX_SAFE_INTEGER+10]){
   assert.equal(safeUsageCount(input),3,'invalid usage values must be treated as exhausted');
 }
});
