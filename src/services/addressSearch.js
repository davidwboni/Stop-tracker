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
