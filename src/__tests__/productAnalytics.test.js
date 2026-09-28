import {beforeEach, afterEach, it, expect, vi} from 'vitest';
import {trackProductEvent} from '../services/productAnalytics';

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('REACT_APP_POSTHOG_PROJECT_TOKEN', 'test-token');
  vi.stubEnv('REACT_APP_POSTHOG_HOST', 'https://eu.i.posthog.com');
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  vi.stubGlobal('crypto', {randomUUID: () => 'random-device-id'});
});
afterEach(() => { localStorage.setItem('analytics-consent','denied'); window.dispatchEvent(new Event('analytics-consent-changed')); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('does not contact analytics or create an identifier without opt-in', () => {
  trackProductEvent('daily_entry_saved');
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.getItem('analytics-device-id')).toBeNull();
});
it('sends only allowlisted event properties without credentials or a referring URL', () => {
  localStorage.setItem('analytics-consent','granted');
  trackProductEvent('daily_entry_saved', {mode:'new', source:'home', earnings:456, name:'Private', address:'Secret', filename:'statement.pdf'});
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://eu.i.posthog.com/i/v0/e/');
  expect(options).toMatchObject({credentials:'omit',referrerPolicy:'no-referrer'});
  expect(JSON.parse(options.body)).toMatchObject({distinct_id:'random-device-id', properties:{mode:'new',source:'home',$process_person_profile:false,$geoip_disable:true}});
  expect(options.body).not.toMatch(/456|Private|Secret|statement.pdf/);
  trackProductEvent('private-event');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('withdrawal aborts pending requests and removes the device identifier', () => {
  localStorage.setItem('analytics-consent','granted');
  trackProductEvent('home_viewed');
  const signal = fetch.mock.calls[0][1].signal;
  localStorage.setItem('analytics-consent','denied');
  window.dispatchEvent(new Event('analytics-consent-changed'));
  expect(signal.aborted).toBe(true);
  expect(localStorage.getItem('analytics-device-id')).toBeNull();
  trackProductEvent('home_viewed');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('does not send to an unapproved analytics host', () => {
  localStorage.setItem('analytics-consent','granted');
  vi.stubEnv('REACT_APP_POSTHOG_HOST','https://unexpected.example');
  trackProductEvent('home_viewed');
  expect(fetch).not.toHaveBeenCalled();
});
