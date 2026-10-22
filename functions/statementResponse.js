// Strict parsing with narrowly scoped formatting tolerance. Never close incomplete
// braces or fabricate statement figures: truncated output must be re-extracted.
class StatementResponseError extends Error {
  constructor(kind) {
    super("provider-" + kind);
    this.name="StatementResponseError";
    this.kind=kind;
  }
}
function stripTrailingCommas(source) {
  let result="",quoted=false,escaped=false;
  for(let i=0;i<source.length;i++) {
    const c=source[i];
    if(quoted){
      result+=c;
      if(escaped)escaped=false;
      else if(c==="\\")escaped=true;
      else if(c==='"')quoted=false;
      continue;
    }
    if(c==='"'){quoted=true;result+=c;continue;}
    if(c===','){
      let j=i+1;
      while(/\s/.test(source[j]||"")&&j<source.length)j++;
      if(source[j]==='}'||source[j]===']')continue;
    }
    result+=c;
  }
  return result;
}
function findBalancedObject(text,start) {
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(escaped)escaped=false;
      else if(ch==="\\")escaped=true;
      else if(ch==='"')quoted=false;
    }else if(ch==='"'){quoted=true;}
    else if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return text.slice(start,i+1);
    }
  }
  return null;
}
function parseObject(source) {
  const value=JSON.parse(source);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error("Not a JSON object");
  return value;
}
function parseStatementResponse(payload) {
  const choice=payload?.choices?.[0];
  // DeepSeek documents that finish_reason=length can truncate otherwise valid JSON.
  if(choice?.finish_reason==='length')throw new StatementResponseError("length");
  const raw=choice?.message?.content;
  if(typeof raw!=='string'||!raw.trim())throw new StatementResponseError("empty");
  let text=raw.trim().replace(/^\uFEFF/,"");
  if(/^```(?:json)?\s*/i.test(text))text=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
  const candidates=[text];
  // Allow a JSON object surrounded by harmless prose without accepting any
  // partial object. Content and text are not persisted or logged.
  for(let i=0;i<text.length&&candidates.length<8;i++){
    if(text[i]!=='{')continue;
    const obj=findBalancedObject(text,i);
    if(obj&&!candidates.includes(obj))candidates.push(obj);
  }
  for(const sample of candidates) {
    try {return parseObject(sample);}catch(_){}
    try {return parseObject(stripTrailingCommas(sample));}catch(_){}
  }
  throw new StatementResponseError("json");
}
module.exports={parseStatementResponse,StatementResponseError};
