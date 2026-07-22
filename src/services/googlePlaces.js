// Google Places API (New) address search.
//
// Cost model matters here: Autocomplete is billed per *session*, so we generate
// a session token, reuse it across keystrokes, and only spend a Place Details
// call when the user actually picks a suggestion (which closes the session).
// Predictions therefore carry a placeId and no coordinates — RoutePlanner
// resolves them on select, exactly like it already does for postcodes.
//
// The key is a browser key (public by design) restricted by HTTP referrer +
// API in the Google Cloud console. If it's absent we return null so callers
// transparently fall back to the free Nominatim search.

// Same key as googleRoutes.js — one Maps key, restricted by referrer + API.
const KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

export function isGooglePlacesEnabled() {
  return !!KEY;
}

// One session token spans a user's typing burst; cleared once they pick a place.
let sessionToken = null;
function getSessionToken() {
  if (!sessionToken) {
    sessionToken = `st-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionToken;
}
function endSession() {
  sessionToken = null;
}

// Small in-memory cache so re-typing / backspacing doesn't re-bill a query.
const cache = new Map();
const CACHE_MAX = 50;
function cacheGet(k) {
  return cache.get(k);
}
function cacheSet(k, v) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(k, v);
}

/**
 * Autocomplete predictions for a query. Returns [] when disabled or on error so
 * the caller can fall back. Each item: { address, placeId, needsResolve: true }.
 */
export async function googleAutocomplete(query, biasCenter, signal) {
  if (!KEY || !query || query.trim().length < 3) return [];

  const key = `${query.trim().toLowerCase()}|${biasCenter ? `${biasCenter.latitude.toFixed(2)},${biasCenter.longitude.toFixed(2)}` : ''}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const body = {
    input: query,
    sessionToken: getSessionToken(),
    includedRegionCodes: ['gb'],
  };
  if (biasCenter) {
    body.locationBias = {
      circle: {
        center: { latitude: biasCenter.latitude, longitude: biasCenter.longitude },
        radius: 30000,
      },
    };
  }

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Places autocomplete failed (${res.status})`);
  }

  const data = await res.json();
  const results = (data.suggestions || [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .slice(0, 5)
    .map((p) => ({
      address: p.text?.text || p.structuredFormat?.mainText?.text || '',
      postcode: 'N/A',
      placeId: p.placeId,
      needsResolve: true,
      type: 'place',
    }));

  cacheSet(key, results);
  return results;
}

/**
 * Resolve a prediction into real coordinates. One billed Details call, made
 * only when the user commits to a suggestion. Closes the autocomplete session.
 */
export async function resolvePlace(placeId, signal) {
  if (!KEY) throw new Error('Google Places is not configured');

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'location,formattedAddress,addressComponents',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Place details failed (${res.status})`);
  }

  const data = await res.json();
  endSession();

  const postcodeComponent = (data.addressComponents || []).find((c) =>
    (c.types || []).includes('postal_code')
  );

  return {
    address: data.formattedAddress || '',
    postcode: postcodeComponent?.longText || postcodeComponent?.shortText || 'N/A',
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
  };
}
