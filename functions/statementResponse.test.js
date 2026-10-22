const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseStatementResponse,StatementResponseError,readWithSummaryFallback}=require('./statementResponse');
const envelop=(content,reason='stop')=>({choices:[{finish_reason:reason,message:{content}}]});
const sample={statementAmount:7500.12,contractorPayout:4200.11,contractorFee:350.02,currency:'GBP',periodStart:'2026-09-14',daily:[{date:'2026-09-14',amount:200.11}]};
test('parses complete JSON for detailed delivery statement without recomputing figures',()=>{
 assert.deepEqual(parseStatementResponse(envelop(JSON.stringify(sample))),sample);
});
test('accepts complete fenced JSON, neutral leading text and trailing comma only',()=>{
 const raw='```json\n'+JSON.stringify(sample)+'\n```';
 assert.deepEqual(parseStatementResponse(envelop(raw)),sample);
 const withText='Result follows:\n{"statementAmount":100.23,"contractorPayout":94.17,"charges":[] , }\nEnd';
 assert.deepEqual(parseStatementResponse(envelop(withText)),{statementAmount:100.23,contractorPayout:94.17,charges:[]});
});
test('does not corrupt a quoted string containing a comma before a brace',()=>{
 const raw='{"statementAmount":100,"contractorPayout":94,"notes":"literal , } text","charges":[],}';
 assert.equal(parseStatementResponse(envelop(raw)).notes,'literal , } text');
});
test('rejects truncated or empty output and does not treat nested daily/charge objects as the statement',()=>{
 assert.throws(()=>parseStatementResponse(envelop('{"contractorPayout":94', 'length')),{kind:'length'});
 assert.throws(()=>parseStatementResponse(envelop('')),{kind:'empty'});
 assert.throws(()=>parseStatementResponse(envelop('{"statementAmount":10,"daily":[{"date":"2026-09-14","amount":10}]')),{kind:'json'});
 assert.throws(()=>parseStatementResponse(envelop('{"foo":"bar"}')),{kind:'json'});
 assert.throws(()=>parseStatementResponse(envelop('[{"contractorPayout":20}]')),{kind:'json'});
});
test('a truncated full extraction retries once with a confirmed summary only',async()=>{
 const calls=[];const primary=async()=>{calls.push('full');return parseStatementResponse(envelop('{"statementAmount":10','length'));};
 const summary=async()=>{calls.push('summary');return parseStatementResponse(envelop('{"statementAmount":100,"contractorPayout":94,"daily":[]}'));};
 const reserve=async()=>{calls.push('reserved');};
 assert.deepEqual(await readWithSummaryFallback(primary,summary,reserve),{data:{statementAmount:100,contractorPayout:94,daily:[]},summaryOnly:true});
 assert.deepEqual(calls,['full','reserved','summary']);
});
test('provider HTTP failures are never retried and do not reserve extra budget',async()=>{
 let retries=0;
 const denial=new Error('DS-402');
 await assert.rejects(readWithSummaryFallback(async()=>{throw denial;},async()=>{retries++;},async()=>{retries++;}),denial);
 assert.equal(retries,0);
});
test('when shared budget denies retry, no second paid call is made',async()=>{
 let retries=0;
 const limit=new Error('Daily global usage exhausted');
 await assert.rejects(readWithSummaryFallback(async()=>{throw new StatementResponseError('empty');},async()=>{retries++;},async()=>{throw limit;}),limit);
 assert.equal(retries,0);
});
test('never accepts a partial response even when it contains valid nested objects',()=>{
 assert.throws(()=>parseStatementResponse(envelop('{"statementAmount": 100, "daily": [{"date": "2026-09-14", "amount": 8}]')),{kind:'json'});
});