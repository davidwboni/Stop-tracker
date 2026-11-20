import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signInAnonymously,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
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
  storageBucket: "stop-tracker-v1.firebasestorage.app",
  messagingSenderId: "183138392477",
  appId: "1:183138392477:web:408e779b7276ed51897774",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app);

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

// ==== Platform Detection ====

/**
 * Detect if running on native platform (Capacitor)
 */
const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};


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
 * Sign in with Google.
 * On Android (Capacitor): uses the native Google Sign-In SDK via @capacitor-firebase/authentication,
 * then exchanges the idToken for a Firebase credential, no browser opens.
 * On web: uses the standard Firebase popup flow.
 */
export const signInWithGoogle = async () => {
  try {
    let user;

    if (isNativePlatform()) {
      const { credential: nativeCredential } = await FirebaseAuthentication.signInWithGoogle();
      const firebaseCredential = GoogleAuthProvider.credential(nativeCredential?.idToken);
      const webResult = await signInWithCredential(auth, firebaseCredential);
      user = webResult.user;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      user = result.user;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL || null,
        role: "free",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
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
 * Sign in anonymously (Guest mode)
 * Uses Firebase anonymous authentication
 */
export const signInAsGuest = async () => {
  try {
    const isNative = isNativePlatform();

    if (isNative) {
      // Use Capacitor Firebase Authentication plugin on native platforms
      await FirebaseAuthentication.signInAnonymously();

      // Get the Firebase user from the web SDK auth instance
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Create user document for guest
        await setDoc(doc(db, "users", currentUser.uid), {
          email: "guest@stoptracker.com",
          displayName: "Guest User",
          photoURL: null,
          role: "guest",
          isGuest: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });

        return { user: currentUser };
      }

      return { error: new Error("Guest authentication failed") };
    } else {
      // Use web SDK on web
      const result = await signInAnonymously(auth);
      const user = result.user;

      // Create user document for guest
      await setDoc(doc(db, "users", user.uid), {
        email: "guest@stoptracker.com",
        displayName: "Guest User",
        photoURL: null,
        role: "guest",
        isGuest: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      return { user };
    }
  } catch (error) {
    console.error("Error signing in as guest:", error);
    return { error };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { error };
  }
};

/**
 * Log out user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    // Clear any localStorage guest session data
    localStorage.removeItem('guestSession');
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
const pendingSyncs = new Map();
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
    
    // Use the shared queue processor so reconnects cannot discard failed writes.
    const processPendingTransactions = async (uid) => {
      const result = await syncData.processPendingTransactions(uid);
      return result.success;
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
      if (navigator.onLine && !localStorage.getItem(`${userId}-pendingTransactions`) && !pendingSyncs.has(userId)) {
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
          try {
            const docSnap = await getDocFromServer(docRef);
            if (docSnap.exists() && !localStorage.getItem(`${userId}-pendingTransactions`)) {
              localStorage.setItem(`${userId}-${collection}`, JSON.stringify(docSnap.data()));
            }
          } catch (readError) {
            // The write already succeeded; a failed confirmation read must not
            // enqueue an old snapshot that could overwrite a newer device.
            console.warn(`Could not confirm ${collection} after save:`, readError);
          }
          
          return { success: true, isOnline: true };
        } catch (err) {
          console.error(`Error saving ${collection} to Firestore:`, err);
          // Continue with offline handling - data is already in localStorage
          // Queue the cached change below when the server write fails.
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
        return { success: false, isOnline: false };
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
    if (pendingSyncs.has(userId)) return pendingSyncs.get(userId);
    const run = (async () => {
      const key = `${userId}-pendingTransactions`;
      try {
        const queued = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(queued)) throw new Error('Invalid pending queue');
        // Assign IDs to older queue entries before awaiting any network operation.
        const items = queued.map(tx => ({ ...tx, queueId: tx.queueId ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}` }));
        if (items.length) localStorage.setItem(key, JSON.stringify(items));
        let completed = 0;
        for (const tx of items) {
          const name = tx.collection || (tx.type === 'logs' ? 'deliveryLogs' : tx.type);
          const payload = name === 'deliveryLogs'
            ? { logs: Array.isArray(tx.data) ? tx.data : tx.data?.logs }
            : tx.data;
          if (!name || !payload || (name === 'deliveryLogs' && !Array.isArray(payload.logs))) {
            throw new Error('Invalid pending transaction');
          }
          // Stop at the first failure: later snapshots must not overtake it.
          await setDoc(doc(db, `users/${userId}/${name}/data`),
            { ...payload, updatedAt: serverTimestamp() }, { merge: true });
          const current = JSON.parse(localStorage.getItem(key) || '[]');
          const remaining = current.filter(item => item.queueId !== tx.queueId);
          if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
          else localStorage.removeItem(key);
          completed++;
        }
        return { success: true, count: items.length, successCount: completed };
      } catch (error) {
        console.error('Error processing pending transactions:', error);
        return { success: false, error: error.message };
      }
    })();
    pendingSyncs.set(userId, run);
    try { return await run; } finally { pendingSyncs.delete(userId); }
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
      const pending = await syncData.processPendingTransactions(userId);
      if (!pending.success || localStorage.getItem(`${userId}-pendingTransactions`)) {
        return { success: false, reason: 'pending-transactions' };
      }
      
      // Wait for any pending writes to complete
      try {
        await waitForPendingWrites(db);
      } catch (err) {
        console.warn('Error waiting for pending writes:', err);
        // Continue anyway
      }
      
      const collections = ['deliveryLogs', 'settings'];
      const results = {};
      let refreshedLogs;
      
      // Refresh all collections from server
      for (const collection of collections) {
        try {
          const docRef = doc(db, `users/${userId}/${collection}/data`);
          
          // Force a server read
          const docSnap = await getDocFromServer(docRef);
          if (localStorage.getItem(`${userId}-pendingTransactions`)) {
            throw new Error('New changes are waiting to sync');
          }
          
          if (docSnap.exists()) {
            const serverData = docSnap.data();
            if (collection === 'deliveryLogs') {
              const logs = serverData.logs;
              refreshedLogs = Array.isArray(logs) ? logs : logs?.logs;
              if (!Array.isArray(refreshedLogs)) throw new Error('Invalid delivery log data');
            }
            
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
            // A refresh must not create a document or overwrite a concurrent save.
            if (collection === 'deliveryLogs') refreshedLogs = [];
            results[collection] = { success: true, missing: true };
          }
        } catch (err) {
          console.error(`Error refreshing ${collection}:`, err);
          results[collection] = { success: false, error: err.message };
        }
      }
      
      console.log('Force refresh completed:', results);
      
      return { 
        success: Object.values(results).every(result => result.success),
        results,
        logs: refreshedLogs
      };
    } catch (error) {
      console.error('Error force refreshing all data:', error);
      return { success: false, error: error.message };
    }
  }
};

export default app;
