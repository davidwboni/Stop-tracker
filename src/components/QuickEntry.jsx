import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Zap, TrendingUp, Clock, Target } from "lucide-react";

const QuickEntry = ({ logs = [], onAddEntry, paymentConfig }) => {
  const [stops, setStops] = useState("");
  const [extra, setExtra] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate smart suggestions based on user's patterns
  const suggestions = useMemo(() => {
    if (!logs || logs.length === 0) return { avgStops: 0, commonStops: [] };

    const recentLogs = logs
      .filter(log => {
        const logDate = new Date(log.date);
        const daysDiff = (new Date() - logDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30; // Last 30 days
      })
      .slice(-10); // Last 10 entries

    if (recentLogs.length === 0) return { avgStops: 0, commonStops: [] };

    const avgStops = Math.round(
      recentLogs.reduce((sum, log) => sum + log.stops, 0) / recentLogs.length
    );

    // Find most common stop counts
    const stopCounts = {};
    recentLogs.forEach(log => {
      stopCounts[log.stops] = (stopCounts[log.stops] || 0) + 1;
    });

    const commonStops = Object.entries(stopCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([stops]) => parseInt(stops));

    return { avgStops, commonStops };
  }, [logs]);

  // Calculate estimated earnings
  const calculateEarnings = (stopCount, extraPay = 0) => {
    if (!stopCount) return 0;

    // Use provided config or default values
    const config = paymentConfig || { cutoffPoint: 110, rateBeforeCutoff: 1.98, rateAfterCutoff: 1.48 };
    const { cutoffPoint = 110, rateBeforeCutoff = 1.98, rateAfterCutoff = 1.48 } = config;
    
    let total = 0;
    if (stopCount <= cutoffPoint) {
      total = stopCount * rateBeforeCutoff;
    } else {
      total = cutoffPoint * rateBeforeCutoff + (stopCount - cutoffPoint) * rateAfterCutoff;
    }
    
    return total + (parseFloat(extraPay) || 0);
  };

  const estimatedEarnings = calculateEarnings(parseInt(stops) || 0, extra);

  const handleQuickAdd = async (suggestedStops = null) => {
    const finalStops = suggestedStops || parseInt(stops);
    if (!finalStops || finalStops <= 0) return;

    setIsSubmitting(true);
    
    try {
      await onAddEntry({
        date: new Date().toISOString().split("T")[0],
        stops: finalStops,
        extra: parseFloat(extra) || 0,
        notes: ""
      });

      setStops("");
      setExtra("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error adding quick entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-100 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500 rounded-full text-white">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Entry</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Log today's deliveries fast</p>
          </div>
        </div>

        {/* Quick Suggestions */}
        {suggestions.commonStops.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Add</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {suggestions.commonStops.map(stopCount => (
                <Button
                  key={stopCount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(stopCount)}
                  disabled={isSubmitting}
                  className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 transition-all duration-200 hover:scale-105"
                >
                  {stopCount} stops
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Input */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Stops
              </label>
              <Input
                type="number"
                placeholder="150"
                value={stops}
                onChange={(e) => setStops(e.target.value)}
                className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Extra £ (optional)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Estimated Earnings */}
          {estimatedEarnings > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Estimated Earnings
                </span>
                <span className="text-lg font-bold text-green-800 dark:text-green-200">
                  £{estimatedEarnings.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Insights */}
          {suggestions.avgStops > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Your Average
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                You typically do {suggestions.avgStops} stops per day
              </p>
            </div>
          )}

          <Button
            onClick={() => handleQuickAdd()}
            disabled={!stops || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-3 transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Adding...
              </>
            ) : showSuccess ? (
              <>
                <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                Added!
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Add Entry
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickEntry;