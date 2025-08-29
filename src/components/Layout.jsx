import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { User, LogOut, Home, Star, Sun, Moon, Settings, Mail, Shield } from 'lucide-react';
import SyncStatus from './SyncStatus';
import AppNavigation from './AppNavigation';
import AppFooter from './AppFooter';
import { syncData } from '../services/firebase';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [profilePic, setProfilePic] = useState(user?.photoURL || "/default-avatar.png");
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };
  
  // Force sync all data
  const handleForceSync = async () => {
    if (!user?.uid) return;
    
    setSyncing(true);
    try {
      await syncData.processPendingTransactions(user.uid);
      await syncData.forceRefreshAllData(user.uid);
      alert("Data synchronized successfully!");
    } catch (err) {
      console.error("Error syncing data:", err);
      alert("Failed to sync data. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/20 flex flex-col">
      <SyncStatus />
      <header className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-apple-card">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-indigo-500/10"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-500/5 rounded-full blur-xl"></div>
        
        <div className="relative max-w-6xl mx-auto py-6 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => navigate('/app/dashboard')}
              >
                Stop Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base font-medium">
                Track your delivery stats efficiently
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={handleForceSync} 
                disabled={syncing}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-2 shadow-apple-button hover:shadow-apple-card transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Sync Data
                  </>
                )}
              </button>
            )}
            
            <div className="relative group">
              <img
                src={profilePic}
                alt="Profile"
                className="w-10 h-10 rounded-2xl object-cover cursor-pointer ring-2 ring-blue-200/50 dark:ring-blue-700/50 group-hover:ring-blue-300 dark:group-hover:ring-blue-600 transition-all duration-300 transform group-hover:scale-110 shadow-apple-button"
                onClick={() => navigate('/app/profile')}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto pt-8 pb-8 px-4 flex-grow overflow-y-auto" style={{ marginTop: '1rem' }}>
        <ErrorBoundary>
          <div className="transition-all duration-500 ease-out">
            <Outlet />
          </div>
        </ErrorBoundary>
        <AppFooter />
      </main>
      
      <AppNavigation className="flex-shrink-0" />
    </div>
  );
};

export default Layout;
