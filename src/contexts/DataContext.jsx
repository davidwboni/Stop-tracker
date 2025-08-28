import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { syncData } from '../services/firebase';

// Create context with default values
const DataContext = createContext({
  logs: [],
  updateLogs: () => {},
  loading: true,
  syncing: false,
  isNewUser: false,
  forceSync: () => Promise.resolve(false)
});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]); // Initialize with empty array
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Initial data load - with error handling and retry mechanism
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        console.log("Loading user data...");
        
        // Try to process pending transactions, but continue even if it fails
        try {
          await syncData.processPendingTransactions(user.uid);
        } catch (syncErr) {
          console.warn("Non-critical error processing transactions:", syncErr);
        }
        
        // Fetch all data with retries
        let data = null;
        let retries = 0;
        const maxRetries = 3;
        
        while (!data && retries < maxRetries) {
          try {
            data = await syncData.forceRefreshAllData(user.uid);
            break;
          } catch (fetchErr) {
            console.warn(`Fetch attempt ${retries + 1} failed:`, fetchErr);
            retries++;
            if (retries < maxRetries) {
              // Wait a bit before retrying
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }
        }
        
        // If we got data, update the state
        if (data && data.logs) {
          console.log("Successfully loaded logs:", data.logs.length);
          setLogs(data.logs);
          setIsNewUser(data.logs.length === 0);
        } else {
          // If no data after retries, try to get from cache or set empty
          console.warn("Could not fetch fresh data, using fallback");
          setLogs([]);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        // Set empty logs as fallback
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Update logs and sync to backend
  const updateLogs = async (newLogs) => {
    setLogs(newLogs);
    if (user?.uid) {
      try {
        await syncData.updateLogs(user.uid, newLogs);
      } catch (err) {
        console.error("Error updating logs:", err);
      }
    }
  };

  // Force sync all data
  const forceSync = async () => {
    if (!user?.uid) return;
    
    setSyncing(true);
    try {
      await syncData.processPendingTransactions(user.uid);
      const refreshedData = await syncData.forceRefreshAllData(user.uid);
      
      if (refreshedData && refreshedData.logs) {
        setLogs(refreshedData.logs);
      }
      
      return true;
    } catch (err) {
      console.error("Error syncing data:", err);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const value = {
    logs,
    updateLogs,
    loading,
    syncing,
    isNewUser,
    forceSync
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;