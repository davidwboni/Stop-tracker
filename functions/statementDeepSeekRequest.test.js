const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildStatementDeepSeekRequest}=require('./statementDeepSeekRequest');
const image={type:'image_url',image_url:{url:'data:image/jpeg;base64,VEVTVA==',detail:'original'}};
test('both detailed and summary requests explicitly disable default DeepSeek reasoning',()=>{
 for(const maxTokens of [6000,1800]){
  const body=buildStatementDeepSeekRequest({prompt:'Reply in JSON',outputLimit:maxTokens,instructions:'Read only visible totals',imageBlocks:[image]});
  assert.deepEqual(body.thinking,{type:'disabled'});
  assert.equal(body.model,'deepseek-flash');
  assert.equal(body.max_tokens,maxTokens);
  assert.deepEqual(body.response_format,{type:'json_object'});
  assert.equal(body.messages[0].role,'system');
  assert.deepEqual(body.messages[1].content[1],image);
  assert.equal(body.messages[1].content[0].type,'text');
  assert.equal(body.messages.length,2);
  // Image inputs may only be sent in the user message.
  assert.equal(typeof body.messages[0].content,'string');
 }
});
test('full and fallback requests do not add extra prompt or hidden image fields',()=>{
 const body=buildStatementDeepSeekRequest({prompt:'Return JSON',outputLimit:1800,instructions:'Summary only',imageBlocks:[image]});
 assert.deepEqual(Object.keys(body).sort(),['max_tokens','messages','model','response_format','temperature','thinking'].sort());
 assert.equal(body.messages[1].content.length,2);
 assert.throws(()=>buildStatementDeepSeekRequest({prompt:'JSON',outputLimit:0,instructions:'',imageBlocks:[]}),TypeError);
});