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
