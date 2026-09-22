// Google Routes API integration for real road-network route optimization.
//
// Falls back gracefully (returns null) if no API key is configured, so the
// caller can fall back to the existing haversine nearest-neighbor algorithm.
// The browser key must be restricted by allowed web origins and API in Google Cloud.
// Before paid production optimisation, move Routes requests behind an authenticated
// server endpoint so quotas and billing cannot be abused from a copied browser key.

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export function isGoogleRoutesConfigured() {
  // Paid Routes calls are intentionally disabled in the browser. Address/Map
  // features may still use a tightly restricted browser Maps key.
  return false;
}

/**
 * Optimize the order of stops using Google's Routes API (real road
 * distances/times, not straight-line estimates).
 *
 * @param {Array<{latitude:number, longitude:number}>} addresses - first
 *   entry is treated as the fixed start point, same convention as the
 *   existing nearest-neighbor optimizer.
 * @param {AbortSignal} [signal]
 * @returns {Promise<{route: Array, totalDistanceKm: number, totalDurationMin: number} | null>}
 *   null if not configured or the API call fails, caller should fall back.
 */
export async function optimizeRouteGoogle() {
  // Production safety: never expose a billable Routes credential to client code.
  // RoutePlanner falls back to its local optimiser until the authenticated
  // server-side routing service is configured.
  return null;
}
