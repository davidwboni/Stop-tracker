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
  getDocs,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites,
  connectFirestoreEmulator
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

// Configure Firestore with persistence for offline capability
import { enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

export const db = getFirestore(app);
// Enable offline persistence with optimized settings
try {
  enableIndexedDbPersistence(db, {
    synchronizeTabs: true // Enable multi-tab support for better device sync
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Persistence not supported in this browser');
    }
  });

  // Set cache size to unlimited for better offline experience
  db.settings({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });
} catch (err) {
  console.error('Error setting up Firestore persistence:', err);
}

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
    // Ensure network is enabled
    await enableNetwork(db);
    
    const docRef = doc(db, `users/${userId}/deliveryLogs/data`);
    await setDoc(docRef, { 
      logs,
      updatedAt: serverTimestamp()
    });
    
    // Also save to localStorage for offline access
    try {
      localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify({ 
        logs, 
        updatedAt: new Date().toISOString() 
      }));
    } catch (e) {
      console.error('Error saving logs to localStorage:', e);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error saving delivery logs:", error);
    return { error };
  }
};

/**
 * Get delivery logs
 */
export const getDeliveryLogs = async (userId, forceServerRead = false) => {
  try {
    const docRef = doc(db, `users/${userId}/deliveryLogs/data`);
    let docSnap;
    
    // Force a server read if requested and online
    if (forceServerRead && navigator.onLine) {
      try {
        await enableNetwork(db);
        docSnap = await getDoc(docRef, { source: 'server' });
      } catch (err) {
        console.error('Error reading from server:', err);
        docSnap = await getDoc(docRef);
      }
    } else {
      docSnap = await getDoc(docRef);
    }
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Cache the data for offline use
      try {
        localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify(data));
      } catch (e) {
        console.error('Error caching logs data:', e);
      }
      
      return { logs: data.logs || [] };
    } else {
      // Initialize empty logs array if it doesn't exist
      const emptyData = { logs: [], updatedAt: serverTimestamp() };
      await setDoc(docRef, emptyData);
      
      try {
        localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify(emptyData));
      } catch (e) {
        console.error('Error caching empty logs data:', e);
      }
      
      return { logs: [] };
    }
  } catch (error) {
    console.error("Error getting delivery logs:", error);
    
    // Try to get from localStorage on error
    try {
      const cachedData = localStorage.getItem(`${userId}-deliveryLogs`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return { logs: parsed.logs || [], fromCache: true };
      }
    } catch (e) {
      console.error('Error reading cached logs:', e);
    }
    
    return { error, logs: [] };
  }
};

/**
 * Subscribe to delivery logs (real-time updates)
 */
