import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZ-6RobdXXlYX8YL0OQV67AVq7Da7Sp2A",
  authDomain: "stop-tracker-v1.firebaseapp.com",
  projectId: "stop-tracker-v1",
  storageBucket: "stop-tracker-v1.appspot.com",
  messagingSenderId: "183138392477",
  appId: "1:183138392477:web:408e779b7276ed51897774",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// ==== User Management ====

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      displayName: displayName || "User",
      role: "free",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    
    return { user };
  } catch (error) {
    console.error("Error signing up:", error);
    return { error };
  }
};

/**
 * Log in with email and password
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login timestamp
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastLogin: serverTimestamp()
    });
    
    return { user: userCredential.user };
  } catch (error) {
    console.error("Error logging in:", error);
    return { error };
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user document exists
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || null,
        role: "free",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      // Update last login timestamp
      await updateDoc(doc(db, "users", user.uid), {
        lastLogin: serverTimestamp()
      });
    }
    
    return { user };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return { error };
  }
};

/**
 * Log out user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { error };
  }
};

/**
 * Get current user information with Firestore data
 */
export const getCurrentUser = async () => {
  if (!auth.currentUser) return null;
  
  try {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists()) {
      return {
        ...auth.currentUser,
        ...userDoc.data()
      };
    }
    return auth.currentUser;
  } catch (error) {
    console.error("Error getting current user data:", error);
    return auth.currentUser;
  }
};

// ==== Data Management ====

/**
 * Create or update user data (for logs, settings, etc.)
 */
export const setUserData = async (userId, collection, data) => {
  try {
    const docRef = doc(db, `users/${userId}/${collection}/data`);
    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (error) {
    console.error(`Error setting ${collection} data:`, error);
    return { error };
  }
};

/**
 * Get user data
 */
export const getUserData = async (userId, collection) => {
  try {
    const docRef = doc(db, `users/${userId}/${collection}/data`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { data: docSnap.data() };
    } else {
      return { data: null };
    }
  } catch (error) {
    console.error(`Error getting ${collection} data:`, error);
    return { error };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // If display name is provided, update auth profile as well
    if (data.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error };
  }
};

/**
 * Upload profile image
 */
export const uploadProfileImage = async (userId, file) => {
  try {
    const storageRef = ref(storage, `users/${userId}/profile`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update user profile
    await updateDoc(doc(db, "users", userId), {
      photoURL: downloadURL,
      updatedAt: serverTimestamp()
    });
    
    // Update auth profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
    }
    
    return { photoURL: downloadURL };
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return { error };
  }
};

// ==== Delivery Logs ====

/**
 * Save delivery logs
 */
export const saveDeliveryLogs = async (userId, logs) => {
  try {
    await setDoc(doc(db, `users/${userId}/deliveryLogs/data`), { 
      logs,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving delivery logs:", error);
    return { error };
  }
};

/**
 * Get delivery logs
 */
export const getDeliveryLogs = async (userId) => {
  try {
    const docRef = doc(db, `users/${userId}/deliveryLogs/data`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { logs: docSnap.data().logs || [] };
    } else {
      // Initialize empty logs array if it doesn't exist
      await setDoc(docRef, { logs: [], updatedAt: serverTimestamp() });
      return { logs: [] };
    }
  } catch (error) {
    console.error("Error getting delivery logs:", error);
    return { error, logs: [] };
  }
};

/**
 * Subscribe to delivery logs (real-time updates)
 */
export const subscribeToDeliveryLogs = (userId, callback) => {
  try {
    const docRef = doc(db, `users/${userId}/deliveryLogs/data`);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().logs || []);
      } else {
        // Document doesn't exist yet, initialize it
        setDoc(docRef, { logs: [], updatedAt: serverTimestamp() })
          .then(() => callback([]))
          .catch(err => console.error("Error initializing logs document:", err));
      }
    }, (error) => {
      console.error("Error subscribing to delivery logs:", error);
      // Try to get cached data if available
      getDeliveryLogs(userId)
        .then(result => {
          if (!result.error) {
            callback(result.logs);
          }
        })
        .catch(err => console.error("Error getting cached logs:", err));
    });
    
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up logs subscription:", error);
    return () => {}; // Return empty function as fallback
  }
};

// ==== User Settings ====

/**
 * Save user settings
 */
