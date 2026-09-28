import React, {useState} from 'react';
import {trackProductEvent} from '../services/productAnalytics';

export default function AnalyticsConsent() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem('analytics-consent'); } catch (_) { return false; }
  });
  if (!visible) return null;
  function choose(allow) {
    try {
      localStorage.setItem('analytics-consent', allow ? 'granted' : 'denied');
      window.dispatchEvent(new Event('analytics-consent-changed'));
      if (allow) trackProductEvent('landing_viewed');
      setVisible(false);
    } catch (_) { setVisible(false); }
  }
  return <aside className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
    <p>Help improve Stop Tracker with optional usage analytics? We use PostHog for feature events, without financial values, addresses or document contents. No session recording. Change this in Profile.</p>
    <div className="mt-3 flex gap-3">
      <button className="min-h-[44px] rounded-lg border border-border px-4 text-foreground" onClick={() => choose(false)}>No thanks</button>
      <button className="min-h-[44px] rounded-lg border border-border px-4 text-foreground" onClick={() => choose(true)}>Allow analytics</button>
    </div>
  </aside>;
}
