const RECENCY_HALF_LIFE_DAYS = 30;
const MAX_ENTRIES = 100;

export function computeScore(entry, now) {
  const daysSinceLastUse = (now - new Date(entry.lastUsedAt)) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.pow(0.5, daysSinceLastUse / RECENCY_HALF_LIFE_DAYS);
  return entry.useCount * recencyWeight;
}

export function recordUse(memoryList, address, now) {
  const existingIndex = memoryList.findIndex(entry => entry.address === address.address);
  let newList;

  if (existingIndex === -1) {
    newList = [
      ...memoryList,
      {
        address: address.address,
        postcode: address.postcode,
        latitude: address.latitude,
        longitude: address.longitude,
        useCount: 1,
        lastUsedAt: now.toISOString()
      }
    ];
  } else {
    newList = memoryList.map((entry, index) =>
      index === existingIndex
        ? { ...entry, useCount: entry.useCount + 1, lastUsedAt: now.toISOString() }
        : entry
    );
  }

  if (newList.length > MAX_ENTRIES) {
    newList = [...newList]
      .sort((a, b) => computeScore(b, now) - computeScore(a, now))
      .slice(0, MAX_ENTRIES);
  }

  return newList;
}

export function getFrequentAddresses(memoryList, now, limit) {
  return [...memoryList]
    .sort((a, b) => computeScore(b, now) - computeScore(a, now))
    .slice(0, limit)
    .map(entry => ({
      address: entry.address,
      postcode: entry.postcode,
      latitude: entry.latitude,
      longitude: entry.longitude,
      isFrequentSuggestion: true
    }));
}
