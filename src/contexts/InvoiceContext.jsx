import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const InvoiceContext = createContext();

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoice must be used within an InvoiceProvider");
  }
  return context;
};

export const InvoiceProvider = ({ children }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState(0);

  // Load data from Firebase or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (user.isGuest) {
          // Load from localStorage for guest users
          const savedClients = localStorage.getItem(`invoice_clients_${user.uid}`);
          const savedInvoices = localStorage.getItem(`invoice_history_${user.uid}`);
          const savedLastNumber = localStorage.getItem(`last_invoice_number_${user.uid}`);

          if (savedClients) setClients(JSON.parse(savedClients));
          if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
          if (savedLastNumber) setLastInvoiceNumber(parseInt(savedLastNumber));
        } else {
          // Load from Firestore for regular users
          const invoiceDoc = await getDoc(doc(db, "invoiceData", user.uid));
          if (invoiceDoc.exists()) {
            const data = invoiceDoc.data();
            setClients(data.clients || []);
            setInvoices(data.invoices || []);
            setLastInvoiceNumber(data.lastInvoiceNumber || 0);
          }
        }
      } catch (error) {
        console.error("Error loading invoice data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Save data
  const saveData = async (newClients, newInvoices, newLastNumber) => {
    if (!user) return;

    try {
      if (user.isGuest) {
        // Save to localStorage for guest users
        localStorage.setItem(`invoice_clients_${user.uid}`, JSON.stringify(newClients));
        localStorage.setItem(`invoice_history_${user.uid}`, JSON.stringify(newInvoices));
        localStorage.setItem(`last_invoice_number_${user.uid}`, newLastNumber.toString());
      } else {
        // Save to Firestore for regular users
        const invoiceDocRef = doc(db, "invoiceData", user.uid);
        await setDoc(invoiceDocRef, {
          clients: newClients,
          invoices: newInvoices,
          lastInvoiceNumber: newLastNumber,
          updatedAt: new Date()
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error saving invoice data:", error);
      throw error;
    }
  };

  // Add or update client
  const saveClient = async (clientData) => {
    const existingIndex = clients.findIndex(c => c.id === clientData.id);
    let newClients;

    if (existingIndex >= 0) {
      // Update existing client
      newClients = [...clients];
      newClients[existingIndex] = clientData;
    } else {
      // Add new client
      const newClient = {
        ...clientData,
        id: clientData.id || Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      newClients = [...clients, newClient];
    }

    setClients(newClients);
    await saveData(newClients, invoices, lastInvoiceNumber);
    return newClients;
  };

  // Delete client
  const deleteClient = async (clientId) => {
    const newClients = clients.filter(c => c.id !== clientId);
    setClients(newClients);
    await saveData(newClients, invoices, lastInvoiceNumber);
  };

  // Add invoice to history
  const addInvoice = async (invoiceData) => {
    const newInvoice = {
      ...invoiceData,
      id: invoiceData.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    const newInvoices = [newInvoice, ...invoices];
    const newLastNumber = Math.max(lastInvoiceNumber, parseInt(invoiceData.invoiceNumber) || 0);

    setInvoices(newInvoices);
    setLastInvoiceNumber(newLastNumber);
    await saveData(clients, newInvoices, newLastNumber);
    return newInvoice;
  };

  // Delete invoice
  const deleteInvoice = async (invoiceId) => {
    const newInvoices = invoices.filter(inv => inv.id !== invoiceId);
    setInvoices(newInvoices);
    await saveData(clients, newInvoices, lastInvoiceNumber);
  };

  // Get next invoice number
  const getNextInvoiceNumber = () => {
    return lastInvoiceNumber + 1;
  };

  const value = {
    clients,
    invoices,
    loading,
    saveClient,
    deleteClient,
    addInvoice,
    deleteInvoice,
    getNextInvoiceNumber,
    lastInvoiceNumber
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
