import React from 'react';
import { createBrowserRouter, Navigate, useNavigate } from 'react-router-dom';

// Layout
import Layout from '../components/Layout';

// Pages
import DashboardWrapper from '../components/DashboardWrapper';
import EntriesWrapper from '../components/EntriesWrapper';
import StatsPage from '../components/StatsPage';
import InvoicePage from '../components/InvoicePage';
import ErrorBoundary from '../components/ErrorBoundary';
import ProfileWrapper from '../components/ProfileWrapper';
import PaymentConfig from '../components/PaymentConfig';
import PaymentSettingsWrapper from '../components/PaymentSettingsWrapper';
import UpgradeToPro from '../components/UpgradeToPro';
import ContactUs from '../components/pages/ContactUs';
import PrivacyPolicy from '../components/pages/PrivacyPolicy';
import TermsOfService from '../components/pages/TermsOfService';
import LandingPage from '../components/LandingPage';
import Auth from '../components/Auth';

// Auth route protection
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

// Create wrapper components for public routes with navigation
const ContactUsPublic = () => {
  const navigate = useNavigate();
  return <ContactUs onBack={() => navigate('/')} />;
};

const PrivacyPolicyPublic = () => {
  const navigate = useNavigate();
  return <PrivacyPolicy onBack={() => navigate('/')} />;
};

const TermsOfServicePublic = () => {
  const navigate = useNavigate();
  return <TermsOfService onBack={() => navigate('/')} />;
};

// Create wrapper components for protected routes with navigation
const ContactUsProtected = () => {
  const navigate = useNavigate();
  return <ContactUs onBack={() => navigate('/app/dashboard')} />;
};

const PrivacyPolicyProtected = () => {
  const navigate = useNavigate();
  return <PrivacyPolicy onBack={() => navigate('/app/dashboard')} />;
};

const TermsOfServiceProtected = () => {
  const navigate = useNavigate();
  return <TermsOfService onBack={() => navigate('/app/dashboard')} />;
};

const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <PublicRoute />,
    children: [
      { index: true, element: <LandingPage onGetStarted={() => window.location.href = '/login'} onContactUs={() => window.location.href = '/contact'} onPrivacyPolicy={() => window.location.href = '/privacy'} onTermsOfService={() => window.location.href = '/terms'} /> },
      { path: 'login', element: <Auth /> },
      { path: 'contact', element: <ContactUsPublic /> },
      { path: 'privacy', element: <PrivacyPolicyPublic /> },
      { path: 'terms', element: <TermsOfServicePublic /> },
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
          { path: 'entries', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><EntriesWrapper /></React.Suspense></ErrorBoundary> },
          { path: 'invoice', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><InvoicePage /></React.Suspense></ErrorBoundary> },
          { path: 'stats', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><StatsPage /></React.Suspense></ErrorBoundary> },
          { path: 'profile', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><ProfileWrapper /></React.Suspense></ErrorBoundary> },
          { path: 'settings', element: <ErrorBoundary><React.Suspense fallback={<div>Loading...</div>}><PaymentSettingsWrapper /></React.Suspense></ErrorBoundary> },
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
