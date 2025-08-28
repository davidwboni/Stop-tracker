import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout
import Layout from '../components/Layout';

// Pages
import DashboardWrapper from '../components/DashboardWrapper';
import EntriesWrapper from '../components/EntriesWrapper';
import StatsOverview from '../components/StatsOverview';
import ErrorBoundary from '../components/ErrorBoundary';
import ProfileWrapper from '../components/ProfileWrapper';
import PaymentConfig from '../components/PaymentConfig';
import UpgradeToPro from '../components/UpgradeToPro';
import ContactUs from '../components/pages/ContactUs';
import PrivacyPolicy from '../components/pages/PrivacyPolicy';
import TermsOfService from '../components/pages/TermsOfService';
import LandingPage from '../components/LandingPage';
import Auth from '../components/Auth';
import WeeklyStats from '../components/WeeklyStats';

// Auth route protection
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <PublicRoute />,
    children: [
      { index: true, element: <LandingPage onGetStarted={() => window.location.href = '/login'} onContactUs={() => window.location.href = '/contact'} onPrivacyPolicy={() => window.location.href = '/privacy'} onTermsOfService={() => window.location.href = '/terms'} /> },
      { path: 'login', element: <Auth /> },
      { path: 'contact', element: <ContactUs /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <TermsOfService /> },
    ],
  },
  
  // Protected routes
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/app/dashboard" /> },
          { path: 'dashboard', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><DashboardWrapper /></React.Suspense></ErrorBoundary> },
          { path: 'profile', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><ProfileWrapper /></React.Suspense></ErrorBoundary> },
          { path: 'settings', element: <PaymentConfig config={{}} /> },
          { path: 'upgrade', element: <UpgradeToPro /> },
          { path: 'contact', element: <ContactUs /> },
          { path: 'privacy', element: <PrivacyPolicy /> },
          { path: 'terms', element: <TermsOfService /> },
        ],
      },
    ],
  },
  
  // Fallback route
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
