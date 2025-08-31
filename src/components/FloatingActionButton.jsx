import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Truck, DollarSign, Save } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const FloatingActionButton = ({ onAddEntry, isVisible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickEntry, setQuickEntry] = useState({
    stops: '',
    extra: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = () => {
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    setIsExpanded(!isExpanded);
    
    // Reset form when closing
    if (isExpanded) {
      setQuickEntry({ stops: '', extra: '' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuickEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quickEntry.stops) {
      // Add error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const entryData = {
        date: new Date().toISOString().split('T')[0],
        stops: parseInt(quickEntry.stops, 10),
        extra: quickEntry.extra ? parseFloat(quickEntry.extra) : 0,
        notes: 'Quick entry'
      };

      if (onAddEntry) {
        await onAddEntry(entryData);
      }

      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }

      // Reset and close
      setQuickEntry({ stops: '', extra: '' });
      setIsExpanded(false);

    } catch (error) {
      console.error('Error adding quick entry:', error);
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleToggle}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.1
        }}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-80 max-w-[calc(100vw-2rem)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Entry
                </h3>
                <button
                  onClick={handleToggle}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Stops
                  </label>
                  <Input
                    type="number"
                    name="stops"
                    value={quickEntry.stops}
                    onChange={handleInputChange}
                    placeholder="How many deliveries?"
                    required
                    className="w-full h-10 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Extra Pay (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 text-sm">£</span>
                    </div>
                    <Input
                      type="number"
                      name="extra"
                      value={quickEntry.extra}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      className="pl-8 w-full h-10 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !quickEntry.stops}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      Add Entry
                    </div>
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              onClick={handleToggle}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:shadow-blue-500/25 active:shadow-lg"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default FloatingActionButton;