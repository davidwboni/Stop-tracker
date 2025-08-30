import React, { createContext, useState, useContext, useEffect } from "react";
import { 
  auth, 
  db, 
  signUpWithEmail, 
  loginWithEmail,
  signInWithGoogle,
  logoutUser,
  getCurrentUser
} from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check for guest session
  useEffect(() => {
    const checkGuestSession = () => {
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        try {
          const guestData = JSON.parse(guestSession);
          setUser({
            uid: guestData.guestId,
            email: guestData.email,
            displayName: guestData.displayName,
            photoURL: null,
            role: "guest",
            isGuest: true
          });
          setIsNewUser(false);
          setLoading(false);
          return true;
        } catch (err) {
          console.error("Error parsing guest session:", err);
          localStorage.removeItem('guestSession');
        }
      }
      return false;
    };

    // Check for guest session first
    if (checkGuestSession()) {
      return;
    }

    // Then listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            // Existing user - merge auth and Firestore data
            const userData = userSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || "User",
              photoURL: firebaseUser.photoURL || userData.photoURL,
              role: userData.role || "free",
              createdAt: userData.createdAt,
            });
            
            // Update last login timestamp
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            setIsNewUser(false);
          } else {
            // New user - create profile
            const newUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "User",
              photoURL: firebaseUser.photoURL || null,
              role: "free",
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };
            
            await setDoc(userRef, newUserData);
            setUser(newUserData);
            setIsNewUser(true);
          }
        } else {
          // Logged out - but check for guest session again
          const guestSession = localStorage.getItem('guestSession');
          if (guestSession) {
            try {
              const guestData = JSON.parse(guestSession);
              setUser({
                uid: guestData.guestId,
                email: guestData.email,
                displayName: guestData.displayName,
                photoURL: null,
                role: "guest",
                isGuest: true
              });
            } catch (err) {
              console.error("Error parsing guest session:", err);
              localStorage.removeItem('guestSession');
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Error in auth state change:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Sign up
  const signup = async (email, password, displayName) => {
    setError(null);
    try {
      const result = await signUpWithEmail(email, password, displayName);
      if (result.error) {
        throw result.error;
      }
      return true;
    } catch (err) {
      setError(err.message || "Failed to create account");
      return false;
    }
  };

  // Login
  const login = async (email, password) => {
    setError(null);
    try {
      const result = await loginWithEmail(email, password);
      if (result.error) {
        throw result.error;
      }
      return true;
    } catch (err) {
      setError(err.message || "Failed to login");
      return false;
    }
  };

  // Google auth
  const loginWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }
      return true;
    } catch (err) {
      setError(err.message || "Failed to login with Google");
      return false;
    }
  };

  // Logout
  const logout = async () => {
    setError(null);
    try {
      // Check if it's a guest session
      if (user?.isGuest) {
        localStorage.removeItem('guestSession');
        setUser(null);
        return true;
      }
      
      // Otherwise, logout from Firebase
      await logoutUser();
      return true;
    } catch (err) {
      setError(err.message || "Failed to logout");
      return false;
    }
  };

  // Reset error
  const resetError = () => {
    setError(null);
  };

  // Auth context value
  const value = {
    user,
    loading,
    error,
    isNewUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}