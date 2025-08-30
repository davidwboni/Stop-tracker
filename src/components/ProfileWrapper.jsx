import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Profile from './Profile';

const ProfileWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Wrapper function to handle profile picture updates
  const handleProfilePicUpdate = (newPicUrl) => {
    // This is just a placeholder as we don't need to update state anymore
    console.log("Profile picture updated:", newPicUrl);
  };
  
  // Handle logout and navigation
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  const handleHome = () => {
    navigate('/app/dashboard');
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-500">User not authenticated. Please log in.</p>
          <button 
            onClick={() => navigate('/login')} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Profile 
      userId={user.uid}
      user={user}  // Pass the full user object so Profile can handle guests
      onLogout={handleLogout}
      onHome={handleHome}
      updateProfilePic={handleProfilePicUpdate}
    />
  );
};

export default ProfileWrapper;