import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { syncData } from "../services/firebase";

export const useSyncData = (dataType) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const syncFunctions = useMemo(
    () => ({
      logs: {
        fetch: syncData.subscribeToDeliveryLogs,
        save: syncData.saveDeliveryLogs,
      },
      expenses: {
        fetch: syncData.subscribeToExpenses,
        save: syncData.saveExpenses,
      },
    }),
    []
  );

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe;

    const initSync = async () => {
      try {
        if (!syncFunctions[dataType]) {
          throw new Error(`Invalid dataType: ${dataType}`);
        }

        const localData = localStorage.getItem(`delivery-${dataType}`);
        if (localData) {
          setData(JSON.parse(localData));
        }

        unsubscribe = syncFunctions[dataType].fetch(user.uid, (newData) => {
          setData(newData);
          localStorage.setItem(`delivery-${dataType}`, JSON.stringify(newData));
        });

        setLoading(false);
      } catch (err) {
        setError(`Failed to sync data: ${err.message}`);
        setLoading(false);
      }
    };

    initSync();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, dataType, syncFunctions]);

  const updateData = async (newData) => {
    if (!user || !syncFunctions[dataType]) {
      setError(`Cannot update data for type: ${dataType}`);
      return false;
    }

    try {
      await syncFunctions[dataType].save(user.uid, newData);
      localStorage.setItem(`delivery-${dataType}`, JSON.stringify(newData));
      setData(newData);
      return true;
    } catch (err) {
      setError(`Failed to update data: ${err.message}`);
      return false;
    }
  };

  return {
    data,
    loading,
    error,
    updateData,
  };
};

export default useSyncData;