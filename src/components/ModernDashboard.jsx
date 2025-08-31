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
  Clock
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
  const iconColors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 sm:p-6 transition-all duration-500 hover:-translate-y-2 hover:scale-105 cursor-pointer group ${onClick ? 'active:scale-95' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 tracking-wide uppercase">{title}</p>
          <h3 className="text-3xl sm:text-4xl font-black mb-2 text-gray-900 dark:text-white leading-none">{value}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            {description}
          </p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${iconColors[color]} text-white group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0 ml-4`}>
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center pt-3 border-t-2 border-gray-200 dark:border-gray-700">
          <span className={`text-xs px-3 py-1 rounded-full font-black ${
            trend > 0 ? 'bg-green-600 text-white' : 
            trend < 0 ? 'bg-red-600 text-white' : 
            'bg-gray-600 text-white'
          }`}>
            {trend > 0 ? '+' : ''}{trend}% vs last week
          </span>
        </div>
      )}
    </div>
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
    <div className="px-4 sm:px-6 py-6 sm:py-8 text-center mb-6 sm:mb-8">
      <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
        {greeting}, {userName?.split(' ')[0] || "Driver"}! 👋
      </h1>
      <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg font-semibold leading-relaxed max-w-4xl mx-auto">
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
      
      <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 w-full min-h-screen"> {/* Enhanced mobile padding */}
      {/* Main welcome message - visible only when scrolled to top */}
      {showWelcome && (
        <WelcomeMessage 
          userName={user?.displayName}
          isNewUser={isNewUser}
          todayAlreadyLogged={todayAlreadyLogged}
        />
      )}
      
      {/* Quick Entry - Show prominently if today not logged */}
      {!todayAlreadyLogged && (
        <div className="mb-8">
          <QuickEntry 
            logs={logs} 
            onAddEntry={handleQuickEntryAdd}
            paymentConfig={paymentConfig}
          />
        </div>
      )}

      {/* Recent Entries Summary - Seamless Design */}
      {logs && logs.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="mb-6">
            <div className="flex items-center mb-4 px-4 sm:px-0">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mr-4 shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Recent Entries</h2>
            </div>
          </div>
          <div className="px-4 sm:px-0">
              <div className="space-y-3">
                {logs.slice(-3).reverse().map((log, index) => (
                  <motion.div
                    key={log.id || log.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="py-4 px-4 sm:px-0 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex-shrink-0">
                          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{new Date(log.date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{log.stops} stops</p>
                        </div>
                      </div>
                      <div className="text-right sm:text-right text-left sm:ml-4 flex-shrink-0">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">£{log.total?.toFixed(2) || '0.00'}</p>
                        {log.extra > 0 && <p className="text-xs text-gray-500">+£{log.extra.toFixed(2)} extra</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
          </div>
        </div>
      )}
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        <DashboardCard 
          title="Weekly Stops" 
          value={stats.weeklyStops}
          description="Click to view weekly stats"
          icon={TrendingUp}
          color="blue"
          trend={stats.weeklyTrend}
          onClick={() => {
            setActiveTab("weekly");
            // Scroll to the tabs section
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

      {/* Tabs Navigation - Seamless with Swipe Support */}
      <div className="mb-6 sm:mb-8" {...swipeHandlers}>
        <Tabs 
          defaultValue="entry" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-0 bg-transparent">
            {/* Swipe indicator for mobile */}
            <div className="col-span-full sm:hidden text-center mb-2">
              <div className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                <span>← Swipe to navigate →</span>
              </div>
            </div>
            <TabsTrigger 
              value="entry" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 py-4 px-2 sm:px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105 min-h-[48px]"
            >
              <Plus size={18} />
              <span className="font-medium text-xs sm:text-sm">Log Entry</span>
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 py-4 px-2 sm:px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105 min-h-[48px]"
            >
              <Calendar size={18} />
              <span className="font-medium text-xs sm:text-sm">Weekly</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invoice" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 py-4 px-2 sm:px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105 min-h-[48px]"
            >
              <FileText size={18} />
              <span className="font-medium text-xs sm:text-sm">Invoice</span>
            </TabsTrigger>
            <TabsTrigger 
              value="overview" 
              className="flex items-center justify-center space-x-1 sm:space-x-2 py-4 px-2 sm:px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105 min-h-[48px] hidden sm:flex"
            >
              <BarChart2 size={18} />
              <span className="font-medium text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Content - Seamless */}
          <TabsContent value="entry" className="mt-6">
            <div className="mb-6 px-4 sm:px-0">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mr-4 shadow-lg">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Log New Entry</h2>
              </div>
            </div>
            <StopEntryForm logs={logs} updateLogs={updateLogs} />
          </TabsContent>
          
          <TabsContent value="weekly" className="mt-6">
            <WeeklyStats logs={logs} />
          </TabsContent>
          
          <TabsContent value="invoice" className="mt-6">
            <InvoiceComparison logs={logs} />
          </TabsContent>
          
          <TabsContent value="overview" className="mt-6">
            <StatsOverview logs={logs} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Creator Credit */}
      <div className="text-center mt-8 mb-4">
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
  );
};

export default ModernDashboard;