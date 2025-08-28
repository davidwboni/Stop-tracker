import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { syncData } from "../services/firebase";

/**
 * Enhanced custom hook for syncing data with Firestore with better cross-device sync
 * @param {string} dataType - The type of data to sync ('logs', 'settings', etc.)
 * @param {Object} initialData - Optional initial data to use
 * @returns {Object} - Data, loading state, error state, sync status, and update function
 */
export const useSyncData = (dataType, initialData = null) => {
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('loading');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);
  const pendingTransactionsRef = useRef([]);
  const syncTimeoutRef = useRef(null);

  // Map dataType to collection name for consistency
  const collectionName = dataType === 'logs' ? 'deliveryLogs' : dataType;

  // Check if we have valid data type
  const isValidDataType = ['logs', 'settings', 'expenses'].includes(dataType);

  // Set mounted flag for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Function to force a refresh from server
  const forceRefresh = useCallback(async () => {
    if (!user || !navigator.onLine) return false;
    
    try {
      setSyncStatus('syncing');
      
      // Use the appropriate method based on data type
      if (dataType === 'logs') {
        // Process any pending logs transactions first
        await syncData.processPendingTransactions(user.uid);
        
        // Then get fresh server data
        const result = await syncData.forceRefreshAllData(user.uid);
        
        if (result.success) {
          // Get the refreshed data from localStorage
          const cachedData = localStorage.getItem(`${user.uid}-deliveryLogs`);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (parsed.logs) {
              if (isMountedRef.current) {
                setData(parsed.logs);
                setSyncStatus('synced');
                setLastSyncTime(Date.now());
              }
            }
          }
          return true;
        }
      } else if (dataType === 'settings') {
        // Similar process for settings
        await syncData.processPendingTransactions(user.uid);
        const result = await syncData.forceRefreshAllData(user.uid);
        
        if (result.success) {
          const cachedData = localStorage.getItem(`${user.uid}-settings`);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (isMountedRef.current) {
              setData(parsed);
              setSyncStatus('synced');
              setLastSyncTime(Date.now());
            }
          }
          return true;
        }
      }
      
      if (isMountedRef.current) {
        setSyncStatus('error');
      }
      return false;
    } catch (err) {
      console.error(`Error force refreshing ${dataType}:`, err);
      if (isMountedRef.current) {
        setError(`Failed to refresh ${dataType}: ${err.message}`);
        setSyncStatus('error');
      }
      return false;
    }
  }, [user, dataType]);

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
      const cachedData = localStorage.getItem(`${user.uid}-${collectionName}`);
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
            
            if (status === 'synced') {
              setLastSyncTime(Date.now());
            }
          }
        });
      } else if (dataType === 'settings') {
        unsubscribeRef.current = syncData.subscribeToSettings(user.uid, (newData, status) => {
          if (isMountedRef.current) {
            setData(newData);
            setSyncStatus(status || 'synced');
            setLoading(false);
            
            if (status === 'synced') {
              setLastSyncTime(Date.now());
            }
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
  }, [user, dataType, isValidDataType, collectionName]);

  // Periodic background refresh to ensure cross-device sync
  useEffect(() => {
    if (!user || !navigator.onLine) return;
    
    // Set up periodic refresh (every 5 minutes)
    const setupPeriodicRefresh = () => {
      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Set new timeout for refresh
      syncTimeoutRef.current = setTimeout(async () => {
        // Only refresh if we've been synced for more than 5 minutes or have never synced
        const shouldRefresh = !lastSyncTime || (Date.now() - lastSyncTime > 5 * 60 * 1000);
        
        if (shouldRefresh && navigator.onLine) {
          console.log(`Performing periodic background refresh for ${dataType}`);
          await forceRefresh();
        }
        
        // Setup next refresh
        setupPeriodicRefresh();
      }, 5 * 60 * 1000); // 5 minutes
    };
    
    setupPeriodicRefresh();
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [user, dataType, lastSyncTime, forceRefresh]);

  // Handle syncing pending transactions when online
  useEffect(() => {
    const processPendingTransactions = async () => {
      if (!user || !navigator.onLine) return;
      
      const pending = localStorage.getItem(`${user.uid}-pendingTransactions`);
      if (!pending) return;
      
      try {
        const transactions = JSON.parse(pending);
        if (transactions.length === 0) return;
        
        const relevantTx = transactions.filter(tx => 
          tx.type === dataType || 
          tx.collection === collectionName
        );
        
        if (relevantTx.length === 0) return;
        
        setSyncStatus('syncing');
        
        // Process transactions using the enhanced processor
        await syncData.processPendingTransactions(user.uid);
        
        // Force a refresh to ensure we have latest data
        await forceRefresh();
        
        setSyncStatus('synced');
        setLastSyncTime(Date.now());
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
  }, [user, dataType, collectionName, forceRefresh]);

  /**
   * Update the data with improved cross-device synchronization
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
        setSyncStatus('syncing');
      }
      
      // Use the appropriate Firebase method
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
        if (result.isOnline) {
          setLastSyncTime(Date.now());
        }
      }
      
      return true;
    } catch (err) {
      console.error(`Error updating ${dataType}:`, err);
      
      if (isMountedRef.current) {
        setError(`Failed to update ${dataType}: ${err.message}`);
        setSyncStatus('error');
      }
      
      return false;
    }
  };

  return {
    data,
    loading,
    error,
    syncStatus,
    updateData,
    forceRefresh,
    lastSyncTime
  };
};

export default useSyncData;