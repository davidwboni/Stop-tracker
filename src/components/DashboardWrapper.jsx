import React from 'react';
import { useData } from '../contexts/DataContext';
import SimpleDashboard from './SimpleDashboard';

const DashboardWrapper = () => {
  const { logs, updateLogs, loading } = useData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <SimpleDashboard logs={logs} updateLogs={updateLogs} />;
};

export default DashboardWrapper;