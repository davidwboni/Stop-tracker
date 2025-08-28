import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppFooter from '../components/AppFooter';

const PublicRoute = () => {
  const { user, loading } = useAuth();
  
  // Show loading indicator while auth state is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
      <AppFooter />
    </>
  );
};

export default PublicRoute;
