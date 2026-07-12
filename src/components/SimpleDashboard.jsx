import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import StopEntryForm from "./StopEntryForm";
import DashboardTutorial from "./DashboardTutorial";
import { Calendar, Package, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { Money } from "./ui/money";

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
    const todayStr = today.toISOString().split('T')[0];

    const thisWeekLogs = safetyLogs.filter(log => {
      const logDate = new Date(log.date);
      // Cap at today so mistakenly future-dated entries can't inflate the totals
      return logDate >= weekStart && log.date <= todayStr;
    });

    const weeklyStops = thisWeekLogs.reduce((sum, log) => sum + log.stops, 0);
    const weeklyEarnings = thisWeekLogs.reduce((sum, log) => sum + (log.total || 0), 0);
    const avgPerDay = thisWeekLogs.length > 0 ? (weeklyEarnings / thisWeekLogs.length) : 0;

    return {
      stops: weeklyStops,
      earnings: weeklyEarnings,
      days: thisWeekLogs.length,
      avgPerDay
    };
  }, [logs]);

  // Most recent activity ordered by actual date (newest first), excluding any
  // future-dated entries that would otherwise surface here by mistake.
  const recentActivity = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...(logs || [])]
      .filter(log => log.date <= today)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 3);
  }, [logs]);

  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  // Rotating sub-messages — deterministic by day of month so the message
  // changes day to day but stays stable across re-renders within a day.
  const doneMessages = [
    "Great job today! You're all set.",
    "Another day in the books. Nice work!",
    "All logged. Enjoy the rest of your day!",
    "Solid shift, everything's tracked.",
    "Done and dusted. See you tomorrow!",
    "That's a wrap for today. Well earned!"
  ];
  const promptMessages = [
    "Log today's deliveries to get started.",
    "Ready when you are. Add today's stops.",
    "How did today go? Log your deliveries.",
    "Let's get today's stops on the board.",
    "Track today's round to keep your streak.",
    "A minute now saves guesswork on payday."
  ];
  const dayIndex = new Date().getDate();
  const subMessage = todayAlreadyLogged
    ? doneMessages[dayIndex % doneMessages.length]
    : promptMessages[dayIndex % promptMessages.length];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      <DashboardTutorial />

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
          {subMessage}
        </p>
      </motion.div>

      {/* Today's Quick Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Card
            onClick={() => navigate('/app/entries')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/entries'); }}
            aria-label="View your recent entries"
            className="bg-card border-border/50 overflow-hidden min-w-0 cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
          >
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Stops</div>
              <div className="text-2xl sm:text-3xl font-bold">{todayData.stops}</div>
              <div className="text-xs text-muted-foreground mt-1">stops</div>
            </CardContent>
          </Card>
          <Card
            onClick={() => navigate('/app/stats')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/stats'); }}
            aria-label="View your earnings stats"
            className="bg-card border-border/50 overflow-hidden min-w-0 cursor-pointer hover:border-primary/30 active:scale-[0.98] transition-all touch-manipulation"
          >
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Today's Earnings</div>
              <div className="text-2xl sm:text-3xl font-bold text-primary"><Money amount={todayData.earnings} /></div>
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
          <Card
            onClick={() => navigate('/app/stats')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/app/stats'); }}
            aria-label="View your weekly stats"
            className="bg-primary/5 border-primary/20 cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all touch-manipulation"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">This Week</h2>
                <div className="flex items-center gap-1 text-primary opacity-60">
                  <Calendar className="w-5 h-5" />
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold">{weekStats.stops}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Stops</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-primary"><Money amount={weekStats.earnings} whole /></div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold"><Money amount={weekStats.avgPerDay} whole /></div>
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

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
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
            {recentActivity.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-[14px] p-4 border border-border/50 hover:border-primary/30 transition-colors"
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
                    <Money amount={log.total || 0} />
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
        <Button
          onClick={() => navigate('/app/stats')}
          variant="outline"
          className="flex-col h-auto py-4 gap-2 rounded-[14px] active:scale-95 touch-manipulation"
        >
          <TrendingUp className="w-6 h-6 text-secondary" />
          <span className="font-medium text-sm">Weekly Stats</span>
        </Button>
        <Button
          onClick={() => navigate('/app/invoice')}
          variant="outline"
          className="flex-col h-auto py-4 gap-2 rounded-[14px] active:scale-95 touch-manipulation"
        >
          <FileText className="w-6 h-6 text-primary" />
          <span className="font-medium text-sm">Manage Invoices</span>
        </Button>
      </motion.div>
    </div>
  );
};

export default SimpleDashboard;
