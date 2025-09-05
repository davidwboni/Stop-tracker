import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSwipeable } from 'react-swipeable';
import { useDrag } from '@use-gesture/react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { 
  BarChart2, 
  FileText, 
  Calendar, 
  Plus, 
  TrendingUp,
  Award,
  DollarSign,
  Clock,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import StopEntryForm from "./StopEntryForm";
import WeeklyStats from "./WeeklyStats";
import InvoiceComparison from "./InvoiceComparison";
import StatsOverview from "./StatsOverview";
import QuickEntry from "./QuickEntry";
import { SkeletonStats, SkeletonTabs, SkeletonList } from "./Skeleton";

const DashboardCard = ({ title, value, description, icon: Icon, color, trend, onClick }) => {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: 'text-blue-600 dark:text-blue-400',
      accent: 'bg-blue-600 dark:bg-blue-500'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      icon: 'text-purple-600 dark:text-purple-400',
      accent: 'bg-purple-600 dark:bg-purple-500'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      icon: 'text-green-600 dark:text-green-400',
      accent: 'bg-green-600 dark:bg-green-500'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      icon: 'text-amber-600 dark:text-amber-400',
      accent: 'bg-amber-600 dark:bg-amber-500'
    }
  };

  const styles = colorStyles[color];

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`p-6 ${styles.bg} rounded-3xl cursor-pointer transition-all duration-200 active:scale-95 min-h-[120px] flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</h3>
        </div>
        <div className={`p-2 rounded-full ${styles.icon}`}>
          <Icon size={20} />
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${styles.accent} mr-2`}></div>
          <span className={`text-xs font-medium ${
            trend > 0 ? 'text-green-600 dark:text-green-400' : 
            trend < 0 ? 'text-red-600 dark:text-red-400' : 
            'text-gray-600 dark:text-gray-400'
          }`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}% vs last week
          </span>
        </div>
      )}
    </motion.div>
  );
};

