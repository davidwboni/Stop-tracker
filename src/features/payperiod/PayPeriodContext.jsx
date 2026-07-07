import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PayPeriodContext = createContext();

export const usePayPeriods = () => {
  const context = useContext(PayPeriodContext);
  if (!context) {
    throw new Error("usePayPeriods must be used within a PayPeriodProvider");
  }
  return context;
};

export const PayPeriodProvider = ({ children }) => {
  const { user } = useAuth();
  const [payPeriods, setPayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (user.isGuest) {
          const saved = localStorage.getItem(`pay_periods_${user.uid}`);
          if (saved) setPayPeriods(JSON.parse(saved));
        } else {
          const payPeriodDoc = await getDoc(doc(db, "payPeriodData", user.uid));
          if (payPeriodDoc.exists()) {
            setPayPeriods(payPeriodDoc.data().payPeriods || []);
          }
        }
      } catch (error) {
        console.error("Error loading pay period data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveData = async (newPayPeriods) => {
    if (!user) return;

    try {
      if (user.isGuest) {
        localStorage.setItem(`pay_periods_${user.uid}`, JSON.stringify(newPayPeriods));
      } else {
        await setDoc(
          doc(db, "payPeriodData", user.uid),
          { payPeriods: newPayPeriods, updatedAt: new Date() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error saving pay period data:", error);
      throw error;
    }
  };

  const addPayPeriod = async (periodData) => {
    const newPeriod = {
      ...periodData,
      id: periodData.id || Date.now().toString(),
      invoiceId: periodData.invoiceId || null,
      createdAt: new Date().toISOString(),
    };
    const newPayPeriods = [newPeriod, ...payPeriods];
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
    return newPeriod;
  };

  const updatePayPeriod = async (periodId, updates) => {
    const newPayPeriods = payPeriods.map((p) => (p.id === periodId ? { ...p, ...updates } : p));
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
  };

  const deletePayPeriod = async (periodId) => {
    const newPayPeriods = payPeriods.filter((p) => p.id !== periodId);
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
  };

  const value = { payPeriods, loading, addPayPeriod, updatePayPeriod, deletePayPeriod };

  return <PayPeriodContext.Provider value={value}>{children}</PayPeriodContext.Provider>;
};
