import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncData } from '../services/firebase';

/**
 * Component to display and manage sync status
 */
function SyncStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Check sync status and update UI
  useEffect(() => {
    if (!user?.uid) return;

    // Function to check pending transactions
    const checkSyncStatus = async () => {
      try {
        // Get pending transaction count
        const pendingKey = `${user.uid}-pendingTransactions`;
        const pendingTx = localStorage.getItem(pendingKey);
        
        if (pendingTx) {
          const transactions = JSON.parse(pendingTx);
          setPendingCount(transactions.length);
          
          if (transactions.length > 0) {
            setStatus('pending');
            setIsVisible(true);
            
            // If online and have pending transactions, try to sync
            if (navigator.onLine) {
              await syncData.processPendingTransactions(user.uid);
              // Check again after attempted sync
              const updatedTx = localStorage.getItem(pendingKey);
              if (updatedTx) {
                const updatedTransactions = JSON.parse(updatedTx);
                setPendingCount(updatedTransactions.length);
                if (updatedTransactions.length === 0) {
                  setStatus('synced');
                  setLastSync(new Date());
                  // Hide status after successful sync
                  setTimeout(() => setIsVisible(false), 3000);
                }
              }
            }
          } else {
            setStatus('synced');
            setTimeout(() => setIsVisible(false), 3000);
          }
        } else {
          setPendingCount(0);
          setStatus('synced');
          // Don't hide immediately if we just determined we're synced
          if (status !== 'synced') {
            setLastSync(new Date());
            setTimeout(() => setIsVisible(false), 3000);
          }
        }
      } catch (err) {
        console.error('Error checking sync status:', err);
        setStatus('error');
        setIsVisible(true);
      }
    };
    
    // Check immediately and then periodically
    checkSyncStatus();
    
    const interval = setInterval(checkSyncStatus, 30000); // Check every 30 seconds
    
    // Listen for online/offline events
    const handleOnline = () => {
      setStatus('syncing');
      setIsVisible(true);
      checkSyncStatus();
    };
    
    const handleOffline = () => {
      setStatus('offline');
      setIsVisible(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, status]);

  // Don't render if not visible
  if (!isVisible || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${
        status === 'synced' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
        status === 'syncing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
        status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
        status === 'offline' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' :
        'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
      }`}>
        <div className={`w-3 h-3 rounded-full ${
          status === 'synced' ? 'bg-green-500' :
          status === 'syncing' ? 'bg-blue-500 animate-pulse' :
          status === 'pending' ? 'bg-yellow-500' :
          status === 'offline' ? 'bg-gray-500' :
          'bg-red-500'
        }`} />
        <div>
          {status === 'synced' && 'All data synced'}
          {status === 'syncing' && 'Syncing data...'}
          {status === 'pending' && `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`}
          {status === 'offline' && 'You are offline'}
          {status === 'error' && 'Sync error occurred'}
        </div>
        {lastSync && status === 'synced' && (
          <div className="text-xs opacity-80">
            Last sync: {lastSync.toLocaleTimeString()}
          </div>
        )}
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-2 text-xs opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default SyncStatus;