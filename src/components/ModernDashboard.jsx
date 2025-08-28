import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
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

const DashboardCard = ({ title, value, description, icon: Icon, color, trend }) => (
  <div 
    className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105 cursor-pointer group`}
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}
  >
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2 tracking-wide">{title}</p>
        <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{value}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
          {description}
          {trend && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 
              trend < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </p>
      </div>
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-${color}-100 to-${color}-200 dark:from-${color}-900/30 dark:to-${color}-800/30 text-${color}-600 dark:text-${color}-400 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

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
      return "Welcome to Stop Tracker! Let's start tracking your deliveries and maximizing your earnings.";
    }
    if (todayAlreadyLogged) {
      return "Great job logging today's deliveries! Check your stats below.";
    }
    const messages = [
      "Ready to conquer today's deliveries?",
      "Let's make today profitable!",
      "Time to track those stops and earnings!",
      "Another day, another opportunity to maximize earnings!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };
  
  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 text-white p-8 rounded-2xl shadow-xl mb-8 sticky top-0 z-10"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white opacity-5 rounded-full"></div>
      
      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-3 tracking-tight">
          {greeting}, {userName?.split(' ')[0] || "Driver"}! 👋
        </h1>
        <p className="text-blue-100 text-lg font-medium opacity-90">
          {getMotivationalMessage()}
        </p>
      </div>
    </div>
  );
};

const ModernDashboard = () => {
  const { user } = useAuth();
  const { logs, updateLogs, loading, isNewUser, paymentConfig } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("entry");
  const [showWelcome, setShowWelcome] = useState(true);
  
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
  
  // Handle scroll to hide welcome message
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowWelcome(false);
      } else {
        setShowWelcome(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 w-full"> {/* Removed fixed padding bottom */}
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
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
        <DashboardCard 
          title="Weekly Stops" 
          value={stats.weeklyStops}
          description="Current week"
          icon={TrendingUp}
          color="blue"
          trend={stats.weeklyTrend}
        />
        <DashboardCard 
          title="Daily Average" 
          value={stats.avgStopsPerDay}
          description="This week"
          icon={Clock}
          color="purple"
          trend={stats.avgTrend}
        />
        <DashboardCard 
          title="Weekly Earnings" 
          value={`£${stats.weeklyEarnings}`}
          description="This week"
          icon={DollarSign}
          color="green"
          trend={stats.earningsTrend}
        />
        <DashboardCard 
          title="Total Stops" 
          value={stats.totalStops}
          description="All time"
          icon={Award}
          color="amber"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 mb-8 overflow-hidden">
        <Tabs 
          defaultValue="entry" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 lg:grid-cols-4 gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 m-2 rounded-xl">
            <TabsTrigger 
              value="entry" 
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105"
            >
              <Plus size={18} />
              <span className="font-medium">Log Entry</span>
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105"
            >
              <Calendar size={18} />
              <span className="font-medium">Weekly Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invoice" 
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105"
            >
              <FileText size={18} />
              <span className="font-medium">Invoice Check</span>
            </TabsTrigger>
            <TabsTrigger 
              value="overview" 
              className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white dark:hover:bg-gray-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transform hover:scale-105 hidden lg:flex"
            >
              <BarChart2 size={18} />
              <span className="font-medium">Overview</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Tab Content */}
          <TabsContent value="entry" className="p-6">
            <h2 className="text-xl font-bold mb-4">Log New Entry</h2>
            <StopEntryForm logs={logs} updateLogs={updateLogs} />
          </TabsContent>
          
          <TabsContent value="weekly" className="p-6">
            <WeeklyStats logs={logs} />
          </TabsContent>
          
          <TabsContent value="invoice" className="p-6">
            <InvoiceComparison logs={logs} />
          </TabsContent>
          
          <TabsContent value="overview" className="p-6">
            <StatsOverview logs={logs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ModernDashboard;