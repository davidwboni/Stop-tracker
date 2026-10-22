// Statement extraction needs a short, schema-shaped answer, not an extended
// chain of thought. DeepSeek Flash enables thinking by default; disable it
// explicitly so reasoning does not exhaust the output budget before the JSON.
// Never log, persist or return the image blocks or provider credentials.
function buildStatementDeepSeekRequest({prompt,outputLimit,instructions,imageBlocks}){
  if(!Number.isSafeInteger(outputLimit)||outputLimit<100)throw new TypeError('Invalid output token limit');
  return {
    model:'deepseek-flash',
    thinking:{type:'disabled'},
    temperature:0,
    max_tokens:outputLimit,
    response_format:{type:'json_object'},
    messages:[
      {role:'system',content:prompt},
      {role:'user',content:[{type:'text',text:instructions},...imageBlocks]}
    ]
  };
}
module.exports={buildStatementDeepSeekRequest};