export const saveUserSettings = async (userId, settings) => {
  try {
    await setDoc(doc(db, `users/${userId}/settings/data`), {
      ...settings,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { error };
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async (userId) => {
  try {
    const docRef = doc(db, `users/${userId}/settings/data`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { settings: docSnap.data() };
    } else {
      // Initialize with default settings
      const defaultSettings = {
        theme: 'system',
        paymentConfig: {
          paymentType: 'fixed',
          ratePerStop: 1.90,
          bonusThreshold: 150,
          bonusAmount: 10
        },
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, defaultSettings);
      return { settings: defaultSettings };
    }
  } catch (error) {
    console.error("Error getting settings:", error);
    return { error, settings: null };
  }
};

/**
 * Subscribe to user settings (real-time updates)
 */
export const subscribeToUserSettings = (userId, callback) => {
  const docRef = doc(db, `users/${userId}/settings/data`);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      // Initialize with default settings
      const defaultSettings = {
        theme: 'system',
        paymentConfig: {
          paymentType: 'fixed',
          ratePerStop: 1.90,
          bonusThreshold: 150,
          bonusAmount: 10
        }
      };
      
      setDoc(docRef, { 
        ...defaultSettings,
        updatedAt: serverTimestamp()
      })
        .then(() => callback(defaultSettings))
        .catch(err => console.error("Error initializing settings:", err));
    }
  }, (error) => {
    console.error("Error subscribing to settings:", error);
  });
};

// ==== Data Synchronization ====

// This sync service manages access to data
export const syncData = {
  // Generic subscribe method for any collection
  subscribeToCollection: (userId, collection, callback) => {
    const docRef = doc(db, `users/${userId}/${collection}/data`);
    
    // Set up online/offline detection
    let syncStatus = 'syncing';
    let unsubscribe = null;
    
    // Check connection status and handle offline mode
    const updateConnectionStatus = (isOnline) => {
      if (isOnline) {
        syncStatus = 'synced';
        
        // If coming back online, resubscribe
        if (!unsubscribe) {
          setupSubscription();
        }
      } else {
        syncStatus = 'offline';
        
        // If going offline, unsubscribe to prevent errors
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        
        // Try to use cached data
        const cachedData = localStorage.getItem(`${userId}-${collection}`);
        if (cachedData) {
          try {
            callback(JSON.parse(cachedData), 'offline');
          } catch (e) {
            console.error('Error parsing cached data:', e);
          }
        }
      }
    };
    
    // Handle online/offline events
    window.addEventListener('online', () => updateConnectionStatus(true));
    window.addEventListener('offline', () => updateConnectionStatus(false));
    
    // Initial connection status
    updateConnectionStatus(navigator.onLine);
    
    // Set up the subscription
    const setupSubscription = () => {
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Cache the data for offline use
          try {
            localStorage.setItem(`${userId}-${collection}`, JSON.stringify(data));
          } catch (e) {
            console.error('Error caching data:', e);
          }
          callback(data, 'synced');
        } else {
          // Document doesn't exist yet
          const emptyData = { updatedAt: new Date().toISOString() };
          callback(emptyData, 'synced');
          
          // Initialize the document
          setDoc(docRef, emptyData)
            .catch(err => console.error(`Error initializing ${collection} document:`, err));
        }
      }, (error) => {
        console.error(`Error in ${collection} subscription:`, error);
        syncStatus = 'error';
        
        // Try to use cached data on error
        const cachedData = localStorage.getItem(`${userId}-${collection}`);
        if (cachedData) {
          try {
            callback(JSON.parse(cachedData), 'error');
          } catch (e) {
            console.error('Error parsing cached data:', e);
          }
        }
      });
      
      return unsubscribe;
    };
    
    // Set up initial subscription if online
    if (navigator.onLine) {
      setupSubscription();
    }
    
    // Return cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  },
  
  // Save data to a collection
  saveToCollection: async (userId, collection, data) => {
    try {
      // Save to Firestore if online
      if (navigator.onLine) {
        await setDoc(doc(db, `users/${userId}/${collection}/data`), {
          ...data,
          updatedAt: serverTimestamp()
        });
      }
      
      // Always save to local storage as backup
      localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString()
      }));
      
      return { success: true, isOnline: navigator.onLine };
    } catch (error) {
      console.error(`Error saving to ${collection}:`, error);
      return { error, isOnline: navigator.onLine };
    }
  },
  
  // Specific methods for delivery logs
  subscribeToDeliveryLogs: (userId, callback) => {
    return syncData.subscribeToCollection(userId, 'deliveryLogs', (data, status) => {
      callback(data?.logs || [], status);
    });
  },
  
  saveDeliveryLogs: (userId, logs) => {
    return syncData.saveToCollection(userId, 'deliveryLogs', { logs });
  },
  
  // Specific methods for settings
  subscribeToSettings: (userId, callback) => {
    return syncData.subscribeToCollection(userId, 'settings', (data, status) => {
      callback(data || {}, status);
    });
  },
  
  saveSettings: (userId, settings) => {
    return syncData.saveToCollection(userId, 'settings', settings);
  }
};

export default app;