import React, { useState, useRef } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { motion } from 'framer-motion';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SyncStatus from './SyncStatus';
import AppNavigation from './AppNavigation';
import AppFooter from './AppFooter';
import FloatingActionButton from './FloatingActionButton';
import PayOnboarding from './PayOnboarding';
import { useData } from '../contexts/DataContext';
import { calculateDayEarnings } from '../features/payperiod/payStructure';

// Bottom-nav tab order — swiping left/right steps through these.
const TAB_ORDER = [
  '/app/dashboard',
  '/app/entries',
  '/app/routes',
  '/app/invoice',
  '/app/stats',
  '/app/profile',
];

const Layout = () => {
  const { user } = useAuth();
  const { logs, updateLogs, paymentConfig, needsOnboarding, completeOnboarding } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef(null);

  const onTouchStart = (e) => {
    // Don't hijack pans on the map or any horizontal scroller.
    if (e.target.closest && e.target.closest('.leaflet-container, [data-no-swipe]')) {
      touchStart.current = null;
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    // Require a clear, mostly-horizontal swipe.
    if (Math.abs(dx) < 70 || Math.abs(dy) > 55) return;
    let curr = TAB_ORDER.findIndex((p) => location.pathname.startsWith(p));
    if (curr < 0) curr = 0; // /app index → treat as dashboard
    const next = dx < 0 ? curr + 1 : curr - 1;
    if (next >= 0 && next < TAB_ORDER.length) {
      if (navigator.vibrate) navigator.vibrate(8);
      navigate(TAB_ORDER[next]);
    }
  };

  // Handle quick entry from floating action button
  const handleQuickEntry = async (entryData) => {
    try {
      // Model-aware total: uses stops/miles/hours per the active pay structure,
      // plus any extra. Matches the daily form and the FAB.
      const total =
        calculateDayEarnings(paymentConfig, {
          quantity: parseFloat(entryData.stops) || 0,
          miles: parseFloat(entryData.miles) || 0,
        }) + (parseFloat(entryData.extra) || 0);

      const newEntry = {
        id: Date.now(),
        ...entryData,
        total,
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

  // First-run gate: brand-new users set up their pay before entering the app.
  if (needsOnboarding) {
    return <PayOnboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/20 flex flex-col pt-safe">
      <SyncStatus />

      <main
        className="max-w-6xl mx-auto pt-8 pb-8 px-4 flex-grow overflow-y-auto touch-manipulation"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ErrorBoundary>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </ErrorBoundary>
        <AppFooter />
      </main>

      <AppNavigation className="flex-shrink-0 pb-safe" />

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
