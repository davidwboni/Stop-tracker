import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoutePlanner from './RoutePlanner';
import TabCoach from './TabCoach';

const RoutePlannerWrapper = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <TabCoach
        id="routes"
        title="Plan your round"
        body="Add your stops by address or postcode and we'll map them in order. Handy for working out the quickest way round your route."
      />
      <RoutePlanner />
    </>
  );
};

export default RoutePlannerWrapper;
