// Only safe, fixed error categories may cross the Firebase callable boundary.
// Never include provider response bodies, API credentials or uploaded document data.
const PROVIDER_STATUS = Object.freeze({
  400: { code:'failed-precondition', message:'The AI provider rejected the image request (DS-400). Please report this code; your file is still selected.' },
  401: { code:'failed-precondition', message:'Statement AI provider authentication needs attention (DS-401). Please report this code.' },
  402: { code:'failed-precondition', message:'Statement AI billing or credit is unavailable (DS-402). Please report this code.' },
  403: { code:'failed-precondition', message:'Statement AI provider access is restricted (DS-403). Please report this code.' },
  404: { code:'failed-precondition', message:'The statement AI model is unavailable (DS-404). Please report this code.' },
  413: { code:'resource-exhausted', message:'The AI provider rejected the image size (DS-413). Try a clearer, smaller image.' },
  422: { code:'failed-precondition', message:'The AI provider could not accept this request (DS-422). Please report this code.' },
  429: { code:'resource-exhausted', message:'The AI provider is rate limiting requests (DS-429). Try again later.' }
});
function classifyProviderStatus(status) {
  if(Object.hasOwn(PROVIDER_STATUS,status)) return PROVIDER_STATUS[status];
  if(status>=500 && status<=599) return {code:'unavailable',message:'The AI provider is temporarily unavailable (DS-5XX). Try again later.'};
  return {code:'unavailable',message:'The statement AI provider could not process this request (DS-OTHER). Try again later.'};
}
function classifyProviderException(error) {
  if(['TimeoutError','AbortError'].includes(error?.name))
    return {code:'deadline-exceeded',message:'Statement AI timed out (DS-TIMEOUT). Try a smaller image or retry.'};
  if(error?.message==='provider-json' || error?.message==='provider-response')
    return {code:'internal',message:'The AI provider returned an unreadable response (DS-PARSE). Try again or report this code.'};
  return {code:'unavailable',message:'Statement AI could not connect to the provider (DS-NETWORK). Please retry.'};
}
module.exports={classifyProviderStatus,classifyProviderException};
