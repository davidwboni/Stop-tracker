const {test}=require('node:test');
const assert=require('node:assert/strict');
const {classifyProviderStatus,classifyProviderException}=require('./statementProviderErrors');
test('DeepSeek HTTP failures have safe actionable codes without leaking raw responses',()=>{
 for(const [status,code,publicCode] of [
   [400,'failed-precondition','DS-400'],[401,'failed-precondition','DS-401'],
   [402,'failed-precondition','DS-402'],[403,'failed-precondition','DS-403'],
   [404,'failed-precondition','DS-404'],[413,'resource-exhausted','DS-413'],
   [422,'failed-precondition','DS-422'],[429,'resource-exhausted','DS-429'],
   [500,'unavailable','DS-5XX'],[503,'unavailable','DS-5XX']
 ]){
   const e=classifyProviderStatus(status);
   assert.equal(e.code,code);
   assert.ok(e.message.includes(publicCode));
   assert.ok(!e.message.includes('sk-'));
 }
});
test('request timeouts, invalid JSON, and transport failures are categorised without provider bodies',()=>{
 assert.equal(classifyProviderException({name:'TimeoutError'}).code,'deadline-exceeded');
 assert.match(classifyProviderException({message:'provider-json'}).message,/DS-PARSE/);
 assert.equal(classifyProviderException({message:'secret provider raw content'}).code,'unavailable');
});
