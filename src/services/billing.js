import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function startProCheckout() {
  const callable = httpsCallable(functions, "createProCheckoutSession");
  const result = await callable({});
  const data = result?.data || {};

  if (data.alreadyPro) {
    return { alreadyPro: true };
  }

  if (!data.url || !/^https:\/\//.test(data.url)) {
    throw new Error("Checkout did not return a valid payment link.");
  }

  window.location.assign(data.url);
  return { redirected: true };
}

export async function openBillingPortal() {
  const callable = httpsCallable(functions, "createBillingPortalSession");
  const result = await callable({});
  const url = result?.data?.url;
  if (!url || !/^https:\/\//.test(url)) {
    throw new Error("Billing portal did not return a valid link.");
  }
  window.location.assign(url);
}