export const subscribeToDeliveryLogs = (userId, callback) => {
  try {
    // First, try to get data from localStorage for immediate UI update
    try {
      const cachedData = localStorage.getItem(`${userId}-deliveryLogs`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        callback(parsed.logs || []);
      }
    } catch (e) {
      console.error('Error reading cached logs:', e);
    }
    
    // Ensure network is enabled
    enableNetwork(db).catch(err => {
      console.error('Error enabling network:', err);
    });
    
    const docRef = doc(db, `users/${userId}/deliveryLogs/data`);
    
    // Subscribe with metadata changes to detect sync state
    const unsubscribe = onSnapshot(docRef, {
      includeMetadataChanges: true
    }, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const source = docSnap.metadata.fromCache ? 'cache' : 'server';
        console.log(`Logs data came from ${source}`);
        
        // Always update callback with the latest data
        callback(data.logs || []);
        
        // Cache the data for offline use
        try {
          localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify(data));
        } catch (e) {
          console.error('Error caching logs data:', e);
        }
      } else {
        // Document doesn't exist yet, initialize it
        setDoc(docRef, { logs: [], updatedAt: serverTimestamp() })
          .then(() => {
            callback([]);
            
            // Cache empty data
            try {
              localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify({ 
                logs: [], 
                updatedAt: new Date().toISOString() 
              }));
            } catch (e) {
              console.error('Error caching empty logs data:', e);
            }
          })
          .catch(err => console.error("Error initializing logs document:", err));
      }
    }, (error) => {
      console.error("Error subscribing to delivery logs:", error);
      
      // Try to get cached data if available
      try {
        const cachedData = localStorage.getItem(`${userId}-deliveryLogs`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          callback(parsed.logs || []);
        }
      } catch (e) {
        console.error('Error reading cached logs on error:', e);
      }
    });
    
    // Force a server read when setting up subscription if online
    if (navigator.onLine) {
      getDoc(docRef, { source: 'server' })
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            callback(data.logs || []);
            
            // Cache the data
            try {
              localStorage.setItem(`${userId}-deliveryLogs`, JSON.stringify(data));
            } catch (e) {
              console.error('Error caching logs data from force read:', e);
            }
          }
        })
        .catch(err => console.error('Error during forced server read:', err));
    }
    
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
    await enableNetwork(db);
    
    const docRef = doc(db, `users/${userId}/settings/data`);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp()
    });
    
    // Save to localStorage as well
    try {
      localStorage.setItem(`${userId}-settings`, JSON.stringify({
        ...settings,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving settings to localStorage:', e);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { error };
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async (userId, forceServerRead = false) => {
  try {
    const docRef = doc(db, `users/${userId}/settings/data`);
    let docSnap;
    
    // Force a server read if requested and online
    if (forceServerRead && navigator.onLine) {
      try {
        await enableNetwork(db);
        docSnap = await getDoc(docRef, { source: 'server' });
      } catch (err) {
        console.error('Error reading settings from server:', err);
        docSnap = await getDoc(docRef);
      }
    } else {
      docSnap = await getDoc(docRef);
    }
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Cache the data
      try {
        localStorage.setItem(`${userId}-settings`, JSON.stringify(data));
      } catch (e) {
        console.error('Error caching settings data:', e);
      }
      
      return { settings: data };
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
      
      // Cache default settings
      try {
        localStorage.setItem(`${userId}-settings`, JSON.stringify({
          ...defaultSettings,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Error caching default settings:', e);
      }
      
      return { settings: defaultSettings };
    }
  } catch (error) {
    console.error("Error getting settings:", error);
    
    // Try to get settings from localStorage
    try {
      const cachedData = localStorage.getItem(`${userId}-settings`);
      if (cachedData) {
        return { settings: JSON.parse(cachedData), fromCache: true };
      }
    } catch (e) {
      console.error('Error reading cached settings:', e);
    }
    
    return { error, settings: null };
  }
};

/**
 * Subscribe to user settings (real-time updates)
 */
export const subscribeToUserSettings = (userId, callback) => {
  try {
    // First try to get data from localStorage for immediate UI update
    try {
      const cachedData = localStorage.getItem(`${userId}-settings`);
      if (cachedData) {
        callback(JSON.parse(cachedData));
      }
    } catch (e) {
      console.error('Error reading cached settings:', e);
    }
    
    // Ensure network is enabled
    enableNetwork(db).catch(err => {
      console.error('Error enabling network for settings:', err);
    });
    
    const docRef = doc(db, `users/${userId}/settings/data`);
    
    // Subscribe with metadata changes
    const unsubscribe = onSnapshot(docRef, {
      includeMetadataChanges: true
    }, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const source = docSnap.metadata.fromCache ? 'cache' : 'server';
        console.log(`Settings data came from ${source}`);
        
        callback(data);
        
        // Cache the data
        try {
          localStorage.setItem(`${userId}-settings`, JSON.stringify(data));
        } catch (e) {
          console.error('Error caching settings data:', e);
        }
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
          .then(() => {
            callback(defaultSettings);
            
            // Cache default settings
            try {
              localStorage.setItem(`${userId}-settings`, JSON.stringify({
                ...defaultSettings,
                updatedAt: new Date().toISOString()
              }));
            } catch (e) {
              console.error('Error caching default settings:', e);
            }
          })
          .catch(err => console.error("Error initializing settings:", err));
      }
    }, (error) => {
      console.error("Error subscribing to settings:", error);
      
      // Try to get cached settings
      try {
        const cachedData = localStorage.getItem(`${userId}-settings`);
        if (cachedData) {
          callback(JSON.parse(cachedData));
        }
      } catch (e) {
        console.error('Error reading cached settings on error:', e);
      }
    });
    
    // Force a server read when setting up subscription if online
    if (navigator.onLine) {
      getDoc(docRef, { source: 'server' })
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            callback(data);
            
            // Cache the data
            try {
              localStorage.setItem(`${userId}-settings`, JSON.stringify(data));
            } catch (e) {
              console.error('Error caching settings from force read:', e);
            }
          }
        })
        .catch(err => console.error('Error during forced settings read:', err));
    }
    
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up settings subscription:", error);
    return () => {}; // Return empty function as fallback
  }
};

// ==== Data Synchronization ====

// Add connectivity methods

// This sync service manages access to data with improved sync logic
export const syncData = {
  // Generic subscribe method for any collection with improved cross-device sync
  subscribeToCollection: (userId, collection, callback) => {
    const docRef = doc(db, `users/${userId}/${collection}/data`);
    let syncStatus = 'syncing';
    let unsubscribe = null;
    let lastServerTimestamp = null;
    let localUpdateCount = 0;
    
    // First try to load cached data for immediate UI update
    try {
      const cachedData = localStorage.getItem(`${userId}-${collection}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        callback(parsed, 'loading');
      }
    } catch (e) {
      console.error(`Error loading cached ${collection} data:`, e);
    }
    
    // Enhanced connection status handler with improved sync logic
    const updateConnectionStatus = async (isOnline) => {
      try {
        if (isOnline) {
          syncStatus = 'syncing';
          
          // Don't explicitly disable/enable network as this interferes with multi-device sync
          // Instead, rely on Firestore's built-in persistence and sync capabilities
          console.log(`Device online, syncing ${collection} data...`);
          
          // Process any pending transactions first
          await processPendingTransactions(userId);
          
          // If coming back online, resubscribe or force a refresh
          if (!unsubscribe) {
            unsubscribe = setupSubscription(true); // Force server read
          } else {
            // Force a fresh server read when coming back online to get latest data
            try {
              // First, wait for any pending writes to complete
              await waitForPendingWrites(db);
              
              const docSnap = await getDoc(docRef, { source: 'server' });
              if (docSnap.exists()) {
                const data = docSnap.data();
                const serverTime = data.updatedAt?.toMillis?.() || Date.now();
                
                // Only update if server data is newer than our last known state
                if (!lastServerTimestamp || serverTime > lastServerTimestamp) {
                  lastServerTimestamp = serverTime;
                  
                  // Cache the fresh data with sync metadata
                  localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
                    ...data,
                    _syncMetadata: {
                      lastServerSync: Date.now(),
                      syncSource: 'server',
                      syncVersion: localUpdateCount
                    }
                  }));
                  
                  callback(data, 'synced');
                  syncStatus = 'synced';
                }
              }
            } catch (err) {
              console.error(`Error refreshing ${collection} on reconnect:`, err);
            }
          }
        } else {
          syncStatus = 'offline';
          console.log(`Device offline, using cached ${collection} data`);
          
          // Use cached data in offline mode
          const cachedData = localStorage.getItem(`${userId}-${collection}`);
          if (cachedData) {
            try {
              callback(JSON.parse(cachedData), 'offline');
            } catch (e) {
              console.error(`Error parsing cached ${collection} data:`, e);
            }
          }
        }
      } catch (err) {
        console.error(`Error handling connection change for ${collection}:`, err);
      }
    };
    
    // Process any pending transactions for this collection
    const processPendingTransactions = async (userId) => {
      try {
        const pendingKey = `${userId}-pendingTransactions`;
        const pendingTx = localStorage.getItem(pendingKey);
        
        if (!pendingTx) return false;
        
        const transactions = JSON.parse(pendingTx);
        if (transactions.length === 0) return false;
        
        const relevantTx = transactions.filter(tx => 
          tx.collection === collection || 
          (tx.type === collection && tx.data)); // Support both formats
        
        if (relevantTx.length === 0) return false;
        
        console.log(`Processing ${relevantTx.length} pending ${collection} transactions`);
        
        // Wait for network capabilities
        let retries = 0;
        while (retries < 3 && !navigator.onLine) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        }
        
        if (!navigator.onLine) return false;
        
        // Process each transaction
        for (const tx of relevantTx) {
          try {
            if (tx.collection === collection || tx.type === collection) {
              const data = tx.data;
              
              // Use the appropriate data format depending on the collection
              const docData = collection === 'deliveryLogs' 
                ? { logs: data, updatedAt: serverTimestamp() }
                : { ...data, updatedAt: serverTimestamp() };
              
              await setDoc(docRef, docData, { merge: true });
              console.log(`Successfully processed ${collection} transaction`);
            }
          } catch (err) {
            console.error(`Error processing ${collection} transaction:`, err);
          }
        }
        
        // Remove processed transactions of this type
        const remainingTx = transactions.filter(tx => 
          tx.collection !== collection && 
          tx.type !== collection);
        
        if (remainingTx.length === 0) {
          localStorage.removeItem(pendingKey);
        } else {
          localStorage.setItem(pendingKey, JSON.stringify(remainingTx));
        }
        
        return true;
      } catch (err) {
        console.error(`Error processing pending ${collection} transactions:`, err);
        return false;
      }
    };
    
    // Handle online/offline events
    window.addEventListener('online', () => updateConnectionStatus(true));
    window.addEventListener('offline', () => updateConnectionStatus(false));
    
    // Set up the subscription with enhanced options
    const setupSubscription = (forceServerRead = false) => {
      // Use metadata changes to detect if data is from cache or server
      const options = {
        includeMetadataChanges: true
      };
      
      // Set up the snapshot listener
      unsubscribe = onSnapshot(docRef, options, (docSnap) => {
        try {
          // Check data source (cache or server)
          const source = docSnap.metadata.fromCache ? 'cache' : 'server';
          const hasPendingWrites = docSnap.metadata.hasPendingWrites;
          
          console.log(`${collection} data came from ${source}${hasPendingWrites ? ' (has pending writes)' : ''}`);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const serverTime = data.updatedAt?.toMillis?.() || Date.now();
            
            // Track the server timestamp for sync comparison
            if (source === 'server' && !hasPendingWrites) {
              lastServerTimestamp = serverTime;
            }
            
            // Store sync metadata with the data
            const syncMetadata = {
              lastServerSync: source === 'server' ? Date.now() : undefined,
              syncSource: source,
              hasPendingWrites,
              syncVersion: source === 'server' ? localUpdateCount : localUpdateCount + 1
            };
            
            // Always cache the data we receive with sync metadata
            localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
              ...data,
              _syncMetadata: syncMetadata
            }));
            
            // Update with the latest data and sync status
            if (source === 'server') {
              if (!hasPendingWrites) {
                syncStatus = 'synced';
                callback(data, 'synced');
              } else {
                syncStatus = 'syncing';
                callback(data, 'syncing');
              }
            } else if (syncStatus !== 'synced' || hasPendingWrites) {
              // Update from cache if we haven't synced or have pending writes
              callback(data, hasPendingWrites ? 'syncing' : (navigator.onLine ? 'syncing' : 'offline'));
            }
          } else {
            // Document doesn't exist yet
            const emptyData = { 
              updatedAt: serverTimestamp()
            };
            
            // For logs collection, add an empty logs array
            if (collection === 'deliveryLogs') {
              emptyData.logs = [];
            }
            
            // Initialize the document
            setDoc(docRef, emptyData)
              .then(() => {
                const dataWithClientTimestamp = {
                  ...emptyData,
                  updatedAt: new Date().toISOString()
                };
                
                localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
                  ...dataWithClientTimestamp,
                  _syncMetadata: {
                    lastServerSync: Date.now(),
                    syncSource: 'client',
                    hasPendingWrites: true
                  }
                }));
                
                callback(
                  collection === 'deliveryLogs' ? { logs: [] } : dataWithClientTimestamp, 
                  navigator.onLine ? 'syncing' : 'offline'
                );
                
                syncStatus = navigator.onLine ? 'syncing' : 'offline';
              })
              .catch(err => console.error(`Error initializing ${collection} document:`, err));
          }
        } catch (e) {
          console.error(`Error in ${collection} snapshot handler:`, e);
        }
      }, (error) => {
        console.error(`Error in ${collection} subscription:`, error);
        syncStatus = 'error';
        
        // Try to use cached data on error
        try {
          const cachedData = localStorage.getItem(`${userId}-${collection}`);
          if (cachedData) {
            callback(JSON.parse(cachedData), 'error');
          }
        } catch (e) {
          console.error(`Error parsing cached ${collection} data on error:`, e);
        }
      });
      
      // If forcing a server read, explicitly get from server in addition to listener
      if (forceServerRead && navigator.onLine) {
        getDoc(docRef, { source: 'server' })
          .then(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const serverTime = data.updatedAt?.toMillis?.() || Date.now();
              lastServerTimestamp = serverTime;
              
              localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
                ...data,
                _syncMetadata: {
                  lastServerSync: Date.now(),
                  syncSource: 'server',
                  syncVersion: localUpdateCount
                }
              }));
              
              callback(data, 'synced');
              syncStatus = 'synced';
            }
          })
          .catch(err => console.error(`Error forcing ${collection} server read:`, err));
      }
      
      return unsubscribe;
    };
    
    // Initial connection status and subscription setup
    updateConnectionStatus(navigator.onLine);
    
    // Return cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  },
  
  // Save data to a collection with enhanced reliability
  saveToCollection: async (userId, collection, data) => {
    try {
      // Save to local storage immediately for responsive UI
      localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString()
      }));
      
      // If online, save to Firestore
      if (navigator.onLine) {
        try {
          // Ensure network is enabled
          await enableNetwork(db);
          
          // Use server timestamp when online
          const docRef = doc(db, `users/${userId}/${collection}/data`);
          await setDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
          
          // Force a server read to ensure we're in sync
          const docSnap = await getDoc(docRef, { source: 'server' });
          if (docSnap.exists()) {
            // Update cache with server data
            localStorage.setItem(`${userId}-${collection}`, JSON.stringify(docSnap.data()));
          }
          
          return { success: true, isOnline: true };
        } catch (err) {
          console.error(`Error saving ${collection} to Firestore:`, err);
          // Continue with offline handling - data is already in localStorage
          return { success: true, isOnline: false, error: err.message };
        }
      }
      
      // If offline, queue for sync when online
      const pendingKey = `${userId}-pendingTransactions`;
      try {
        let pendingTransactions = [];
        const existingTx = localStorage.getItem(pendingKey);
        
        if (existingTx) {
          pendingTransactions = JSON.parse(existingTx);
        }
        
        // Add this transaction to the queue
        pendingTransactions.push({
          collection,
          data,
          timestamp: new Date().toISOString()
        });
        
        localStorage.setItem(pendingKey, JSON.stringify(pendingTransactions));
      } catch (e) {
        console.error('Error queueing transaction:', e);
      }
      
      return { success: true, isOnline: false };
    } catch (error) {
      console.error(`Error in saveToCollection for ${collection}:`, error);
      return { error, isOnline: navigator.onLine };
    }
  },
  
  // Process pending transactions with improved reliability and conflict resolution
  processPendingTransactions: async (userId) => {
    if (!navigator.onLine) return { success: false, reason: 'offline' };
    
    try {
      const pendingKey = `${userId}-pendingTransactions`;
      const pendingTx = localStorage.getItem(pendingKey);
      
      if (!pendingTx) return { success: true, count: 0 };
      
      const transactions = JSON.parse(pendingTx);
      if (transactions.length === 0) return { success: true, count: 0 };
      
      console.log(`Processing ${transactions.length} pending transactions for user ${userId}`);
      
      // Sort transactions by timestamp and version to ensure proper order
      const sortedTransactions = [...transactions].sort((a, b) => {
        // First by sync version if available
        if (a.syncVersion !== undefined && b.syncVersion !== undefined) {
          return a.syncVersion - b.syncVersion;
        }
        // Then by timestamp
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const processedIds = [];
      const failedIds = [];
      
      // Process each transaction with conflict resolution
      for (const tx of sortedTransactions) {
        try {
          // Skip transactions that have had too many attempts (> 5)
          if (tx.attempts && tx.attempts > 5) {
            console.warn(`Skipping transaction ${tx.txId} after ${tx.attempts} failed attempts`);
            skippedCount++;
            continue;
          }
          
          const docRef = doc(db, `users/${userId}/${tx.collection}/data`);
          
          // Check current server state first to avoid conflicts
          const docSnap = await getDoc(docRef, { source: 'server' });
          
          // Format data based on collection type
          let docData;
          if (tx.collection === 'deliveryLogs' || tx.type === 'logs') {
            docData = { 
              logs: tx.data,
              updatedAt: serverTimestamp() 
            };
          } else {
            docData = { 
              ...tx.data, 
              updatedAt: serverTimestamp() 
            };
          }
          
          // Apply the update with merge to avoid overwriting other fields
          await setDoc(docRef, docData, { merge: true });
          
          // Mark as successfully processed
          processedIds.push(tx.txId || `tx_${tx.timestamp}`);
          successCount++;
          
          // Update local cache with confirmation of sync
          if (docSnap.exists()) {
            const serverData = docSnap.data();
            try {
              const collectionName = tx.collection || 
                (tx.type === 'logs' ? 'deliveryLogs' : tx.type);
              
              if (collectionName) {
                const localDataKey = `${userId}-${collectionName}`;
                const localData = localStorage.getItem(localDataKey);
                
                if (localData) {
                  const parsedLocalData = JSON.parse(localData);
                  
                  // Update metadata while preserving data
                  localStorage.setItem(localDataKey, JSON.stringify({
                    ...parsedLocalData,
                    _syncMetadata: {
                      ...(parsedLocalData._syncMetadata || {}),
                      lastServerSync: Date.now(),
                      syncSource: 'server',
                      hasPendingWrites: false,
                      serverConfirmed: true
                    }
                  }));
                }
              }
            } catch (e) {
              console.error('Error updating local cache after sync:', e);
            }
          }
        } catch (err) {
          console.error(`Error processing transaction:`, err, tx);
          failedIds.push(tx.txId || `tx_${tx.timestamp}`);
          errorCount++;
          
          // Update attempt count
          tx.attempts = (tx.attempts || 0) + 1;
          tx.lastAttempt = Date.now();
          tx.lastError = err.message;
        }
      }
      
      // Update the pending transactions list
      if (processedIds.length > 0 || failedIds.length > 0) {
        // Keep only transactions that failed but haven't exceeded retry limit
        const remainingTx = sortedTransactions.filter(tx => {
          const txId = tx.txId || `tx_${tx.timestamp}`;
          const failed = failedIds.includes(txId);
          const tooManyAttempts = tx.attempts > 5;
          
          return failed && !tooManyAttempts;
        });
        
        if (remainingTx.length === 0) {
          localStorage.removeItem(pendingKey);
        } else {
          localStorage.setItem(pendingKey, JSON.stringify(remainingTx));
        }
      }
      
      return {
        success: true,
        count: transactions.length,
        successCount,
        errorCount,
        skippedCount
      };
    } catch (error) {
      console.error('Error processing pending transactions:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Specific methods for delivery logs
  subscribeToDeliveryLogs: (userId, callback) => {
    return syncData.subscribeToCollection(userId, 'deliveryLogs', (data, status) => {
      callback(data?.logs || [], status);
    });
  },
  
  saveDeliveryLogs: async (userId, logs) => {
    return syncData.saveToCollection(userId, 'deliveryLogs', { logs });
  },
  
  // Specific methods for settings
  subscribeToSettings: (userId, callback) => {
    return syncData.subscribeToCollection(userId, 'settings', (data, status) => {
      callback(data || {}, status);
    });
  },
  
  saveSettings: async (userId, settings) => {
    return syncData.saveToCollection(userId, 'settings', settings);
  },
  
  // Force refresh all data with improved cross-device sync
  forceRefreshAllData: async (userId) => {
    if (!navigator.onLine) return { success: false, reason: 'offline' };
    
    try {
      console.log('Starting force refresh of all data...');
      
      // First process any pending transactions to ensure our changes are on the server
      await syncData.processPendingTransactions(userId);
      
      // Wait for any pending writes to complete
      try {
        await waitForPendingWrites(db);
      } catch (err) {
        console.warn('Error waiting for pending writes:', err);
        // Continue anyway
      }
      
      const collections = ['deliveryLogs', 'settings'];
      const results = {};
      
      // Refresh all collections from server
      for (const collection of collections) {
        try {
          const docRef = doc(db, `users/${userId}/${collection}/data`);
          
          // Force a server read
          const docSnap = await getDoc(docRef, { source: 'server' });
          
          if (docSnap.exists()) {
            const serverData = docSnap.data();
            
            // Update localStorage with server data and metadata
            localStorage.setItem(`${userId}-${collection}`, JSON.stringify({
              ...serverData,
              _syncMetadata: {
                lastServerSync: Date.now(),
                syncSource: 'server',
                hasPendingWrites: false,
                refreshed: true
              }
            }));
            
            results[collection] = { success: true };
          } else {
            // Document doesn't exist - create it with default data
            const defaultData = collection === 'deliveryLogs' 
              ? { logs: [] } 
              : { theme: 'system' };
            
            await setDoc(docRef, {
              ...defaultData,
              updatedAt: serverTimestamp()
            });
            
            results[collection] = { success: true, created: true };
          }
        } catch (err) {
          console.error(`Error refreshing ${collection}:`, err);
          results[collection] = { success: false, error: err.message };
        }
      }
      
      // Clear any orphaned pending transactions after refresh
      try {
        const pendingKey = `${userId}-pendingTransactions`;
        const pendingTx = localStorage.getItem(pendingKey);
        
        if (pendingTx) {
          const transactions = JSON.parse(pendingTx);
          
          // Keep only recent transactions (< 1 hour old)
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          const recentTx = transactions.filter(tx => {
            const txTime = new Date(tx.timestamp).getTime();
            return txTime > oneHourAgo;
          });
          
          if (recentTx.length === 0) {
            localStorage.removeItem(pendingKey);
          } else if (recentTx.length < transactions.length) {
            localStorage.setItem(pendingKey, JSON.stringify(recentTx));
          }
        }
      } catch (e) {
        console.warn('Error cleaning up pending transactions:', e);
      }
      
      console.log('Force refresh completed:', results);
      
      return { 
        success: true,
        results
      };
    } catch (error) {
      console.error('Error force refreshing all data:', error);
      return { success: false, error: error.message };
    }
  }
};

export default app;