const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeReceipt,registerReceiptAI}=require('./receiptAI');
test('normalization excludes foreign amounts, impossible dates and unsolicited private fields',()=>{
 assert.deepEqual(normalizeReceipt({amount:50,currency:'EUR',date:'2026-02-30',merchant:'Shop',category:'invented',cardNumber:'secret'}),{amount:null,date:null,currency:null,description:'Shop',category:'Other',needsReview:true});
 assert.equal(normalizeReceipt({amount:45.2,currency:'GBP',date:'2026-09-26'}).amount,45.2);
 assert.equal(normalizeReceipt({amount:'45.20',currency:'GBP'}).amount,null);
});
function handlers(pro=false){
 class ErrorWithCode extends Error{constructor(code,message){super(message);this.code=code;}}
 return registerReceiptAI({onCall:(_,handler)=>handler,HttpsError:ErrorWithCode,admin:{firestore(){throw new Error('No paid work expected');}},secret:{value:()=>''},getEntitlement:async()=>({isPro:pro})});
}
test('server rejects anonymous users regardless of client claims',async()=>{
 const {extract}=handlers(true);
 await assert.rejects(extract({auth:{uid:'a',token:{firebase:{sign_in_provider:'anonymous'}}},data:{isPro:true}}),{code:'unauthenticated'});
});
test('server requires deployment gate and authoritative Pro entitlement',async()=>{
 const old=process.env.RECEIPT_AI_ENABLED;
 try{
  delete process.env.RECEIPT_AI_ENABLED;
  await assert.rejects(handlers(true).extract({auth:{uid:'a',token:{}},data:{}}),{code:'failed-precondition'});
  process.env.RECEIPT_AI_ENABLED='true';
  await assert.rejects(handlers(false).extract({auth:{uid:'a',token:{}},data:{isPro:true}}),{code:'permission-denied'});
  await assert.rejects(handlers(true).extract({auth:{uid:'a',token:{}},data:{images:[]}}),{code:'invalid-argument'});
 }finally{if(old===undefined)delete process.env.RECEIPT_AI_ENABLED;else process.env.RECEIPT_AI_ENABLED=old;}
});
test('bounded server extraction persists only usage and always releases its lock',async()=>{
 const old=process.env.RECEIPT_AI_ENABLED, previousFetch=global.fetch;
 const writes=[];let providerCalls=0;
 const usage={set:async value=>writes.push(value)};
 const db={collection:()=>({doc:()=>usage}),runTransaction:async callback=>callback({get:async()=>({data:()=>({})}),set:(_,value)=>writes.push(value)})};
 class HttpError extends Error{constructor(code,message){super(message);this.code=code;}}
 const {extract}=registerReceiptAI({onCall:(_,fn)=>fn,HttpsError:HttpError,admin:{firestore:()=>db},secret:{value:()=> 'test-only'},getEntitlement:async()=>({isPro:true})});
 try{
  process.env.RECEIPT_AI_ENABLED='true';
  global.fetch=async()=>{providerCalls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({amount:45.2,currency:'GBP',merchant:'Synthetic Shop',date:'2026-09-26',category:'Fuel'})}}]})};};
  const result=await extract({auth:{uid:'a',token:{}},data:{images:[{mimeType:'image/png',fileBase64:'YWJj'}]}});
  assert.equal(result.amount,45.2);assert.equal(result.needsReview,true);assert.equal(providerCalls,1);
  assert.equal(writes.at(-1).receiptBusyUntil,0);
  assert.ok(writes.every(value=>!JSON.stringify(value).includes('Synthetic')));
  global.fetch=async()=>{throw new Error('provider private message');};
  await assert.rejects(extract({auth:{uid:'a',token:{}},data:{images:[{mimeType:'image/png',fileBase64:'YWJj'}]}}),{code:'unavailable'});
  assert.equal(writes.at(-1).receiptBusyUntil,0);
 }finally{global.fetch=previousFetch;if(old===undefined)delete process.env.RECEIPT_AI_ENABLED;else process.env.RECEIPT_AI_ENABLED=old;}
});
