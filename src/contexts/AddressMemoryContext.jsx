import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { recordUse, getFrequentAddresses } from "../services/addressMemory";

const AddressMemoryContext = createContext();

export const useAddressMemory = () => {
  const context = useContext(AddressMemoryContext);
  if (!context) {
    throw new Error("useAddressMemory must be used within an AddressMemoryProvider");
  }
  return context;
};

const FREQUENT_ADDRESSES_LIMIT = 5;

export const AddressMemoryProvider = ({ children }) => {
  const { user } = useAuth();
  const [memory, setMemory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (user.isGuest) {
          const saved = localStorage.getItem(`guestAddressMemory_${user.uid}`);
          if (saved) setMemory(JSON.parse(saved));
        } else {
          const memoryDoc = await getDoc(doc(db, "addressMemoryData", user.uid));
          if (memoryDoc.exists()) {
            setMemory(memoryDoc.data().entries || []);
          }
        }
      } catch (error) {
        console.error("Error loading address memory:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveMemory = async (newMemory) => {
    if (!user) return;

    try {
      if (user.isGuest) {
        localStorage.setItem(`guestAddressMemory_${user.uid}`, JSON.stringify(newMemory));
      } else {
        await setDoc(
          doc(db, "addressMemoryData", user.uid),
          { entries: newMemory, updatedAt: new Date() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error saving address memory:", error);
      throw error;
    }
  };

  const recordAddressUse = async (address) => {
    const newMemory = recordUse(memory, address, new Date());
    setMemory(newMemory);
    await saveMemory(newMemory);
  };

  const frequentAddresses = getFrequentAddresses(memory, new Date(), FREQUENT_ADDRESSES_LIMIT);

  const value = { frequentAddresses, recordAddressUse, loading };

  return (
    <AddressMemoryContext.Provider value={value}>
      {children}
    </AddressMemoryContext.Provider>
  );
};
