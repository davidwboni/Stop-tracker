import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Show loading indicator while auth state is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }
  
  // Redirect authenticated users back to a safe in-app destination when one
  // was requested (for example, returning from the Pro sign-in prompt).
  if (user) {
    const params = new URLSearchParams(location.search);
    const requested = params.get("returnTo") || sessionStorage.getItem("stopTrackerReturnAfterAuth") || "";
    const safeReturn = requested.startsWith("/app/") ? requested : "/app/dashboard";
    sessionStorage.removeItem("stopTrackerReturnAfterAuth");
    return <Navigate to={safeReturn} replace />;
  }
  
  // Public screens own their own compact layout; no legacy global footer.
  return <Outlet />;
};

export default PublicRoute;
