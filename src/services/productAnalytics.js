import { getApp } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent as firebaseLogEvent,
  setUserProperties as firebaseSetUserProperties,
  setAnalyticsCollectionEnabled,
} from "firebase/analytics";

// Product analytics for validation.
//
// Privacy rule: only send product-behaviour metadata (feature names, booleans,
// counts and pay-model IDs). Never send earnings, rates, invoice contents,
// notes, addresses, names, email addresses or free-form AI prompts.
let analyticsPromise = null;
let pendingEvents = [];
const CONSENT_KEY = "stoptracker_analytics_consent";
const warned = new Set();

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === "boolean") return [key, value ? 1 : 0];
        if (typeof value === "number") return [key, Number.isFinite(value) ? value : 0];
        return [key, String(value).slice(0, 100)];
      })
  );

export const getAnalyticsConsent = () => {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted") return true;
  if (value === "denied") return false;
  return null;
};

const getAnalyticsClient = async () => {
  if (typeof window === "undefined") return null;
  if (getAnalyticsConsent() !== true) return null;

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(getApp()) : null))
      .catch((error) => {
        if (process.env.NODE_ENV !== "production" && !warned.has("init")) {
          warned.add("init");
          console.info("[analytics] Firebase Analytics unavailable:", error?.message || error);
        }
        return null;
      });
  }

  return analyticsPromise;
};

export const trackEvent = (name, params = {}) => {
  const consent = getAnalyticsConsent();
  const clean = cleanParams(params);

  // Before the user chooses, hold only the already-sanitised event in memory.
  // Nothing is persisted or transmitted until consent is granted.
  if (consent === null) {
    pendingEvents.push({ name, params: clean });
    if (pendingEvents.length > 30) pendingEvents = pendingEvents.slice(-30);
    return;
  }

  if (consent === false) return;

  getAnalyticsClient()
    .then((analytics) => {
      if (!analytics) return;
      firebaseLogEvent(analytics, name, clean);
    })
    .catch(() => {
      // Analytics must never block or break the product experience.
    });
};

export const trackPageView = (path) => {
  trackEvent("page_view", {
    page_path: path,
    page_title: typeof document !== "undefined" ? document.title : "Stop Tracker",
  });
};

export const setAnalyticsUserProperties = (properties = {}) => {
  getAnalyticsClient()
    .then((analytics) => {
      if (!analytics) return;
      firebaseSetUserProperties(analytics, cleanParams(properties));
    })
    .catch(() => {
      // Best-effort only.
    });
};

export const setAnalyticsConsent = async (granted) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");

  if (!granted) {
    pendingEvents = [];
    try {
      const analytics = analyticsPromise ? await analyticsPromise : null;
      if (analytics) setAnalyticsCollectionEnabled(analytics, false);
    } catch (_) {}
    return;
  }

  analyticsPromise = null;
  const analytics = await getAnalyticsClient();
  if (analytics) {
    setAnalyticsCollectionEnabled(analytics, true);
    const queued = pendingEvents;
    pendingEvents = [];
    queued.forEach(({ name, params }) => firebaseLogEvent(analytics, name, params));
  }
};
