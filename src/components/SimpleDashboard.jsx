import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Card, CardContent } from "./ui/card";
import StopEntryForm from "./StopEntryForm";
import { Calendar, Package, TrendingUp, FileText, ArrowRight } from "lucide-react";

const SimpleDashboard = () => {
  const { user } = useAuth();
  const { logs, updateLogs, loading, paymentConfig } = useData();
  const navigate = useNavigate();

  // Check if today is already logged
  const todayAlreadyLogged = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return logs?.some(log => log.date === today) || false;
  }, [logs]);

  // Today's earnings
  const todayData = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLog = logs?.find(log => log.date === today);
    return todayLog ? { stops: todayLog.stops, earnings: todayLog.total || 0 } : { stops: 0, earnings: 0 };
  }, [logs]);

  // Simple stats for this week
  const weekStats = React.useMemo(() => {
    const safetyLogs = logs || [];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const thisWeekLogs = safetyLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart;
    });

    const weeklyStops = thisWeekLogs.reduce((sum, log) => sum + log.stops, 0);
    const weeklyEarnings = thisWeekLogs.reduce((sum, log) => sum + (log.total || 0), 0);
    const avgPerDay = thisWeekLogs.length > 0 ? (weeklyEarnings / thisWeekLogs.length).toFixed(2) : 0;

    return {
      stops: weeklyStops,
      earnings: weeklyEarnings,
      days: thisWeekLogs.length,
      avgPerDay
    };
  }, [logs]);

  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2"
      >
        <h1 className="text-4xl font-bold mb-2">
          {greeting}, {user?.displayName?.split(' ')[0] || "Driver"}!
        </h1>
        <p className="text-muted-foreground">
          {todayAlreadyLogged ? "Great job today! You're all set." : "Log today's deliveries to get started."}
        </p>
      </motion.div>

      {/* Today's Quick Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Stops</div>
              <div className="text-3xl font-bold">{todayData.stops}</div>
              <div className="text-xs text-muted-foreground mt-1">stops</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Earnings</div>
              <div className="text-3xl font-bold text-primary">£{todayData.earnings.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">earned</div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Weekly Summary */}
      {logs && logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">This Week</h2>
                <Calendar className="w-5 h-5 text-primary opacity-60" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-2xl font-bold">{weekStats.stops}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Stops</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">£{weekStats.earnings.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">£{weekStats.avgPerDay}</div>
                  <div className="text-xs text-muted-foreground mt-1">Per Day</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Entry Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">
                {todayAlreadyLogged ? "Update Today's Entry" : "Log Today's Deliveries"}
              </h2>
            </div>
            <StopEntryForm logs={logs} updateLogs={updateLogs} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Entries */}
      {logs && logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Activity</h3>
            <button
              onClick={() => navigate('/app/entries')}
              className="text-primary hover:opacity-80 transition-opacity text-sm flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {logs.slice(-3).reverse().map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(log.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.stops} stops {log.extra > 0 && `+ £${log.extra.toFixed(2)}`}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    £{log.total?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3 pt-2"
      >
        <button
          onClick={() => navigate('/app/stats')}
          className="bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 rounded-lg p-4 transition-colors active:scale-95 touch-manipulation"
        >
          <TrendingUp className="w-6 h-6 text-secondary mb-2" />
          <div className="font-medium text-sm">Weekly Stats</div>
        </button>
        <button
          onClick={() => navigate('/app/invoice')}
          className="bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg p-4 transition-colors active:scale-95 touch-manipulation"
        >
          <FileText className="w-6 h-6 text-primary mb-2" />
          <div className="font-medium text-sm">Manage Invoices</div>
        </button>
      </motion.div>
    </div>
  );
};

export default SimpleDashboard;
