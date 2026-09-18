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
