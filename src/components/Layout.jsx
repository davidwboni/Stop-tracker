import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SyncStatus from './SyncStatus';
import AppNavigation from './AppNavigation';
import AppFooter from './AppFooter';
import FloatingActionButton from './FloatingActionButton';
import { useData } from '../contexts/DataContext';

const Layout = () => {
  const { user } = useAuth();
  const { logs, updateLogs, paymentConfig } = useData();
  const navigate = useNavigate();

  // Handle quick entry from floating action button
  const handleQuickEntry = async (entryData) => {
    try {
      // Calculate earnings based on payment config
      const calculateEarnings = (stops, extra = 0) => {
        if (!paymentConfig) return stops * 1.98 + extra; // fallback rate
        
        const { cutoffPoint = 110, rateBeforeCutoff = 1.98, rateAfterCutoff = 1.48 } = paymentConfig;
        
        let total = 0;
        if (stops <= cutoffPoint) {
          total = stops * rateBeforeCutoff;
        } else {
          total = cutoffPoint * rateBeforeCutoff + (stops - cutoffPoint) * rateAfterCutoff;
        }
        
        return total + extra;
      };

      const newEntry = {
        id: Date.now(),
        ...entryData,
        total: calculateEarnings(entryData.stops, entryData.extra),
        timestamp: new Date().toISOString(),
      };
      
      const updatedLogs = [...(logs || []), newEntry].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      await updateLogs(updatedLogs);
      
      // Add haptic feedback for success
      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
      
    } catch (error) {
      console.error('Error adding quick entry:', error);
      // Add haptic feedback for error
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/20 flex flex-col">
      <SyncStatus />
      
      <main className="max-w-6xl mx-auto pt-8 pb-8 px-4 flex-grow overflow-y-auto">
        <ErrorBoundary>
          <div className="transition-all duration-500 ease-out">
            <Outlet />
          </div>
        </ErrorBoundary>
        <AppFooter />
      </main>
      
      <AppNavigation className="flex-shrink-0" />
      
      {/* Floating Action Button for Quick Entry */}
      {user && (
        <FloatingActionButton 
          onAddEntry={handleQuickEntry}
          isVisible={true}
        />
      )}
    </div>
  );
};

export default Layout;
