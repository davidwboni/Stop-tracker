/**
 * Enhanced sync utilities for more reliable Firebase data synchronization
 */

// Check if the browser/device is online
export const isOnline = () => {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
};

// Save data to localStorage with a timestamp
export const saveToLocalStorage = (key, data) => {
  try {
    const item = {
      data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (err) {
    console.error(`Error saving to localStorage: ${key}`, err);
    return false;
  }
};

// Get data from localStorage with validation
export const getFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    return parsed.data;
  } catch (err) {
    console.error(`Error retrieving from localStorage: ${key}`, err);
    return null;
  }
};

// Force refresh data from the server
export const forceRefreshFromServer = async (db, path, userId) => {
  try {
    // Clear any cached data for this collection
    const docRef = doc(db, path);
    
    // Force a server read
    const docSnap = await getDoc(docRef, { source: 'server' });
    
    // Update localStorage with the latest data
    if (docSnap.exists()) {
      saveToLocalStorage(`${userId}-${path.split('/').pop()}`, docSnap.data());
      return { success: true, data: docSnap.data() };
    }
    
    return { success: false, error: 'Document does not exist' };
  } catch (err) {
    console.error('Error forcing refresh from server:', err);
    return { success: false, error: err.message };
  }
};

// Queue a transaction for later processing
export const queueTransaction = (userId, transaction) => {
  try {
    const queueKey = `${userId}-pendingTransactions`;
    let transactions = [];
    
    const existing = localStorage.getItem(queueKey);
    if (existing) {
      transactions = JSON.parse(existing);
    }
    
    // Add new transaction
    transactions.push({
      ...transaction,
      queuedAt: new Date().toISOString()
    });
    
    // Save back to storage
    localStorage.setItem(queueKey, JSON.stringify(transactions));
    return true;
  } catch (err) {
    console.error('Error queuing transaction:', err);
    return false;
  }
};

// Clear a specific transaction from the queue
export const clearTransaction = (userId, transactionId) => {
  try {
    const queueKey = `${userId}-pendingTransactions`;
    const existing = localStorage.getItem(queueKey);
    
    if (!existing) return true;
    
    const transactions = JSON.parse(existing);
    const filtered = transactions.filter(tx => tx.id !== transactionId);
    
    if (filtered.length === 0) {
      localStorage.removeItem(queueKey);
    } else {
      localStorage.setItem(queueKey, JSON.stringify(filtered));
    }
    
    return true;
  } catch (err) {
    console.error('Error clearing transaction:', err);
    return false;
  }
};

// Generate a unique ID for transactions
export const generateTransactionId = () => {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Exponential backoff for retries
export const calculateBackoff = (retryCount, baseDelay = 1000, maxDelay = 30000) => {
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  // Add some randomness to prevent thundering herd problem
  return delay + (Math.random() * 1000);
};

// Get pending transaction count
export const getPendingTransactionCount = (userId) => {
  try {
    const queueKey = `${userId}-pendingTransactions`;
    const existing = localStorage.getItem(queueKey);
    
    if (!existing) return 0;
    
    const transactions = JSON.parse(existing);
    return transactions.length;
  } catch (err) {
    console.error('Error getting pending transaction count:', err);
    return 0;
  }
};

export default {
  isOnline,
  saveToLocalStorage,
  getFromLocalStorage,
  queueTransaction,
  clearTransaction,
  generateTransactionId,
  calculateBackoff,
  getPendingTransactionCount
};