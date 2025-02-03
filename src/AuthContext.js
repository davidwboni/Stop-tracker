import React, { createContext, useState, useContext, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    role: null,
    token: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Retrieve user token for API integrations
          let token = null;
          try {
            token = await getIdToken(currentUser);
          } catch (tokenError) {
            console.error("Failed to retrieve ID token:", tokenError);
          }

          // Fetch user role from Firestore
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);
          const role = userDoc.exists() ? userDoc.data().role || "free" : "free";

          setAuthState({ user: currentUser, role, token });
        } else {
          setAuthState({ user: null, role: null, token: null });
        }
      } catch (err) {
        console.error("Error during authentication:", err);
        setError("Failed to authenticate. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        role: authState.role,
        token: authState.token,
        loading,
        error,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};