import React, { useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SyncStatus from './SyncStatus';
import AppNavigation from './AppNavigation';
import AppFooter from './AppFooter';
import PayOnboarding from './PayOnboarding';
import { useData } from '../contexts/DataContext';

const Layout = () => {
  useAuth();
  const { needsOnboarding, completeOnboarding } = useData();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);
  // First-run gate: brand-new users set up their pay before entering the app.
  if (needsOnboarding) {
    return <PayOnboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#080c14] text-[#f5f7fb] flex flex-col pt-safe">
      <SyncStatus />

      <main
        className="w-full flex-grow overflow-y-auto touch-manipulation"
      >
        {/* Full-width scroll area; an inner block owns the max-width + centering
            so it stays centred on iOS WebKit (a flex item with max-width can
            left-bias under align-items:stretch). */}
        <div className="w-full max-w-6xl mx-auto pt-3 pb-24 px-4">
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

      <AppNavigation className="flex-shrink-0 pb-safe" />

    </div>
  );
};

export default Layout;
