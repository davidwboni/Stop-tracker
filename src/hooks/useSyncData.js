import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { syncData } from "../services/firebase";

/**
 * Custom hook for syncing data with Firestore and handling offline capabilities
 * @param {string} dataType - The type of data to sync ('logs', 'settings', etc.)
 * @param {Object} initialData - Optional initial data to use
 * @returns {Object} - Data, loading state, error state, and update function
 */
export const useSyncData = (dataType, initialData = null) => {
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('loading');
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);
  const pendingTransactionsRef = useRef([]);

  // Check if we have valid data type
  const isValidDataType = ['logs', 'settings', 'expenses'].includes(dataType);

  // Set mounted flag for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !isValidDataType) {
      if (isMountedRef.current) {
        setLoading(false);
        if (!isValidDataType) {
          setError(`Invalid data type: ${dataType}`);
        }
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    // Try to load from localStorage first for immediate UI display
    try {
      const cachedData = localStorage.getItem(`${user.uid}-${dataType}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (dataType === 'logs' && parsed.logs) {
          if (isMountedRef.current) setData(parsed.logs || []);
        } else {
          if (isMountedRef.current) setData(parsed || null);
        }
      }
    } catch (err) {
      console.warn("Error loading cached data:", err);
    }

    // Subscribe to real-time updates
    try {
      if (dataType === 'logs') {
        unsubscribeRef.current = syncData.subscribeToDeliveryLogs(user.uid, (newData, status) => {
          if (isMountedRef.current) {
            setData(newData);
            setSyncStatus(status || 'synced');
            setLoading(false);
          }
        });
      } else if (dataType === 'settings') {
        unsubscribeRef.current = syncData.subscribeToSettings(user.uid, (newData, status) => {
          if (isMountedRef.current) {
            setData(newData);
            setSyncStatus(status || 'synced');
            setLoading(false);
          }
        });
      } else if (dataType === 'expenses') {
        // Add other data types as needed
        unsubscribeRef.current = () => {};
        if (isMountedRef.current) setLoading(false);
      }
    } catch (err) {
      console.error(`Error setting up ${dataType} subscription:`, err);
      if (isMountedRef.current) {
        setError(`Failed to sync ${dataType}: ${err.message}`);
        setSyncStatus('error');
        setLoading(false);
      }
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, dataType, isValidDataType]);

  // Handle syncing pending transactions when online
  useEffect(() => {
    const processPendingTransactions = async () => {
      if (!user || !navigator.onLine) return;
      
      const pending = localStorage.getItem(`${user.uid}-pendingTransactions`);
      if (!pending) return;
      
      try {
        const transactions = JSON.parse(pending);
        if (transactions.length === 0) return;
        
        setSyncStatus('syncing');
        
        // Process transactions for this data type
        for (const tx of transactions) {
          if (tx.type === dataType) {
            if (tx.type === 'logs') {
              await syncData.saveDeliveryLogs(user.uid, tx.data);
            } else if (tx.type === 'settings') {
              await syncData.saveSettings(user.uid, tx.data);
            }
          }
        }
        
        // Remove processed transactions of this type
        const updatedTransactions = transactions.filter(tx => tx.type !== dataType);
        
        if (updatedTransactions.length === 0) {
          localStorage.removeItem(`${user.uid}-pendingTransactions`);
        } else {
          localStorage.setItem(`${user.uid}-pendingTransactions`, JSON.stringify(updatedTransactions));
        }
        
        pendingTransactionsRef.current = updatedTransactions;
        setSyncStatus('synced');
      } catch (err) {
        console.error('Error processing pending transactions:', err);
        setSyncStatus('error');
      }
    };
    
    const handleOnline = () => {
      processPendingTransactions();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Initial check for pending transactions
    if (navigator.onLine && user) {
      processPendingTransactions();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user, dataType]);

  /**
   * Update the data both in Firestore and local state with improved offline handling
   * @param {*} newData - The new data to save
   * @returns {Promise<boolean>} - Success status
   */
  const updateData = async (newData) => {
    if (!user) {
      if (isMountedRef.current) {
        setError("You must be logged in to update data");
      }
      return false;
    }

    try {
      // Update local state immediately for responsive UI
      if (isMountedRef.current) {
        setData(newData);
      }
      
      // Always store in localStorage first for offline capability
      if (dataType === 'logs') {
        localStorage.setItem(`${user.uid}-${dataType}`, JSON.stringify({ logs: newData }));
      } else {
        localStorage.setItem(`${user.uid}-${dataType}`, JSON.stringify(newData));
      }
      
      // If offline, queue the change for later sync
      if (!navigator.onLine) {
        const transaction = {
          type: dataType,
          data: newData,
          timestamp: new Date().toISOString()
        };
        
        // Add to pending transactions queue
        const pendingTx = [...pendingTransactionsRef.current, transaction];
        pendingTransactionsRef.current = pendingTx;
        
        localStorage.setItem(`${user.uid}-pendingTransactions`, JSON.stringify(pendingTx));
        
        if (isMountedRef.current) {
          setSyncStatus('offline');
        }
        
        return true; // Return success even in offline mode
      }
      
      // If online, attempt to sync with Firebase
      let result;
      if (dataType === 'logs') {
        result = await syncData.saveDeliveryLogs(user.uid, newData);
      } else if (dataType === 'settings') {
        result = await syncData.saveSettings(user.uid, newData);
      } else {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      if (result.error) {
        throw result.error;
      }

      if (isMountedRef.current) {
        setSyncStatus(result.isOnline ? 'synced' : 'offline');
      }
      
      return true;
    } catch (err) {
      console.error(`Error updating ${dataType}:`, err);
      
      // Even on error, if we have saved to localStorage, return success
      if (isMountedRef.current) {
        setError(`Failed to update ${dataType}: ${err.message}`);
        setSyncStatus('error');
      }
      
      // Return true if we at least saved locally
      return localStorage.getItem(`${user.uid}-${dataType}`) !== null;
    }
  };

  return {
    data,
    loading,
    error,
    syncStatus,
    updateData
  };
};

export default useSyncData;