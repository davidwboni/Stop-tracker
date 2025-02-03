import React, { useState, useEffect } from "react";
import StopTracker from "./components/StopTracker";
import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import Profile from "./components/Profile";
import UpgradeToPro from "./components/UpgradeToPro";
import { useAuth } from "./contexts/AuthContext";
import { auth, db } from "./services/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Menu } from "@headlessui/react";
import { ChevronDown, User, LogOut, Home, Star, Sun, Moon } from "lucide-react";
import "./App.css";
import { useTheme } from "./contexts/ThemeContext";

function AppContent() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Add theme context
  const [showAuth, setShowAuth] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [profilePic, setProfilePic] = useState(user?.photoURL || "/default-avatar.png");

  useEffect(() => {
    if (!user && !isSigningOut) {
      setShowAuth(false);
    }
  }, [user, isSigningOut]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error.message);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { role: "pro" });
      alert("You are now a Pro user!");
      setCurrentPage("dashboard");
    } catch (err) {
      console.error("Error upgrading to Pro:", err.message);
      alert("Failed to upgrade. Please try again.");
    }
  };

  const menuItems = [
    { key: "dashboard", label: "Home", icon: Home },
    { key: "profile", label: "Profile", icon: User },
    { key: "upgrade", label: "Upgrade to Pro", icon: Star },
  ];

  if (!user) {
    if (showAuth) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 px-4">
          <div className="absolute top-4 right-4">
            <button
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-center min-h-screen">
            <Auth onBack={() => setShowAuth(false)} />
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-10">
          <button
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-800"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <LandingPage onLoginClick={() => setShowAuth(true)} onSignupClick={() => setShowAuth(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg dark:from-purple-800 dark:to-purple-900">
        <div className="max-w-6xl mx-auto py-6 px-4 flex justify-between items-center">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold text-white cursor-pointer"
              onClick={() => setCurrentPage("dashboard")}
            >
              Stop Tracker
            </h1>
            <p className="text-purple-100 mt-1 text-sm md:text-base">
              Track your delivery stats efficiently
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <ChevronDown className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2">
                {menuItems.map((item) => (
                  <Menu.Item key={item.key}>
                    {({ active }) => (
                      <button
                        onClick={() => setCurrentPage(item.key)}
                        className={`${
                          active ? "bg-gray-100 dark:bg-gray-700" : ""
                        } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                      >
                        <item.icon className="w-5 h-5 mr-2" />
                        {item.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={toggleTheme}
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-700" : ""
                      } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      {theme === "dark" ? <Sun className="w-5 h-5 mr-2" /> : <Moon className="w-5 h-5 mr-2" />}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      className={`${
                        active ? "bg-gray-100 dark:bg-gray-700" : ""
                      } flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Sign Out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto py-6 px-4">
        {currentPage === "dashboard" && <StopTracker />}
        {currentPage === "profile" && (
          <Profile
            userId={user.uid}
            onLogout={() => {
              setCurrentPage("dashboard");
              handleSignOut();
            }}
            onHome={() => setCurrentPage("dashboard")}
            updateProfilePic={(newPic) => setProfilePic(newPic)}
          />
        )}
        {currentPage === "upgrade" && <UpgradeToPro onUpgrade={handleUpgradeToPro} />}
      </main>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;