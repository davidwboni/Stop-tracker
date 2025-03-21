import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { Menu } from "@headlessui/react";
import { ChevronDown, User, LogOut, Home, Star, Sun, Moon, Settings } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "./services/firebase";
import { useTheme } from "./contexts/ThemeContext";
import ModernDashboard from "./components/ModernDashboard";
import Auth from "./components/Auth";
import LandingPage from "./components/LandingPage";
import Profile from "./components/Profile";
import UpgradeToPro from "./components/UpgradeToPro";
import "./App.css";

function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAuth, setShowAuth] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [profilePic, setProfilePic] = useState(user?.photoURL || "/default-avatar.png");

  // Update profile picture when user changes
  useEffect(() => {
    if (user?.photoURL) {
      setProfilePic(user.photoURL);
    }
  }, [user]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Reset auth view when user logs out
  useEffect(() => {
    if (!user && !isSigningOut) {
      setShowAuth(false);
    }
  }, [user, isSigningOut]);

  // Handle sign out
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out:", error.message);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Handle upgrade to Pro
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

  // Menu items for the dropdown
  const menuItems = [
    { key: "dashboard", label: "Home", icon: Home },
    { key: "profile", label: "Profile", icon: User },
    { key: "settings", label: "Settings", icon: Settings },
    { key: "upgrade", label: "Upgrade to Pro", icon: Star },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Not logged in - show landing page or auth
  if (!user) {
    if (showAuth) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 px-4">
          <div className="absolute top-4 right-4">
            <button
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <LandingPage onGetStarted={() => setShowAuth(true)} />
      </div>
    );
  }

  // Logged in - show app interface
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-md dark:from-blue-600 dark:to-blue-700">
        <div className="max-w-6xl mx-auto py-4 px-4 flex justify-between items-center">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold text-white cursor-pointer"
              onClick={() => setCurrentPage("dashboard")}
            >
              Stop Tracker
            </h1>
            <p className="text-blue-100 mt-1 text-sm md:text-base">
              Track your delivery stats efficiently
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-colors">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <ChevronDown className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-50">
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
        {currentPage === "dashboard" && <ModernDashboard />}
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
        {currentPage === "settings" && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            <p>App settings will be available here in a future update.</p>
          </div>
        )}
        {currentPage === "upgrade" && <UpgradeToPro onUpgrade={handleUpgradeToPro} />}
      </main>
    </div>
  );
}

export default App;