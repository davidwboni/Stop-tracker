import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db } from "../services/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { ChevronDown, ChevronUp, Sun, Moon } from "lucide-react";

const MAX_FILE_SIZE_MB = 5;

const Profile = ({ userId, onLogout, onHome }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const storage = getStorage();

  // Fetch user details on component mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserDetails({
            ...userSnap.data(),
            photoURL:
              userSnap.data().photoURL || auth.currentUser?.photoURL || "/default-avatar.png",
          });
        } else {
          await setDoc(userRef, {
            name: auth.currentUser.displayName || "Anonymous",
            email: auth.currentUser.email,
            role: "free",
            photoURL: auth.currentUser.photoURL || "/default-avatar.png",
          });
          setUserDetails({
            name: auth.currentUser.displayName || "Anonymous",
            email: auth.currentUser.email,
            role: "free",
            photoURL: auth.currentUser.photoURL || "/default-avatar.png",
          });
        }
      } catch (err) {
        console.error("Error fetching user details:", err.message);
        setError("Failed to fetch user details. Please try again.");
      }
    };

    fetchUserDetails();
  }, [userId]);

  // Fetch system/user theme preference
  useEffect(() => {
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, []);

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout && onLogout();
    } catch (err) {
      setError("Failed to log out. Please try again.");
    }
  };

  // Handle profile picture upload
  const handleUpload = async (file) => {
    if (!file) {
      setError("No file selected for upload.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const storageRef = ref(storage, `profile-pictures/${userId}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { photoURL: downloadURL });

      setUserDetails((prev) => ({ ...prev, photoURL: downloadURL }));
    } catch (err) {
      setError("Failed to upload profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-white p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex flex-col items-center gap-4 text-[var(--text)]">
              <label
                htmlFor="profile-picture-upload"
                className="cursor-pointer group relative"
              >
                <img
                  src={userDetails.photoURL}
                  alt="Profile"
                  className={`w-24 h-24 rounded-full object-cover transition-opacity ${
                    uploading ? "opacity-50" : "opacity-100"
                  }`}
                />
                <div className="absolute bottom-0 w-full bg-black bg-opacity-50 text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to upload
                </div>
              </label>
              <input
                id="profile-picture-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files[0])}
                className="hidden"
              />
              {uploading && <p className="text-sm text-[var(--text-muted)]">Uploading...</p>}
              <span>{userDetails.name || "User"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              <p className="text-[var(--text)]">{userDetails.email}</p>
              <p className="text-sm text-[var(--primary)]">
                Role: {userDetails.role.toUpperCase()}
              </p>
            </div>
            {/* Dropdown Menu */}
            <div className="relative">
              <Button
                className="flex items-center justify-between w-full text-[var(--text)] border-[var(--primary)]"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                Profile Actions
                {isDropdownOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
              {isDropdownOpen && (
                <div className="absolute mt-2 w-full bg-white dark:bg-[var(--background-muted)] shadow-lg rounded-lg overflow-hidden">
                  <Button
                    onClick={onHome}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Home
                  </Button>
                  <Button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Log Out
                  </Button>
                  <Button
                    onClick={toggleTheme}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    {isDark ? (
                      <>
                        <Moon className="w-4 h-4" /> Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="w-4 h-4" /> Light Mode
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;