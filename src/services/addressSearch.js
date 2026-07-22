import { isGooglePlacesEnabled, googleAutocomplete } from './googlePlaces';

// UK postcode, full or partial, with or without a space:
// outward code (1-2 letters, 1 digit, optional letter/digit) optionally
// followed by inward code (1 digit + up to 2 letters).
const POSTCODE_LIKE_REGEX = /^[A-Za-z]{1,2}\d[A-Za-z\d]?(\s?\d[A-Za-z]{0,2})?$/;

export function isPostcodeLike(query) {
  if (!query) return false;
  return POSTCODE_LIKE_REGEX.test(query.trim());
}

export function computeBiasCenter(addresses) {
  if (!addresses || addresses.length === 0) return null;

  let weightedLatSum = 0;
  let weightedLonSum = 0;
  let weightSum = 0;

  addresses.forEach((addr, index) => {
    const weight = index + 1; // later (more recent) addresses weigh more
    weightedLatSum += addr.latitude * weight;
    weightedLonSum += addr.longitude * weight;
    weightSum += weight;
  });

  return {
    latitude: weightedLatSum / weightSum,
    longitude: weightedLonSum / weightSum
  };
}

export async function searchPostcodes(query, signal) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete?limit=10`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Postcode search failed');
  }

  const data = await response.json();
  return data.result || [];
}

export async function resolvePostcode(postcode, signal) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Postcode lookup failed');
  }

  const data = await response.json();

  return {
    postcode: data.result.postcode,
    latitude: data.result.latitude,
    longitude: data.result.longitude
  };
}

const BIAS_RADIUS_DEGREES = 0.15; // roughly a 15-20km soft-bias radius

function buildViewbox(center) {
  const minLon = center.longitude - BIAS_RADIUS_DEGREES;
  const minLat = center.latitude - BIAS_RADIUS_DEGREES;
  const maxLon = center.longitude + BIAS_RADIUS_DEGREES;
  const maxLat = center.latitude + BIAS_RADIUS_DEGREES;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

// Squared angular distance with longitude corrected for latitude — plenty
// accurate for ranking UK-scale results by nearness (no need for haversine).
function distanceSq(point, center) {
  const latDiff = point.latitude - center.latitude;
  const lonDiff =
    (point.longitude - center.longitude) *
    Math.cos((center.latitude * Math.PI) / 180);
  return latDiff * latDiff + lonDiff * lonDiff;
}

export async function searchAddresses(query, biasCenter, signal) {
  if (query.length < 3) {
    return [];
  }

  // Prefer Google Places when a key is configured — far better UK address
  // coverage than Nominatim. Falls through to Nominatim if it's not set up or
  // the call fails, so the planner keeps working with no key at all.
  if (isGooglePlacesEnabled()) {
    try {
      const google = await googleAutocomplete(query, biasCenter, signal);
      if (google.length > 0) return google;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('Google Places failed, falling back to Nominatim:', err);
    }
  }

  let url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&` +
    `countrycodes=gb&` +
    `format=json&` +
    `addressdetails=1&` +
    `limit=10`;

  if (biasCenter) {
    url += `&viewbox=${buildViewbox(biasCenter)}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal
  });

  if (!response.ok) {
    throw new Error('Address search failed');
  }

  const data = await response.json();

  const results = data.map(place => ({
    address: place.display_name,
    postcode: place.address?.postcode || 'N/A',
    latitude: parseFloat(place.lat),
    longitude: parseFloat(place.lon),
    type: place.type
  }));

  // Nominatim's viewbox is only a soft ranking hint and often still surfaces
  // distant matches first for common names ("High Street", "Cherry Tree").
  // When we know where the driver is working, hard-sort by actual nearness.
  if (biasCenter) {
    results.sort((a, b) => distanceSq(a, biasCenter) - distanceSq(b, biasCenter));
  }

  return results.slice(0, 5);
}
