import { getApp } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent as firebaseLogEvent,
  setUserProperties as firebaseSetUserProperties,
} from "firebase/analytics";

// Product analytics for validation.
//
// Privacy rule: only send product-behaviour metadata (feature names, booleans,
// counts and pay-model IDs). Never send earnings, rates, invoice contents,
// notes, addresses, names, email addresses or free-form AI prompts.
let analyticsPromise = null;
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

const getAnalyticsClient = async () => {
  if (typeof window === "undefined") return null;

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
  getAnalyticsClient()
    .then((analytics) => {
      if (!analytics) return;
      firebaseLogEvent(analytics, name, cleanParams(params));
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
