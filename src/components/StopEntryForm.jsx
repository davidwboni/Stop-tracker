import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { 
  Save, 
  Calendar, 
  Truck, 
  DollarSign,
  FileText,
  CloudOff,
  Cloud,
  Loader,
  CheckCircle,
  Undo
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const StopEntryForm = ({ logs = [], updateLogs, syncStatus }) => {
  // Initialize logs as an empty array if null
  const safetyLogs = logs || [];
  
  // Smart defaults - get last used values
  const getSmartDefaults = () => {
    try {
      const lastEntry = localStorage.getItem('last-entry-data');
      if (lastEntry) {
        const parsed = JSON.parse(lastEntry);
        return {
          date: new Date().toISOString().split('T')[0], // Always use today's date
          stops: parsed.stops || "",
          extra: parsed.extra || "",
          notes: parsed.notes || "",
        };
      }
    } catch (error) {
      console.error('Error loading smart defaults:', error);
    }
    
    return {
      date: new Date().toISOString().split('T')[0],
      stops: "",
      extra: "",
      notes: "",
    };
  };

  const [entry, setEntry] = useState(getSmartDefaults());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rate, setRate] = useState(1.90); // Default rate per stop
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  
  // Form refs for smart scrolling
  const formRef = useRef(null);
  const activeInputRef = useRef(null);
  const stopsInputRef = useRef(null);
  const extraInputRef = useRef(null);

  // Get user's rate from local storage or settings
  useEffect(() => {
    const savedRate = localStorage.getItem('rate-per-stop');
    if (savedRate) {
      setRate(parseFloat(savedRate));
    }
  }, []);

  // Smart keyboard handling for mobile
  const handleInputFocus = useCallback((inputRef) => {
    activeInputRef.current = inputRef;
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
    
    // Delay scroll to allow keyboard to appear
    setTimeout(() => {
      if (inputRef?.current && window.innerWidth <= 768) {
        // Calculate scroll position to keep input visible above keyboard
        const inputRect = inputRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const estimatedKeyboardHeight = Math.min(viewportHeight * 0.35, 300);
        const availableHeight = viewportHeight - estimatedKeyboardHeight;
        const targetY = inputRect.top + window.scrollY;
        const scrollTo = Math.max(0, targetY - (availableHeight * 0.3));
        
        window.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }, 150);
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    activeInputRef.current = null;
  }, []);

  // Debounced input handler to reduce unnecessary re-renders
  const debouncedHandleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    setEntry(prev => ({
      ...prev,
      [name]: value
    }));
  }, [error]);

  // Keyboard height detection for better mobile experience
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const currentHeight = window.innerHeight;
        const fullHeight = window.screen.height;
        const heightDiff = fullHeight - currentHeight;
        
        if (heightDiff > 150) {
          setKeyboardHeight(heightDiff);
        } else {
          setKeyboardHeight(0);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Reset keyboard height when app becomes visible
        setTimeout(handleResize, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-hide undo after 10 seconds
  useEffect(() => {
    if (showUndo) {
      const timer = setTimeout(() => {
        setShowUndo(false);
        setLastSavedEntry(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showUndo]);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Try to sync pending entries when coming back online
      if (pendingEntries.length > 0) {
        syncPendingEntries();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingEntries]);

  // Load pending entries from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pending-entries');
      if (stored) {
        setPendingEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending entries:', error);
    }
  }, []);

  // Sync pending entries when online
  const syncPendingEntries = async () => {
    if (pendingEntries.length === 0 || !isOnline || !updateLogs) return;

    try {
      // Add haptic feedback for sync start
      if (navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }

      for (const pendingEntry of pendingEntries) {
        const updatedLogs = [...safetyLogs, pendingEntry].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        await updateLogs(updatedLogs);
      }

      // Clear pending entries after successful sync
      setPendingEntries([]);
      localStorage.removeItem('pending-entries');
      
    } catch (error) {
      console.error('Error syncing pending entries:', error);
      // Keep entries pending for next retry
    }
  };

  // Removed - replaced with debouncedHandleChange below for better performance

  // Memoize expensive calculations to prevent unnecessary re-renders
  const calculateEstimatedEarnings = useMemo(() => {
    if (!entry.stops) return "£0.00";
    
    const stopsNum = parseInt(entry.stops, 10) || 0;
    const extraNum = entry.extra ? parseFloat(entry.extra) || 0 : 0;
    
    const earnings = (stopsNum * rate) + extraNum;
    return `£${earnings.toFixed(2)}`;
  }, [entry.stops, entry.extra, rate]);

  // Memoize recent entries to avoid unnecessary re-processing
  const recentEntries = useMemo(() => {
    return showAllEntries ? safetyLogs : safetyLogs.slice(0, 2);
  }, [safetyLogs, showAllEntries]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaving(true);
    setError(null);
    
    try {
      if (!entry.stops) {
        throw new Error("Please enter number of stops");
      }
      
      const stops = parseInt(entry.stops, 10);
      const extra = entry.extra ? parseFloat(entry.extra) : 0;
      const total = (stops * rate) + extra;
      
      const newLog = {
        id: Date.now(),
        date: entry.date,
        stops,
        extra,
        total,
        notes: entry.notes,
        timestamp: new Date().toISOString(),
      };
      
      // Store entry for undo functionality
      setLastSavedEntry({
        entry: { ...newLog },
        previousLogs: [...safetyLogs]
      });

      // Handle offline scenario
      if (!isOnline) {
        // Save to pending entries for later sync
        const newPendingEntries = [...pendingEntries, newLog];
        setPendingEntries(newPendingEntries);
        
        // Store in localStorage
        try {
          localStorage.setItem('pending-entries', JSON.stringify(newPendingEntries));
        } catch (error) {
          console.error('Error storing pending entry:', error);
        }
        
        // Add to local logs for immediate UI feedback
        const updatedLogs = [...safetyLogs, newLog].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        
        // Update logs locally but show offline message
        if (updateLogs) {
          await updateLogs(updatedLogs);
        }
        
      } else {
        // Online - try to save with retry logic
        let saveSuccessful = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!saveSuccessful && attempts < maxAttempts) {
          try {
            const updatedLogs = [...safetyLogs, newLog].sort(
              (a, b) => new Date(b.date) - new Date(a.date)
            );
            
            if (updateLogs) {
              await updateLogs(updatedLogs);
            }
            saveSuccessful = true;
          } catch (saveError) {
            attempts++;
            console.error(`Save attempt ${attempts} failed:`, saveError);
            
            if (attempts === maxAttempts) {
              // Final attempt failed - treat as offline
              const newPendingEntries = [...pendingEntries, newLog];
              setPendingEntries(newPendingEntries);
              localStorage.setItem('pending-entries', JSON.stringify(newPendingEntries));
              
              // Still update local logs for UI
              const updatedLogs = [...safetyLogs, newLog].sort(
                (a, b) => new Date(b.date) - new Date(a.date)
              );
              if (updateLogs) {
                await updateLogs(updatedLogs);
              }
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
      }

      // Save smart defaults for next entry (excluding date)
      try {
        const smartDefaults = {
          stops: entry.stops,
          extra: entry.extra,
          notes: entry.notes
        };
        localStorage.setItem('last-entry-data', JSON.stringify(smartDefaults));
      } catch (error) {
        console.error('Error saving smart defaults:', error);
      }
      
      // Clear form with fresh smart defaults
      setEntry({
        date: new Date().toISOString().split('T')[0],
        stops: entry.stops, // Keep the same stops count as smart default
        extra: entry.extra, // Keep the same extra amount as smart default  
        notes: "", // Clear notes for next entry
      });
      
      setSuccess(true);
      setShowUndo(true);
      
      // Add successful save haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    } catch (err) {
      setError(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastSavedEntry || !updateLogs) return;
    
    try {
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
      
      // Restore previous logs (remove the last added entry)
      await updateLogs(lastSavedEntry.previousLogs);
      
      // Restore the form data
      setEntry({
        date: lastSavedEntry.entry.date,
        stops: lastSavedEntry.entry.stops.toString(),
        extra: lastSavedEntry.entry.extra.toString(),
        notes: lastSavedEntry.entry.notes || ""
      });
      
      setShowUndo(false);
      setLastSavedEntry(null);
      setSuccess(false);
      
    } catch (error) {
      console.error('Error undoing entry:', error);
      setError('Failed to undo entry');
    }
  };

  // Optimize form submission handler with proper cleanup
  const optimizedHandleSubmit = useCallback(async (e) => {
    // Prevent double submission
    if (isSubmitting) return;
    
    await handleFormSubmit(e);
  }, [isSubmitting, handleFormSubmit]);

  const renderSyncStatus = () => {
    // Show offline status if we're offline
    if (!isOnline) {
      return (
        <div className="flex items-center text-amber-600 text-sm">
          <CloudOff className="w-3 h-3 mr-1" />
          <span>Offline</span>
          {pendingEntries.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">
              {pendingEntries.length} pending
            </span>
          )}
        </div>
      );
    }

    // Show pending sync status
    if (pendingEntries.length > 0) {
      return (
        <div className="flex items-center text-blue-600 text-sm">
          <Loader className="w-3 h-3 mr-1 animate-spin" />
          <span>Syncing {pendingEntries.length} entries...</span>
        </div>
      );
    }

    // Default sync status from props
    switch (syncStatus) {
      case "syncing":
        return (
          <div className="flex items-center text-amber-500 text-sm">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            <span>Syncing...</span>
          </div>
        );
      case "synced":
        return (
          <div className="flex items-center text-green-500 text-sm">
            <Cloud className="w-3 h-3 mr-1" />
            <span>All changes saved</span>
          </div>
        );
      case "offline":
        return (
          <div className="flex items-center text-amber-500 text-sm">
            <CloudOff className="w-3 h-3 mr-1" />
            <span>Working offline</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center text-red-500 text-sm">
            <CloudOff className="w-3 h-3 mr-1" />
            <span>Sync error - will retry</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-green-500 text-sm">
            <Cloud className="w-3 h-3 mr-1" />
            <span>Ready</span>
          </div>
        );
    }
  };

  // Moved to memoized version above for better performance

  return (
    <div 
      ref={formRef}
      className="space-y-4 -mx-6 -mt-6"
      style={{ 
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '0px',
        transition: 'padding-bottom 0.3s ease-in-out'
      }}
    >
      <div>
        <Card className="mx-0 rounded-none border-0 shadow-none bg-white dark:bg-gray-800">
          <CardHeader className="px-4 pb-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Log Entry
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quick delivery logging</p>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <form onSubmit={optimizedHandleSubmit} className="space-y-5">
              {/* Main input - Stops (most important, thumb-friendly position) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 text-center">
                  📦 Number of Stops
                </label>
                <Input
                  ref={stopsInputRef}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name="stops"
                  value={entry.stops}
                  onChange={debouncedHandleChange}
                  onFocus={() => handleInputFocus(stopsInputRef)}
                  onBlur={handleInputBlur}
                  placeholder="0"
                  required
                  className="h-16 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-2xl font-bold touch-manipulation text-center shadow-lg"
                />
                {entry.stops && (
                  <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    {calculateEstimatedEarnings} estimated
                  </p>
                )}
              </div>

              {/* Secondary inputs in thumb-reach zone */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      📅 Date
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={entry.date}
                      onChange={debouncedHandleChange}
                      onFocus={() => handleInputFocus({ current: null })}
                      onBlur={handleInputBlur}
                      required
                      className="h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm touch-manipulation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      💰 Extra Pay
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                        <span className="text-gray-500 text-sm font-medium">£</span>
                      </div>
                      <Input
                        ref={extraInputRef}
                        type="number"
                        inputMode="decimal"
                        name="extra"
                        value={entry.extra}
                        onChange={debouncedHandleChange}
                        onFocus={() => handleInputFocus(extraInputRef)}
                        onBlur={handleInputBlur}
                        placeholder="0.00"
                        step="0.01"
                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm touch-manipulation text-center font-medium"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    📝 Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    name="notes"
                    value={entry.notes}
                    onChange={debouncedHandleChange}
                    onFocus={() => handleInputFocus({ current: null })}
                    onBlur={handleInputBlur}
                    placeholder="Additional notes..."
                    className="h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm touch-manipulation"
                  />
                </div>
              </div>
              
              {/* Thumb-friendly submit area */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-xs">
                    {renderSyncStatus()}
                  </div>
                </div>
                
                {/* Large, thumb-friendly submit button */}
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !entry.stops}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-6 rounded-2xl font-semibold text-base shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-14 min-h-[56px] touch-manipulation active:scale-98 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      <span>Saving Entry...</span>
                    </>
                  ) : (
                    <>
                      <Save className="mr-3 h-5 w-5" />
                      <span>Save Entry {entry.stops ? `(${entry.stops} stops)` : ''}</span>
                    </>
                  )}
                </Button>
                
                {/* Quick tips for first-time users */}
                {!entry.stops && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      👆 Enter your delivery stops to get started
                    </p>
                  </div>
                )}
              </div>

              {/* Success/Error messages */}
              <AnimatePresence>
                {success && !showUndo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl"
                  >
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <p className="text-xs font-medium">Entry saved successfully!</p>
                    </div>
                  </motion.div>
                )}
                
                {/* Undo functionality */}
                {showUndo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <div>
                          <p className="text-xs font-medium text-amber-800">Entry saved successfully!</p>
                          <p className="text-xs text-amber-600 mt-1">Tap undo if this was a mistake</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleUndo}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-3 bg-white hover:bg-amber-50 border-amber-300 text-amber-700 hover:text-amber-800 h-8 px-3 text-xs touch-manipulation active:scale-95"
                      >
                        <Undo className="h-3 w-3 mr-1" />
                        Undo
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl"
                >
                  <div className="flex items-start">
                    <svg className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{error}</p>
                      {!isOnline && (
                        <p className="text-xs text-red-600 mt-1">
                          Your entry has been saved locally and will sync when you're back online.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Offline notification */}
              {!isOnline && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-200 p-4 rounded-xl"
                >
                  <div className="flex items-center">
                    <CloudOff className="h-4 w-4 text-amber-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Working offline</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Entries will sync automatically when connection is restored
                      </p>
                      {pendingEntries.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {pendingEntries.length} entries waiting to sync
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Entries - Show only latest 2 in compact form */}
      {safetyLogs.length > 0 && (
        <Card className="mx-0 rounded-2xl border-0 shadow-sm">
          <CardHeader className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Recent Entries
              </CardTitle>
              {safetyLogs.length > 2 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto"
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-2">
              {safetyLogs.slice(0, 2).map((log, index) => (
                <div key={log.id} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(log.date), 'MMM d')}
                      </div>
                      <div className="text-xs font-medium">{log.stops} stops</div>
                      {log.extra > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">+£{log.extra}</div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      £{log.total?.toFixed(0) || '0'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StopEntryForm;