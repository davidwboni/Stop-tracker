import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Settings, Save, PlusCircle, MinusCircle, HelpCircle, DollarSign, Target } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";

const PaymentConfig = ({ config = {} }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [thresholds, setThresholds] = useState([
    { stopCount: 110, rate: 1.98 },
    { rate: 1.48 } // Rate after threshold
  ]);

  // Initialize from props config if available or load from database
  useEffect(() => {
    // If config is passed through props, use it
    if (config && config.thresholds) {
      setThresholds(config.thresholds);
      setLoading(false);
      return;
    }
    
    // Otherwise load from database
    const loadConfig = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().paymentConfig) {
          setThresholds(docSnap.data().paymentConfig.thresholds || thresholds);
        }
      } catch (err) {
        console.error("Error loading payment config:", err);
        setError("Failed to load payment settings");
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [user, config]);

  const handleThresholdChange = (index, field, value) => {
    const newValue = parseFloat(value);
    
    // Validate input
    if (isNaN(newValue) || newValue <= 0) return;
    
    const newThresholds = [...thresholds];
    newThresholds[index] = {
      ...newThresholds[index],
      [field]: newValue
    };
    
    setThresholds(newThresholds);
  };

  const addThreshold = () => {
    // Add a new threshold level between the last threshold and the overflow rate
    const lastThresholdIndex = thresholds.length - 2;
    const lastThreshold = thresholds[lastThresholdIndex];
    const overflowRate = thresholds[thresholds.length - 1].rate;
    
    // Calculate reasonable values for the new threshold
    const newStopCount = lastThreshold.stopCount + 20;
    const newRate = (lastThreshold.rate + overflowRate) / 2;
    
    const newThresholds = [
      ...thresholds.slice(0, thresholds.length - 1),
      { stopCount: newStopCount, rate: newRate },
      { rate: overflowRate }
    ];
    
    setThresholds(newThresholds);
  };

  const removeThreshold = (index) => {
    // Can't remove if there's only one threshold + overflow rate
    if (thresholds.length <= 2) return;
    
    const newThresholds = [
      ...thresholds.slice(0, index),
      ...thresholds.slice(index + 1)
    ];
    
    setThresholds(newThresholds);
  };

  const saveConfig = async () => {
    if (!user?.uid) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const paymentConfig = {
        thresholds: thresholds
      };
      
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { paymentConfig }, { merge: true });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving payment config:", err);
      setError("Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Settings</h2>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
            <div className="p-3 sm:p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Payment Settings
            </h1>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg font-semibold leading-relaxed max-w-2xl mx-auto">
            Configure your delivery payment rates and thresholds
          </p>
        </div>
        
        <div className="space-y-6 sm:space-y-8">
            <div className="mb-6 sm:mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-blue-100 dark:border-blue-800">
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="p-2 sm:p-3 bg-blue-500 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Customize Your Payment Rates</h4>
                  <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300 leading-relaxed">Set different rates for different stop thresholds. Many drivers are paid at a higher rate up to a certain number of stops, then a lower rate after that. This helps you track your exact earnings.</p>
                </div>
              </div>
            </div>
        
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent leading-tight">Your Payment Thresholds</h3>
              </div>
              
              {thresholds.map((threshold, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className={`group p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === thresholds.length - 1 
                      ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700"
                      : "bg-white dark:bg-gray-800 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 shadow-apple-button"
                  }`}
                >
                {index < thresholds.length - 1 ? (
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
                    {/* Mobile: Stack vertically, Desktop: Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl flex-shrink-0">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Pay £</span>
                        <div className="w-20 sm:w-28">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={threshold.rate.toString()}
                            onChange={(e) => handleThresholdChange(index, 'rate', e.target.value)}
                            className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-2 border-green-200 dark:border-green-700 rounded-lg sm:rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 text-center font-bold transition-all duration-300 text-sm sm:text-base touch-manipulation"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">per stop up to</span>
                        <div className="w-20 sm:w-28">
                          <Input
                            type="number"
                            min="1"
                            value={threshold.stopCount.toString()}
                            onChange={(e) => handleThresholdChange(index, 'stopCount', e.target.value)}
                            className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-2 border-green-200 dark:border-green-700 rounded-lg sm:rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 text-center font-bold transition-all duration-300 text-sm sm:text-base touch-manipulation"
                          />
                        </div>
                        <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">stops</span>
                      </div>
                    </div>
                  
                    {thresholds.length > 2 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeThreshold(index)}
                        className="text-red-500 self-end sm:self-center touch-manipulation min-h-[44px] min-w-[44px]"
                      >
                        <MinusCircle size={18} />
                      </Button>
                    )}
                  </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0">
                      <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">After that, pay £</span>
                    <div className="w-20 sm:w-28">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={threshold.rate.toString()}
                        onChange={(e) => handleThresholdChange(index, 'rate', e.target.value)}
                        className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 text-center font-bold transition-all duration-300 text-sm sm:text-base touch-manipulation"
                      />
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">per stop</span>
                  </div>
                </div>
              )}
                </motion.div>
              ))}
          
          <Button
            variant="outline"
            onClick={addThreshold}
            className="mt-4 sm:mt-2 min-h-[44px] touch-manipulation px-4 py-2"
          >
            <PlusCircle size={16} className="mr-2" />
            Add Threshold
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 rounded-lg text-sm">
            Payment settings saved successfully!
          </div>
        )}
        
            <div className="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={saveConfig}
                disabled={saving}
                className="w-full min-h-[48px] h-12 sm:h-14 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 active:scale-95 text-white font-semibold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] touch-manipulation"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-white border-t-transparent mr-2 sm:mr-3"></div>
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" /> 
                    Save Payment Settings
                  </>
                )}
              </Button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentConfig;