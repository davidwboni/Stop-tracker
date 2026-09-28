const {test}=require('node:test');
const assert=require('node:assert/strict');
const {registerAccountDeletion}=require('./accountDeletion');
function setup(entitlement={}){
 const removed=[];
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const db={doc:path=>({path,get:async()=>({data:()=>entitlement})}),recursiveDelete:async ref=>removed.push(ref.path)};
 const admin={firestore:()=>db,storage:()=>({bucket:()=>({deleteFiles:async options=>removed.push(options.prefix)})}),auth:()=>({deleteUser:async uid=>removed.push('auth/'+uid)})};
 return {removed,run:registerAccountDeletion({onCall:(_,handler)=>handler,HttpsError,admin})};
}
const request=()=>({auth:{uid:'driver-a',token:{auth_time:Math.floor(Date.now()/1000)}},data:{uid:'someone-else'}});
test('unauthenticated and stale sessions cannot delete any records',async()=>{
 const {run,removed}=setup();await assert.rejects(run({}),{code:'unauthenticated'});
 const old=request();old.auth.token.auth_time-=600;await assert.rejects(run(old),{code:'failed-precondition'});assert.deepEqual(removed,[]);
});
test('active billing blocks account removal before destructive operations',async()=>{
 const {run,removed}=setup({stripeSubscriptionId:'sub_test',subscriptionStatus:'active'});
 await assert.rejects(run(request()),{code:'failed-precondition'});assert.deepEqual(removed,[]);
});
test('deletes only authenticated owner records and removes auth last',async()=>{
 const {run,removed}=setup({stripeSubscriptionId:'sub_test',subscriptionStatus:'canceled'});
 assert.deepEqual(await run(request()),{deleted:true});
 assert.equal(removed[0],'users/driver-a/');assert.equal(removed.at(-1),'auth/driver-a');
 assert.ok(removed.includes('users/driver-a'));assert.ok(removed.includes('invoiceData/driver-a'));
 assert.ok(removed.every(path=>path.includes('driver-a')&&!path.includes('someone-else')));
});
