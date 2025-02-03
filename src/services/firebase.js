import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAZ-6RobdXXlYX8YL0OQV67AVq7Da7Sp2A",
  authDomain: "stop-tracker-v1.firebaseapp.com",
  projectId: "stop-tracker-v1",
  storageBucket: "stop-tracker-v1.appspot.com",
  messagingSenderId: "183138392477",
  appId: "1:183138392477:web:408e779b7276ed51897774",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Centralized Firestore Paths
const userPath = (userId, type) => `users/${userId}/data/${type}`;

// Data Sync Functions
export const syncData = {
  // Delivery Logs
  async saveDeliveryLogs(userId, logs) {
    try {
      await setDoc(doc(db, userPath(userId, "deliveryLogs")), { logs });
      return true;
    } catch (error) {
      console.error("Error saving delivery logs:", error.message);
      return false;
    }
  },

  async getDeliveryLogs(userId) {
    try {
      const docSnap = await getDoc(doc(db, userPath(userId, "deliveryLogs")));
      return docSnap.exists() ? docSnap.data().logs : [];
    } catch (error) {
      console.error("Error retrieving delivery logs:", error.message);
      return [];
    }
  },

  // Expenses
  async saveExpenses(userId, expenses) {
    try {
      await setDoc(doc(db, userPath(userId, "expenses")), { expenses });
      return true;
    } catch (error) {
      console.error("Error saving expenses:", error.message);
      return false;
    }
  },

  async getExpenses(userId) {
    try {
      const docSnap = await getDoc(doc(db, userPath(userId, "expenses")));
      return docSnap.exists() ? docSnap.data().expenses : [];
    } catch (error) {
      console.error("Error retrieving expenses:", error.message);
      return [];
    }
  },

  // User Settings
  async saveSettings(userId, settings) {
    try {
      await setDoc(doc(db, userPath(userId, "settings")), settings);
      return true;
    } catch (error) {
      console.error("Error saving user settings:", error.message);
      return false;
    }
  },

  async getSettings(userId) {
    try {
      const docSnap = await getDoc(doc(db, userPath(userId, "settings")));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error retrieving user settings:", error.message);
      return null;
    }
  },

  // Real-time Listeners
  subscribeToDeliveryLogs(userId, callback) {
    return onSnapshot(doc(db, userPath(userId, "deliveryLogs")), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().logs);
      } else {
        callback([]);
      }
    });
  },

  subscribeToExpenses(userId, callback) {
    return onSnapshot(doc(db, userPath(userId, "expenses")), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().expenses);
      } else {
        callback([]);
      }
    });
  },

  // Backup and Restore
  async backupAllData(userId) {
    try {
      const [logs, expenses, settings] = await Promise.all([
        this.getDeliveryLogs(userId),
        this.getExpenses(userId),
        this.getSettings(userId),
      ]);

      return {
        logs,
        expenses,
        settings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error creating backup:", error.message);
      return null;
    }
  },

  async restoreFromBackup(userId, backupData) {
    try {
      await Promise.all([
        this.saveDeliveryLogs(userId, backupData.logs),
        this.saveExpenses(userId, backupData.expenses),
        this.saveSettings(userId, backupData.settings),
      ]);
      return true;
    } catch (error) {
      console.error("Error restoring from backup:", error.message);
      return false;
    }
  },
};

export default app;