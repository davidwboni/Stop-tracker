// Explicit allowlist only. Connect a consent-enabled PostHog instance to window.posthog.
// No autocapture, replay, financial values or user content is collected here.
const allowed = new Set(['home_viewed', 'quick_entry_opened', 'quick_entry_dismissed', 'quick_entry_validation_failed', 'daily_entry_saved', 'home_calculation_expanded', 'expense_opened', 'expense_overview_viewed', 'expense_source_filtered', 'expense_record_opened', 'expense_manual_saved', 'records_opened', 'money_overview_viewed']);
export function trackProductEvent(event, properties = {}) {
  if (!allowed.has(event)) return;
  try { if (window.localStorage.getItem('analytics-consent') !== 'granted') return; } catch (_) { return; }
  const safe = {};
  if (['all', 'contractor_charge', 'my_expense'].includes(properties.filter)) safe.filter = properties.filter;
  if (['new', 'edit'].includes(properties.mode)) safe.mode = properties.mode;
  if (['home', 'money'].includes(properties.source)) safe.source = properties.source;
  if (['empty', 'saved', 'error'].includes(properties.state)) safe.state = properties.state;
  try { window.posthog?.capture(event, safe); } catch (_) { /* Analytics must never interrupt work. */ }
}
