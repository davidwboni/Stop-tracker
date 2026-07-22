// Google Routes API integration for real road-network route optimization.
//
// Falls back gracefully (returns null) if no API key is configured, so the
// caller can fall back to the existing haversine nearest-neighbor algorithm.
// Requires REACT_APP_GOOGLE_MAPS_API_KEY in .env.local — see
// GOOGLE_MAPS_SETUP.md for how to create and restrict the key.

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export function isGoogleRoutesConfigured() {
  return Boolean(process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
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
 *   null if not configured or the API call fails — caller should fall back.
 */
export async function optimizeRouteGoogle(addresses, signal) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (!Array.isArray(addresses) || addresses.length < 2) return null;

  // Google's Routes API caps intermediates at 25 (23 waypoints + origin +
  // destination for computeRoutes). Bail out gracefully above that so the
  // caller falls back to the local algorithm rather than erroring.
  if (addresses.length > 25) return null;

  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const intermediates = addresses.slice(1, -1);

  const body = {
    origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
    destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
    intermediates: intermediates.map(a => ({
      location: { latLng: { latitude: a.latitude, longitude: a.longitude } },
    })),
    travelMode: 'DRIVE',
    optimizeWaypointOrder: true,
    routingPreference: 'TRAFFIC_AWARE',
  };

  let response;
  try {
    response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field mask is required by the Routes API — keep it minimal to
        // control cost/latency; add fields here if you need more detail.
        'X-Goog-FieldMask': [
          'routes.optimizedIntermediateWaypointIndex',
          'routes.distanceMeters',
          'routes.duration',
        ].join(','),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Google Routes API request failed:', err);
    return null;
  }

  if (!response.ok) {
    console.error('Google Routes API error:', response.status, await response.text().catch(() => ''));
    return null;
  }

  const data = await response.json();
  const result = data.routes?.[0];
  if (!result) return null;

  const order = result.optimizedIntermediateWaypointIndex ?? intermediates.map((_, i) => i);
  const orderedIntermediates = order.map(i => intermediates[i]);
  const route = [origin, ...orderedIntermediates, destination];

  // duration comes back as e.g. "1234s"
  const durationSeconds = parseInt(String(result.duration || '0').replace('s', ''), 10) || 0;

  return {
    route,
    totalDistanceKm: (result.distanceMeters || 0) / 1000,
    totalDurationMin: Math.ceil(durationSeconds / 60),
  };
}
