import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { syncData, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { normalizePayStructure } from '../features/payperiod/payStructure';

// Create context with default values
const DataContext = createContext({
  logs: [],
  updateLogs: () => {},
  loading: true,
  syncing: false,
  isNewUser: false,
  paymentConfig: null,
  needsOnboarding: false,
  completeOnboarding: () => Promise.resolve(),
  forceSync: () => Promise.resolve(false)
});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]); // Initialize with empty array
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(normalizePayStructure(null));
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
        
        // Handle guest users - load from localStorage
        if (user.isGuest) {
          try {
            const guestLogs = localStorage.getItem(`guestLogs_${user.uid}`);
            const guestConfig = localStorage.getItem(`guestConfig_${user.uid}`);
            
            // Create demo data if it doesn't exist
            const demoLogs = guestLogs ? JSON.parse(guestLogs) : [
              {
                id: 'demo_1',
                date: new Date().toISOString().split('T')[0],
                stops: 25,
                extra: 7.50,
                total: 54.50,
                notes: "Busy day with lots of packages",
                timestamp: new Date(Date.now() - 86400000).toISOString()
              },
              {
                id: 'demo_2', 
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                stops: 32,
                extra: 8.75,
                total: 68.75,
                notes: "Peak time deliveries",
                timestamp: new Date(Date.now() - 172800000).toISOString()
              },
              {
                id: 'demo_3',
                date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
                stops: 28,
                extra: 8.00,
                total: 61.20,
                notes: "Smooth delivery route",
                timestamp: new Date(Date.now() - 259200000).toISOString()
              }
            ];
            
            setLogs(demoLogs);
            
            // Save demo data for future sessions
            if (!guestLogs) {
              localStorage.setItem(`guestLogs_${user.uid}`, JSON.stringify(demoLogs));
            }
            setPaymentConfig(normalizePayStructure(guestConfig ? JSON.parse(guestConfig) : null));
            setIsNewUser(true); // Guest users are always "new" for demo purposes
            // First-run pay setup for guests too — survives reload via localStorage.
            setNeedsOnboarding(!localStorage.getItem(`onboarded_${user.uid}`) && !guestConfig);
          } catch (err) {
            console.error("Error loading guest data:", err);
            setLogs([]);
          }
          setLoading(false);
          return;
        }
        
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
        
        // Try to get logs directly from the sync service
        try {
          // Get delivery logs
          const userDocRef = doc(db, 'users', user.uid, 'deliveryLogs', 'data');
          const userDoc = await getDoc(userDocRef);
          
          let logsEmpty = true;
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userLogs = userData.logs || [];
            console.log("Successfully loaded logs:", userLogs.length);
            setLogs(userLogs);
            setIsNewUser(userLogs.length === 0);
            logsEmpty = userLogs.length === 0;
          } else {
            setLogs([]);
            setIsNewUser(true);
          }

          // Get payment config from main user document
          const mainUserDocRef = doc(db, 'users', user.uid);
          const mainUserDoc = await getDoc(mainUserDocRef);
          const mainData = mainUserDoc.exists() ? mainUserDoc.data() : {};
          if (mainData.paymentConfig) {
            setPaymentConfig(normalizePayStructure(mainData.paymentConfig));
          }

          // First-run: prompt pay setup only for a genuinely new user who has no
          // logs, no saved pay config, and hasn't already completed onboarding.
          setNeedsOnboarding(logsEmpty && !mainData.onboarded && !mainData.paymentConfig);
          
        } catch (directErr) {
          console.warn("Direct fetch failed, trying force refresh:", directErr);
          
          // Fallback to force refresh
          while (!data && retries < maxRetries) {
            try {
              data = await syncData.forceRefreshAllData(user.uid);
              break;
            } catch (fetchErr) {
              console.warn(`Fetch attempt ${retries + 1} failed:`, fetchErr);
              retries++;
              if (retries < maxRetries) {
                await new Promise(r => setTimeout(r, 1000 * retries));
              }
            }
          }
          
          // If still no data, set empty
          if (!data) {
            console.warn("Could not fetch fresh data, using fallback");
            setLogs([]);
          }
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
        if (user.isGuest) {
          // Save guest data to localStorage
          localStorage.setItem(`guestLogs_${user.uid}`, JSON.stringify(newLogs));
        } else {
          // Save regular user data to Firebase
          await syncData.saveDeliveryLogs(user.uid, newLogs);
        }
      } catch (err) {
        console.error("Error updating logs:", err);
      }
    }
  };

  // Complete first-run onboarding: optionally save the chosen pay config, mark
  // the account onboarded, and clear the gate. Guests persist locally.
  const completeOnboarding = async (config) => {
    if (config) setPaymentConfig(normalizePayStructure(config));
    setNeedsOnboarding(false);
    if (!user?.uid) return;
    try {
      if (user.isGuest) {
        if (config) localStorage.setItem(`guestConfig_${user.uid}`, JSON.stringify(config));
        localStorage.setItem(`onboarded_${user.uid}`, '1');
      } else {
        const payload = { onboarded: true, updatedAt: new Date().toISOString() };
        if (config) payload.paymentConfig = config;
        await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
      }
    } catch (err) {
      console.warn("Could not persist onboarding:", err);
    }
  };

  // Force sync all data
  const forceSync = async () => {
    if (!user?.uid) return;
    
    setSyncing(true);
    try {
      if (user.isGuest) {
        // For guest users, just reload from localStorage
        const guestLogs = localStorage.getItem(`guestLogs_${user.uid}`);
        const guestConfig = localStorage.getItem(`guestConfig_${user.uid}`);
        
        if (guestLogs) setLogs(JSON.parse(guestLogs));
        if (guestConfig) setPaymentConfig(normalizePayStructure(JSON.parse(guestConfig)));
        return true;
      } else {
        // For regular users, sync with Firebase
        await syncData.processPendingTransactions(user.uid);
        const refreshedData = await syncData.forceRefreshAllData(user.uid);
        
        if (refreshedData && refreshedData.logs) {
          setLogs(refreshedData.logs);
        }
        
        if (refreshedData && refreshedData.paymentConfig) {
          setPaymentConfig(normalizePayStructure(refreshedData.paymentConfig));
        }
        
        return true;
      }
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
    paymentConfig,
    needsOnboarding,
    completeOnboarding,
    forceSync
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;