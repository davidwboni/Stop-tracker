// Explicit opt-in events sent directly to PostHog. No auto-instrumentation SDK.
// No autocapture, replay, financial values or user content is collected here.
const allowed = new Set(['landing_viewed','signup_started','signup_completed','walkthrough_started','walkthrough_completed','walkthrough_skipped','documents_opened','document_viewed','insights_viewed','route_started','route_stop_added','route_optimise_clicked','route_optimised','pro_viewed','checkout_started','checkout_opened','subscription_completed','comparison_detail_opened','reconciliation_started','reconciliation_completed','statement_review_opened','statement_field_corrected','statement_review_validation_failed','check_pay_opened','check_pay_period_changed','statement_manual_started','statement_ai_started','statement_ai_completed','statement_ai_failed','statement_draft_abandoned','statement_reviewed','statement_compared','discrepancy_found','pay_setup_started', 'pay_model_selected', 'pay_setup_validation_failed', 'pay_setup_completed', 'home_viewed', 'quick_entry_opened', 'quick_entry_dismissed', 'quick_entry_validation_failed', 'daily_entry_saved', 'home_calculation_expanded', 'expense_opened', 'expense_overview_viewed', 'expense_source_filtered', 'expense_record_opened', 'expense_manual_saved', 'expense_ai_started', 'expense_ai_completed', 'expense_ai_saved', 'expense_ai_failed', 'expense_save_failed', 'expense_dismissed', 'records_opened', 'money_overview_viewed', 'money_period_changed', 'money_breakdown_opened', 'money_comparison_opened']);
export function trackProductEvent(event, properties = {}) {
  if (!allowed.has(event)) return;
  try { if (window.localStorage.getItem('analytics-consent') !== 'granted') return; } catch (_) { return; }
  const safe = {};
  if (['all', 'contractor_charge', 'my_expense'].includes(properties.filter)) safe.filter = properties.filter;
  if (['new', 'edit'].includes(properties.mode)) safe.mode = properties.mode;
  if (['home', 'money'].includes(properties.source)) safe.source = properties.source;
  if (['empty', 'saved', 'error'].includes(properties.state)) safe.state = properties.state;
  sendProductEvent(event,safe);
}

const pending=new Set();
function sendProductEvent(event,safe={}) {
 try {
  if(!allowed.has(event)||localStorage.getItem('analytics-consent')!=='granted')return;
  const token=process.env.REACT_APP_POSTHOG_PROJECT_TOKEN;
  const host=process.env.REACT_APP_POSTHOG_HOST;
  if(!token||!['https://eu.i.posthog.com','https://us.i.posthog.com'].includes(host))return;
  let id=localStorage.getItem('analytics-device-id');if(!id){id=crypto.randomUUID();localStorage.setItem('analytics-device-id',id);}
  const controller=new AbortController();pending.add(controller);
  fetch(host+'/i/v0/e/',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:token,event,distinct_id:id,properties:{...safe,$process_person_profile:false,$geoip_disable:true},timestamp:new Date().toISOString()})}).catch(()=>{}).finally(()=>pending.delete(controller));
 } catch(_){/* Analytics never interrupts work. */}
}
if(typeof window!=='undefined')window.addEventListener('analytics-consent-changed',()=>{try{if(localStorage.getItem('analytics-consent')!=='granted'){pending.forEach(c=>c.abort());pending.clear();localStorage.removeItem('analytics-device-id');}}catch(_){pending.forEach(c=>c.abort());pending.clear();}});
