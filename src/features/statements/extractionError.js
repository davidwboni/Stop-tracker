// Fixed public text only: never render arbitrary provider errors, tokens or
// document contents in the client UI. Firebase error codes are whitelisted.
const tips={
  'DS-LENGTH':'The AI response was cut off before it finished the statement (DS-LENGTH). Try the original PDF, or a tighter crop of the pay table.',
  'DS-PARSE':'The provider returned incomplete or invalid JSON (DS-PARSE). Try the original PDF or a clearer crop.',
  'DS-EMPTY':'The provider returned no statement details (DS-EMPTY). Try a sharper, closer image.',
  'DS-FILTER':'The AI provider did not return this document (DS-FILTER). Enter totals manually.',
  'DS-400':'The provider rejected the image request (DS-400). Try a JPG or original PDF.',
  'DS-401':'The AI provider credentials need attention (DS-401). Report this code.',
  'DS-402':'The AI provider has a billing or credit issue (DS-402). Report this code.',
  'DS-403':'The AI provider restricted access (DS-403). Report this code.',
  'DS-404':'The AI provider model could not be found (DS-404). Report this code.',
  'DS-413':'The file is too large for the AI provider (DS-413). Try a smaller image.',
  'DS-422':'The AI provider rejected the request (DS-422). Report this code.',
  'DS-429':'The AI provider is temporarily rate limiting requests (DS-429). Try later.',
  'DS-5XX':'The AI provider is temporarily unavailable (DS-5XX). Try later.',
  'DS-TIMEOUT':'Statement reading timed out (DS-TIMEOUT). Try a smaller image.',
  'DS-NETWORK':'The server could not connect to the provider (DS-NETWORK). Retry later.'
};
export function describeStatementExtractionError(error){
  const code=String(error?.code||'');
  const knownCode=/^functions\/[a-z-]{1,35}$/.test(code)?code:'';
  const serverText=String(error?.message||'').slice(0,400);
  const providerCode=(serverText.match(/\bDS-(?:LENGTH|PARSE|EMPTY|FILTER|400|401|402|403|404|413|422|429|5XX|TIMEOUT|NETWORK)\b/)||[])[0];
  let message=providerCode?tips[providerCode]:null;
  if(!message&&knownCode==='functions/failed-precondition')
    message=/No usable statement totals were found\./.test(serverText)
      ? 'The image did not contain a clearly readable payout total. Use the original PDF or crop around the pay summary.'
      : 'The provider could not complete this statement check. Try the original PDF or a close-up crop of the pay table.';
  if(!message&&knownCode==='functions/resource-exhausted')
    message='The daily scan limit may have been reached. Try again later or enter the totals manually.';
  if(!message&&knownCode==='functions/unauthenticated')
    message='Your sign-in session expired. Sign in again to scan your statement.';
  if(!message&&knownCode==='functions/invalid-argument')
    message='The selected file could not be accepted. Choose a PDF or a JPG/PNG image under 12 MB.';
  if(!message&&knownCode)message='Could not read this statement. You can retry or enter the totals manually.';
  if(!message)message=/^(Choose|This PDF|This browser|Could not prepare|No readable)/.test(serverText)
    ? serverText
    : 'Could not prepare or read this statement. Try again, or enter the totals manually.';
  return message+(knownCode?' Support code: '+knownCode+'.':'')+' Your file is still selected.';
}
