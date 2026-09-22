import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { functions, db } from "./firebase";

export const startProCheckout = async (plan) => {
  const call = httpsCallable(functions, "createProCheckout");
  const { data } = await call({ plan, origin: window.location.origin });
  if (!data?.url) throw new Error("Stripe Checkout did not return a URL.");
  window.location.assign(data.url);
};

export const openBillingPortal = async () => {
  const call = httpsCallable(functions, "createBillingPortal");
  const { data } = await call({ origin: window.location.origin });
  if (!data?.url) throw new Error("Stripe Billing Portal did not return a URL.");
  window.location.assign(data.url);
};

export const subscribeToEntitlement = (uid, callback) => {
  if (!uid) return () => {};
  return onSnapshot(doc(db, "entitlements", uid), (snap) => {
    const data = snap.exists() ? snap.data() : {};
    callback({ ...data, isPro: data.plan === "pro" && ["active", "trialing"].includes(data.subscriptionStatus) });
  });
};
