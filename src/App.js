import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { Navigate } from 'react-router-dom';

// This is now just a loader component that redirects to the proper router paths
function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  
  // Make sure theme is applied
  React.useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // Redirect to the appropriate route
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  } else {
    return <Navigate to="/" replace />;
  }
}

export default App;