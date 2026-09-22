import React, { useRef } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { motion } from 'framer-motion';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SwipeHint from './SwipeHint';
import { useAuth } from '../contexts/AuthContext';
import SyncStatus from './SyncStatus';
import AppNavigation from './AppNavigation';
import AppFooter from './AppFooter';
import PayOnboarding from './PayOnboarding';
import { useData } from '../contexts/DataContext';

// Bottom-nav tab order, swiping left/right steps through these.
const TAB_ORDER = [
  '/app/dashboard',
  '/app/routes',
  '/app/invoice',
  '/app/check-pay',
  '/app/stats',
];

const Layout = () => {
  useAuth();
  const { needsOnboarding, completeOnboarding } = useData();
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

  // First-run gate: brand-new users set up their pay before entering the app.
  if (needsOnboarding) {
    return <PayOnboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#080c14] text-[#f5f7fb] flex flex-col pt-safe">
      <SyncStatus />

      <main
        className="w-full flex-grow overflow-y-auto touch-manipulation"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Full-width scroll area; an inner block owns the max-width + centering
            so it stays centred on iOS WebKit (a flex item with max-width can
            left-bias under align-items:stretch). */}
        <div className="w-full max-w-6xl mx-auto pt-5 pb-24 px-4">
          <ErrorBoundary>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ willChange: 'opacity, transform' }}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
          <AppFooter />
        </div>
      </main>

      <SwipeHint />
      <AppNavigation className="flex-shrink-0 pb-safe" />

    </div>
  );
};

export default Layout;
