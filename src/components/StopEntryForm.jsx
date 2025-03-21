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

  const recentEntries = safetyLogs.slice(0, 3); // Get latest 3 entries

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="bg-blue-500 text-white py-6">
            <CardTitle className="flex items-center text-xl font-medium">
              <Truck className="mr-2 h-5 w-5" />
              Log Today's Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={entry.date}
                    onChange={handleChange}
                    required
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Truck className="w-4 h-4 inline mr-1" />
                    Number of Stops
                  </label>
                  <Input
                    type="number"
                    name="stops"
                    value={entry.stops}
                    onChange={handleChange}
                    placeholder="How many deliveries?"
                    required
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Extra Pay (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">£</span>
                    </div>
                    <Input
                      type="number"
                      name="extra"
                      value={entry.extra}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      className="pl-8 w-full"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    name="notes"
                    value={entry.notes}
                    onChange={handleChange}
                    placeholder="Any additional notes?"
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  {renderSyncStatus()}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Estimated earnings: <span className="font-medium text-gray-900 dark:text-white">{calculateEstimatedEarnings()}</span>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
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
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Truck className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="font-medium mb-1">No entries yet</p>
                <p>Add your first delivery entry to start tracking!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          <span>{log.stops} stops</span>
                          {log.extra > 0 && (
                            <>
                              <span className="mx-1">•</span>
                              <DollarSign className="w-3.5 h-3.5 mr-1" />
                              <span>£{log.extra.toFixed(2)} extra</span>
                            </>
                          )}
                        </div>
                        {log.notes && (
                          <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-400 line-clamp-1">
                            <FileText className="w-3 h-3 inline mr-1" />
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        £{log.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {log.timestamp && formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {safetyLogs.length > 3 && (
                  <Button variant="ghost" className="text-sm text-blue-600 dark:text-blue-400 w-full mt-2">
                    View all entries ({safetyLogs.length})
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