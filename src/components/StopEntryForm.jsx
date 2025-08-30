import React, { useState, useEffect } from "react";
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
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const StopEntryForm = ({ logs = [], updateLogs, syncStatus }) => {
  // Initialize logs as an empty array if null
  const safetyLogs = logs || [];
  
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    stops: "",
    extra: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rate, setRate] = useState(1.90); // Default rate per stop
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Get user's rate from local storage or settings
  useEffect(() => {
    const savedRate = localStorage.getItem('rate-per-stop');
    if (savedRate) {
      setRate(parseFloat(savedRate));
    }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateEstimatedEarnings = () => {
    if (!entry.stops) return "£0.00";
    
    const stopsNum = parseInt(entry.stops, 10);
    const extraNum = entry.extra ? parseFloat(entry.extra) : 0;
    
    const earnings = (stopsNum * rate) + extraNum;
    return `£${earnings.toFixed(2)}`;
  };

  const handleSubmit = async (e) => {
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
      
      // Add to logs and sort by date
      const updatedLogs = [...safetyLogs, newLog].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      if (updateLogs) {
        await updateLogs(updatedLogs);
      }
      
      setEntry({
        date: new Date().toISOString().split('T')[0],
        stops: "",
        extra: "",
        notes: "",
      });
      
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
      setIsSubmitting(false);
    }
  };

  const renderSyncStatus = () => {
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
            <span>Sync error</span>
          </div>
        );
      default:
        return null;
    }
  };

  const recentEntries = showAllEntries ? safetyLogs : safetyLogs.slice(0, 3); // Show all or just 3 entries

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 border-0">
          <CardHeader className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white py-8 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full"></div>
            
            <CardTitle className="relative z-10 flex items-center text-2xl font-bold">
              <div className="p-3 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm">
                <Truck className="h-6 w-6" />
              </div>
              Log Today's Deliveries
            </CardTitle>
            <p className="relative z-10 text-blue-100 mt-2 font-medium">Enter your delivery details and earnings will be calculated automatically</p>
          </CardHeader>
          <CardContent className="p-8 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Date
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={entry.date}
                    onChange={handleChange}
                    required
                    className="w-full h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-2">
                      <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Number of Stops
                  </label>
                  <Input
                    type="number"
                    name="stops"
                    value={entry.stops}
                    onChange={handleChange}
                    placeholder="How many deliveries?"
                    required
                    className="w-full h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-2">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    Extra Pay (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                      <span className="text-gray-500 font-medium">£</span>
                    </div>
                    <Input
                      type="number"
                      name="extra"
                      value={entry.extra}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      className="pl-8 w-full h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-2">
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    name="notes"
                    value={entry.notes}
                    onChange={handleChange}
                    placeholder="Any additional notes?"
                    className="w-full h-12 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-300"
                  />
                </div>
              </div>
              
              {/* Earnings Preview */}
              {entry.stops && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-800 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-500 rounded-xl mr-4">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Estimated Earnings</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Based on {entry.stops} stops</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {calculateEstimatedEarnings()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  {renderSyncStatus()}
                </div>
                <div className="flex items-center gap-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-3 h-5 w-5" />
                        Save Entry
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Success message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg"
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">Entry saved successfully!</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card className="h-full shadow-apple-card border-0 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
          <CardHeader className="pb-4">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mr-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Recent Entries</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            {recentEntries.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl inline-block mb-4">
                  <Truck className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">No entries yet</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Add your first delivery entry to start tracking!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-apple-button hover:shadow-apple-card transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-2 flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2 flex-wrap">
                          <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded mr-2 flex-shrink-0">
                            <Truck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <span className="font-medium">{log.stops} stops</span>
                          {log.extra > 0 && (
                            <>
                              <span className="mx-2 text-gray-400">•</span>
                              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded mr-1 flex-shrink-0">
                                <DollarSign className="w-3 h-3 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="font-medium">£{log.extra.toFixed(2)} extra</span>
                            </>
                          )}
                        </div>
                        
                        {log.notes && (
                          <div className="flex items-start text-xs text-gray-500 dark:text-gray-400">
                            <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded mr-2 mt-0.5 flex-shrink-0">
                              <FileText className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="line-clamp-2 font-medium">{log.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="sm:ml-4 text-left sm:text-right flex-shrink-0">
                        <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full">
                          <p className="font-bold text-white text-sm">
                            £{log.total?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        {log.timestamp && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {safetyLogs.length > 3 && (
                  <Button 
                    variant="ghost"
                    onClick={() => setShowAllEntries(!showAllEntries)}
                    className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-blue-600 dark:text-blue-400 font-semibold transition-all duration-300 hover:scale-105"
                  >
                    {showAllEntries ? `Show recent entries` : `View all entries (${safetyLogs.length})`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StopEntryForm;