const RecentEntryItem = ({ log, index, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setSwipeProgress(100);
      setTimeout(() => {
        setIsDeleting(true);
        onDelete(log.id);
      }, 200);
    },
    onSwiping: (eventData) => {
      if (eventData.dir === 'Left') {
        const progress = Math.min(Math.abs(eventData.deltaX) / 100, 1) * 100;
        setSwipeProgress(progress);
      }
    },
    onSwiped: () => {
      if (swipeProgress < 100) {
        setSwipeProgress(0);
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  });
  
  return (
    <motion.div
      {...swipeHandlers}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isDeleting ? 0 : 1, 
        x: isDeleting ? -100 : -swipeProgress / 3,
        scale: isDeleting ? 0.95 : 1,
        y: 0
      }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05, duration: isDeleting ? 0.3 : 0.4, ease: "easeOut" }}
      className="relative py-5 px-6 mx-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-98 transition-all"
      style={{
        background: swipeProgress > 0 ? 
          `linear-gradient(90deg, #fee2e2 0%, #fecaca ${swipeProgress}%, #ffffff ${swipeProgress}%)` : 
          undefined
      }}
    >
      {/* Swipe-to-delete indicator */}
      {swipeProgress > 0 && (
        <motion.div 
          className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-red-500"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: swipeProgress / 100, scale: swipeProgress > 50 ? 1 : 0.9 }}
        >
          <span className="text-sm font-medium">
            {swipeProgress >= 80 ? 'Release to delete' : 'Swipe left'}
          </span>
          <Trash2 className="w-5 h-5" />
        </motion.div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-gray-900 dark:text-white">
              {new Date(log.date).toLocaleDateString('en-GB', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {log.stops} stops
              </span>
              {log.extra > 0 && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                  +£{log.extra.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              £{log.total?.toFixed(2) || '0.00'}
            </p>
          </div>
          
          {/* Delete button for desktop */}
          <motion.button
            onClick={() => onDelete(log.id)}
            whileTap={{ scale: 0.9 }}
            className="hidden sm:flex p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const WelcomeMessage = ({ userName, isNewUser, todayAlreadyLogged }) => {
  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  
  if (currentHour < 12) {
    greeting = "Good morning";
  } else if (currentHour < 18) {
    greeting = "Good afternoon";
  }
  
  const getMotivationalMessage = () => {
    if (isNewUser) {
      return "🎉 Welcome to your earnings tracker! Time to turn every delivery into profit - you've got this!";
    }
    if (todayAlreadyLogged) {
      const motivationalCompliments = [
        "🌟 You're doing amazing today! Your dedication shows in every delivery.",
        "💪 Another successful day logged! Keep that momentum going strong.",
        "🚀 Fantastic work today! You're building something great, one stop at a time.",
        "⭐ Well done for the day! Don't spend it all... but definitely celebrate your hard work!",
        "🏆 Today's efforts are paying off! Your consistency is truly impressive."
      ];
      return motivationalCompliments[Math.floor(Math.random() * motivationalCompliments.length)];
    }
    const messages = [
      "🔥 Ready to dominate today's routes? Every stop brings you closer to your goals!",
      "💎 Let's turn today's miles into money! Your hustle deserves recognition.",
      "⚡ Time to make every delivery count! You're building something incredible.",
      "🎯 Another day, another chance to exceed expectations! Let's make it profitable.",
      "🌟 Today's the day to show what you're made of! Ready to crush those targets?",
      "💪 Your dedication inspires others! Let's make today's efforts legendary."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };
  
  return (
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight text-gray-900 dark:text-white">
        {greeting}, {userName?.split(' ')[0] || "Driver"}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium leading-relaxed max-w-2xl mx-auto">
        {getMotivationalMessage()}
      </p>
    </div>
  );
};

const ModernDashboard = () => {
  const { user } = useAuth();
  const { logs, updateLogs, loading, isNewUser, paymentConfig } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("entry");
  const [showWelcome, setShowWelcome] = useState(true);

  // Tab order for swipe navigation
  const tabOrder = ["entry", "weekly", "invoice", "overview"];
  
  // Swipe navigation handlers
  const handleSwipeLeft = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabOrder.length;
    setActiveTab(tabOrder[nextIndex]);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const prevIndex = currentIndex === 0 ? tabOrder.length - 1 : currentIndex - 1;
    setActiveTab(tabOrder[prevIndex]);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Configure swipeable handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    preventDefaultTouchmoveEvent: false,
    trackMouse: false
  });

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    // Simulate data refresh - you can replace this with actual data fetching
    try {
      // In a real app, you'd call your data fetching functions here
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // You could refresh logs, sync with Firebase, etc.
      // await syncData.forceRefreshAllData(user?.uid);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  // Pull-to-refresh gesture
  const bind = useDrag(({ movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
    // Only handle downward pull at the top of the page
    if (window.scrollY > 0) return;
    
    if (my < 0) return; // Ignore upward movement
    
    const pullThreshold = 80;
    const distance = Math.min(my, pullThreshold + 20);
    
    setPullDistance(distance);
    
    if (distance >= pullThreshold && vy > 0.1 && dy > 0) {
      cancel();
      handleRefresh();
    }
  }, {
    axis: 'y',
    filterTaps: true,
    rubberband: true
  });

  // Add scroll listener to hide welcome message when scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowWelcome(scrollTop < 50); // Hide when scrolled more than 50px for more natural feel
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Check if today is already logged
  const todayAlreadyLogged = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return logs?.some(log => log.date === today) || false;
  }, [logs]);
  
  // Enhanced entry handler for QuickEntry
  const handleQuickEntryAdd = async (entryData) => {
    const newEntry = {
      id: Date.now(),
      ...entryData,
      total: calculateEarnings(entryData.stops, entryData.extra)
    };
    
    const updatedLogs = [...(logs || []), newEntry].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    await updateLogs(updatedLogs);
  };
  
  // Calculate earnings helper
  const calculateEarnings = (stops, extra = 0) => {
    if (!paymentConfig) return 0;
    const { cutoffPoint = 110, rateBeforeCutoff = 1.98, rateAfterCutoff = 1.48 } = paymentConfig;
    
    let total = 0;
    if (stops <= cutoffPoint) {
      total = stops * rateBeforeCutoff;
    } else {
      total = cutoffPoint * rateBeforeCutoff + (stops - cutoffPoint) * rateAfterCutoff;
    }
    
    return total + (parseFloat(extra) || 0);
  };

  // Delete entry handler
  const handleDeleteEntry = async (entryId) => {
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
    
    const updatedLogs = logs.filter(log => log.id !== entryId);
    await updateLogs(updatedLogs);
  };
  

  // Calculate summary stats with trends
  const stats = React.useMemo(() => {
    const safetyLogs = logs || [];
    if (safetyLogs.length === 0) {
      return {
        totalStops: 0,
        weeklyStops: 0,
        avgStopsPerDay: 0,
        weeklyEarnings: 0,
        weeklyTrend: 0,
        avgTrend: 0,
        earningsTrend: 0
      };
    }
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday as week start
    
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thisWeekLogs = safetyLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart;
    });
    
    const lastWeekLogs = safetyLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= lastWeekStart && logDate < weekStart;
    });
    
    const totalStops = safetyLogs.reduce((sum, log) => sum + log.stops, 0);
    const weeklyStops = thisWeekLogs.reduce((sum, log) => sum + log.stops, 0);
    const lastWeekStops = lastWeekLogs.reduce((sum, log) => sum + log.stops, 0);
    
    const weeklyEarnings = thisWeekLogs.reduce((sum, log) => sum + (log.total || 0), 0);
    const lastWeekEarnings = lastWeekLogs.reduce((sum, log) => sum + (log.total || 0), 0);
    
    const avgStopsPerDay = Math.round(weeklyStops / Math.max(thisWeekLogs.length, 1));
    const lastWeekAvg = Math.round(lastWeekStops / Math.max(lastWeekLogs.length, 1));
    
    // Calculate trends
    const weeklyTrend = lastWeekStops > 0 ? Math.round(((weeklyStops - lastWeekStops) / lastWeekStops) * 100) : 0;
    const avgTrend = lastWeekAvg > 0 ? Math.round(((avgStopsPerDay - lastWeekAvg) / lastWeekAvg) * 100) : 0;
    const earningsTrend = lastWeekEarnings > 0 ? Math.round(((weeklyEarnings - lastWeekEarnings) / lastWeekEarnings) * 100) : 0;
    
    return {
      totalStops,
      weeklyStops,
      avgStopsPerDay,
      weeklyEarnings: Math.round(weeklyEarnings),
      weeklyTrend,
      avgTrend,
      earningsTrend
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 w-full min-h-screen">
        {/* Skeleton Welcome Message */}
        <div className="px-4 sm:px-6 py-6 sm:py-8 text-center mb-6 sm:mb-8">
          <div className="animate-pulse">
            <div className="h-8 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4 mx-auto"></div>
            <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto"></div>
          </div>
        </div>

        {/* Skeleton Stats */}
        <SkeletonStats />

        {/* Skeleton Tabs */}
        <SkeletonTabs />

        {/* Skeleton Recent Entries */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4 px-4 sm:px-0">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-2xl mr-4 animate-pulse"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          </div>
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div {...bind()} className="relative" style={{ touchAction: 'pan-y' }}>
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white transition-all duration-300"
          style={{
            height: Math.max(pullDistance, isRefreshing ? 60 : 0),
            transform: `translateY(${isRefreshing ? 0 : -60 + pullDistance}px)`
          }}
        >
          {isRefreshing ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-sm font-medium">Syncing data...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 opacity-80">
              <span className="text-sm font-medium">
                {pullDistance >= 80 ? 'Release to refresh' : 'Pull down to refresh'}
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="max-w-6xl mx-auto py-6 px-4 w-full min-h-screen bg-gray-50 dark:bg-gray-900 -mx-4 -my-6">
      {/* Main welcome message - visible only when scrolled to top */}
      {showWelcome && (
        <div className="px-6 py-8 mb-8">
          <WelcomeMessage 
            userName={user?.displayName}
            isNewUser={isNewUser}
            todayAlreadyLogged={todayAlreadyLogged}
          />
        </div>
      )}
      
      {/* Quick Entry - Show prominently if today not logged */}
      {!todayAlreadyLogged && (
        <div className="mb-8 px-4">
          <QuickEntry 
            logs={logs} 
            onAddEntry={handleQuickEntryAdd}
            paymentConfig={paymentConfig}
          />
        </div>
      )}

      {/* Stats Summary - Apple-style section */}
      <div className="mb-8">
        <div className="px-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your delivery performance at a glance</p>
        </div>
        <div className="px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard 
              title="Weekly Stops" 
              value={stats.weeklyStops}
              description="Click to view weekly stats"
              icon={TrendingUp}
              color="blue"
              trend={stats.weeklyTrend}
              onClick={() => {
                setActiveTab("weekly");
                setTimeout(() => {
                  const tabsElement = document.querySelector('[data-state="active"]');
                  if (tabsElement) {
                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }}
            />
            <DashboardCard 
              title="Daily Average" 
              value={stats.avgStopsPerDay}
              description="Click for detailed overview"
              icon={Clock}
              color="purple"
              trend={stats.avgTrend}
              onClick={() => {
                setActiveTab("overview");
                setTimeout(() => {
                  const tabsElement = document.querySelector('[role="tabpanel"]');
                  if (tabsElement) {
                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }}
            />
            <DashboardCard 
              title="Weekly Earnings" 
              value={`£${stats.weeklyEarnings}`}
              description="Click for invoice comparison"
              icon={DollarSign}
              color="green"
              trend={stats.earningsTrend}
              onClick={() => {
                setActiveTab("invoice");
                setTimeout(() => {
                  const tabsElement = document.querySelector('[role="tabpanel"]');
                  if (tabsElement) {
                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }}
            />
            <DashboardCard 
              title="Total Stops" 
              value={stats.totalStops}
              description="Click for complete overview"
              icon={Award}
              color="amber"
              onClick={() => {
                setActiveTab("overview");
                setTimeout(() => {
                  const tabsElement = document.querySelector('[role="tabpanel"]');
                  if (tabsElement) {
                    tabsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 100);
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Entries - Apple-style section */}
      {logs && logs.length > 0 && (
        <div className="mb-8">
          <div className="px-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Your latest delivery entries</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                onClick={() => navigate('/app/entries')}
              >
                See All & Delete
              </motion.button>
            </div>
          </div>
          <div className="space-y-3">
            {logs.slice(-3).reverse().map((log, index) => (
              <RecentEntryItem 
                key={log.id || log.date}
                log={log}
                index={index}
                onDelete={handleDeleteEntry}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs Navigation - Apple-style section */}
      <div className="mb-8" {...swipeHandlers}>
        <div className="px-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tools</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your delivery data</p>
        </div>
        
        <Tabs 
          defaultValue="entry" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="px-4 mb-6">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl">
              {/* Swipe indicator for mobile */}
              <div className="col-span-full sm:hidden text-center py-2">
                <div className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  <span>← Swipe to navigate →</span>
                </div>
              </div>
              <TabsTrigger 
                value="entry" 
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-700 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm min-h-[48px] font-medium"
              >
                <Plus size={18} />
                <span className="text-sm">Log Entry</span>
              </TabsTrigger>
              <TabsTrigger 
                value="weekly" 
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-700 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm min-h-[48px] font-medium"
              >
                <Calendar size={18} />
                <span className="text-sm">Weekly</span>
              </TabsTrigger>
              <TabsTrigger 
                value="invoice" 
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-700 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm min-h-[48px] font-medium"
              >
                <FileText size={18} />
                <span className="text-sm">Invoice</span>
              </TabsTrigger>
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/50 dark:hover:bg-gray-700 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm min-h-[48px] font-medium"
              >
                <BarChart2 size={18} />
                <span className="text-sm">Overview</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Tab Content - Apple-style */}
          <TabsContent value="entry" className="px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <StopEntryForm logs={logs} updateLogs={updateLogs} />
            </div>
          </TabsContent>
          
          <TabsContent value="weekly" className="px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <WeeklyStats logs={logs} />
            </div>
          </TabsContent>
          
          <TabsContent value="invoice" className="px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <InvoiceComparison logs={logs} />
            </div>
          </TabsContent>
          
          <TabsContent value="overview" className="px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <StatsOverview logs={logs} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Creator Credit */}
      <div className="text-center mt-12 mb-8 px-6">
        <div className="py-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            made with &lt;3 by{' '}
            <a
              href="https://www.linkedin.com/in/davidwboni/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200 hover:underline"
            >
              david boni
            </a>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ModernDashboard;