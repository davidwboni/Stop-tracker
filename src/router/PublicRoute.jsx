import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppFooter from '../components/AppFooter';

const PublicRoute = () => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  // The landing page is an app-style first-run screen that must fit one screen
  // and carries its own Privacy/Terms/Contact links, so the site footer would
  // both duplicate them and push the page into scrolling.
  const isLanding = pathname === '/';

  // Show loading indicator while auth state is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  // Redirect to app if already authenticated
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  // Render public routes with footer if not authenticated
  return (
    <>
      <Outlet />
      {!isLanding && <AppFooter />}
    </>
  );
};

export default PublicRoute;
