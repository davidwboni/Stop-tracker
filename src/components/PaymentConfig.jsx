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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen pb-24"
      >
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-900 px-4 py-6 border-b border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Configure your delivery payment rates
            </p>
          </div>
        </div>
        
        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-950/20 mx-4 mt-4 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-600 rounded-xl flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                How Payment Tiers Work
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                Set different rates for different stop counts. Most drivers earn a higher rate up to a threshold, then a lower rate beyond that.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Tiers Section */}
        <div className="px-4 py-4">
          <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Payment Tiers
          </h2>
        </div>

        <div className="space-y-2">
          {thresholds.map((threshold, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className={`mx-4 p-4 rounded-2xl transition-all duration-200 ${
                index === thresholds.length - 1 
                  ? "bg-gray-50 dark:bg-gray-800/50"
                  : "bg-white dark:bg-gray-800"
              } shadow-sm`}
            >
              {index < thresholds.length - 1 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Tier {index + 1}
                    </h3>
                    {thresholds.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeThreshold(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 h-8 w-8 rounded-full"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {/* Rate Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Rate per stop
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          £
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={threshold.rate.toString()}
                          onChange={(e) => handleThresholdChange(index, 'rate', e.target.value)}
                          className="pl-8 h-11 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-center font-medium transition-all duration-200 text-base"
                        />
                      </div>
                    </div>
                    
                    {/* Stop Count Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Up to stops
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={threshold.stopCount.toString()}
                        onChange={(e) => handleThresholdChange(index, 'stopCount', e.target.value)}
                        className="h-11 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-center font-medium transition-all duration-200 text-base"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                    After All Tiers
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Rate per additional stop
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        £
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={threshold.rate.toString()}
                        onChange={(e) => handleThresholdChange(index, 'rate', e.target.value)}
                        className="pl-8 h-11 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-center font-medium transition-all duration-200 text-base"
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          
          <div className="mt-3 mx-4">
            <Button
              variant="outline"
              onClick={addThreshold}
              className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 text-sm bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Another Tier
            </Button>
          </div>
        </div>
        
        {/* Status Messages */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-800 mt-6"
          >
            {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 rounded-xl border border-green-200 dark:border-green-800 mt-6"
          >
            ✅ Payment settings saved successfully!
          </motion.div>
        )}
        
        {/* Save Button */}
        <div className="mt-6 px-4 pb-6">
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-98"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> 
                Save Settings
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentConfig;