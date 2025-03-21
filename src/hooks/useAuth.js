import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, syncData } from "../services/firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [userData, setUserData] = useState({
    deliveryLogs: [],
    expenses: [],
    settings: null
  });

  // Handle authentication state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? `User: ${firebaseUser.uid}` : "No user");
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setLoading(false);
        setInitialDataLoaded(false);
        return;
      }
      
      try {
        // Load initial data if not already loaded
        if (!initialDataLoaded) {
          console.log("Loading initial user data for:", firebaseUser.uid);
          const [logs, expenses, settings] = await Promise.all([
            syncData.getDeliveryLogs(firebaseUser.uid),
            syncData.getExpenses(firebaseUser.uid),
            syncData.getSettings(firebaseUser.uid)
          ]);
          
          setUserData({
            deliveryLogs: logs || [],
            expenses: expenses || [],
            settings: settings || null
          });
          
          console.log("Initial data loaded:", {
            logs: logs ? logs.length : 0,
            expenses: expenses ? expenses.length : 0, 
            settings: settings ? "yes" : "no"
          });
          
          setInitialDataLoaded(true);
        }
      } catch (error) {
        console.error("Error loading initial user data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [initialDataLoaded]);

  // Set up real-time data subscriptions
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up data subscriptions for:", user.uid);
    
    // Subscribe to delivery logs changes
    const logsUnsubscribe = syncData.subscribeToDeliveryLogs(user.uid, (logs) => {
      console.log("Delivery logs updated:", logs ? logs.length : 0);
      setUserData(prev => ({ ...prev, deliveryLogs: logs || [] }));
    });
    
    // Subscribe to expenses changes
    const expensesUnsubscribe = syncData.subscribeToExpenses(user.uid, (expenses) => {
      console.log("Expenses updated:", expenses ? expenses.length : 0);
      setUserData(prev => ({ ...prev, expenses: expenses || [] }));
    });
    
    return () => {
      logsUnsubscribe();
      expensesUnsubscribe();
    };
  }, [user]);

  // Helper methods for data operations
  const saveDeliveryLogs = async (logs) => {
    if (!user) return false;
    const result = await syncData.saveDeliveryLogs(user.uid, logs);
    return result;
  };
  
  const saveExpenses = async (expenses) => {
    if (!user) return false;
    const result = await syncData.saveExpenses(user.uid, expenses);
    return result;
  };
  
  const saveSettings = async (settings) => {
    if (!user) return false;
    const result = await syncData.saveSettings(user.uid, settings);
    if (result) {
      setUserData(prev => ({ ...prev, settings }));
    }
    return result;
  };
  
  return {
    user,
    loading,
    data: userData,
    saveDeliveryLogs,
    saveExpenses,
    saveSettings
  };
}