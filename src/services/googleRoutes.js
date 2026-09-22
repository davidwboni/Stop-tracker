import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Route optimisation is intentionally server-side. The browser calls an
// authenticated Firebase callable; Google Cloud credentials never ship in the
// web bundle.
export function isGoogleRoutesConfigured() {
  return true;
}

export async function optimizeRouteGoogle(addresses) {
  if (!Array.isArray(addresses) || addresses.length < 2) return null;

  const payload = addresses.map((a, index) => ({
    id: a.id ?? index,
    address: a.address || "",
    postcode: a.postcode || "",
    latitude: Number(a.latitude),
    longitude: Number(a.longitude),
    type: a.type || "",
  }));

  const call = httpsCallable(functions, "optimizeDriverRoute");
  const { data } = await call({ addresses: payload });

  if (!data?.route || !Array.isArray(data.route)) return null;

  return {
    route: data.route,
    totalDistanceKm: Number(data.totalDistanceKm) || 0,
    totalDurationMin: Number(data.totalDurationMin) || 0,
    used: data.used,
    remaining: data.remaining,
    isPro: !!data.isPro,
    source: data.source || "google-route-optimization",
  };
}
