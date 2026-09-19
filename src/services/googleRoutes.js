import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Paid road-network optimisation runs in Firebase Functions so the Google
// Routes credential and Pro entitlement check never live in the browser.
export function isGoogleRoutesConfigured() {
  return true;
}

export async function optimizeRouteGoogle(addresses, signal) {
  if (!Array.isArray(addresses) || addresses.length < 2 || addresses.length > 25) {
    return null;
  }

  if (signal?.aborted) return null;

  const sanitized = addresses.map((item) => ({
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
  }));

  try {
    const callable = httpsCallable(functions, "optimizeRoutePro");
    const result = await callable({ addresses: sanitized });

    if (signal?.aborted) return null;

    const data = result?.data;
    if (!data) return null;

    const intermediates = addresses.slice(1, -1);
    const order =
      data.optimizedIntermediateWaypointIndex ||
      intermediates.map((_, index) => index);

    const orderedIntermediates = order
      .map((index) => intermediates[index])
      .filter(Boolean);

    return {
      route: [addresses[0], ...orderedIntermediates, addresses[addresses.length - 1]],
      totalDistanceKm: Number(data.totalDistanceKm || 0),
      totalDurationMin: Number(data.totalDurationMin || 0),
      source: "google",
    };
  } catch (error) {
    const code = String(error?.code || "");
    if (!code.includes("permission-denied")) {
      console.error("Server route optimisation failed:", error);
    }
    return null;
  }
}
