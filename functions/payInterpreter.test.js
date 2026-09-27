const {test}=require('node:test');const assert=require('node:assert/strict');const {sanitizeProposal,registerPayInterpreter}=require('./payInterpreter');
test('unknown contractor fee prompts instead of inventing 6%',()=>{
 const result=sanitizeProposal({config:{model:'flat_stops',ratePerStop:2.08}});
 assert.equal(result.config,null);assert.equal(result.questions.length,1);
});
test('strips sensitive and unsupported model fields',()=>{
 const result=sanitizeProposal({config:{model:'flat_stops',ratePerStop:2.08,contractorFeePercent:6,excessParcelRate:.05,bankAccount:'private',role:'pro'}});
 assert.deepEqual(result.config,{model:'flat_stops',ratePerStop:2.08,contractorFeePercent:6,excessParcelRate:.05});
});
test('enforces the server rate limit and prevents paid provider work',async()=>{
 class E extends Error{constructor(code,message){super(message);this.code=code;}}
 const usage={};const handler=registerPayInterpreter({onCall:(_,fn)=>fn,HttpsError:E,admin:{firestore:()=>({collection:()=>({doc:()=>usage}),runTransaction:async fn=>fn({get:async()=>({data:()=>({paySetupDay:new Date().toISOString().slice(0,10),paySetupRequests:20})})})})},secret:{value:()=>''}});
 await assert.rejects(handler({auth:{uid:'driver'},data:{text:'£2 per stop'}}),{code:'resource-exhausted'});
});
