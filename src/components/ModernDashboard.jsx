import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

const DashboardCard = ({ title, value, description, icon: Icon, color, trend, onClick }) => {
  const colorGradients = {
    blue: 'from-blue-500/10 via-blue-400/5 to-blue-600/10',
    purple: 'from-purple-500/10 via-purple-400/5 to-purple-600/10',
    green: 'from-green-500/10 via-green-400/5 to-green-600/10',
    amber: 'from-amber-500/10 via-amber-400/5 to-amber-600/10'
  };

  const iconColors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105 cursor-pointer group backdrop-blur-sm border border-white/20 dark:border-gray-700/50 ${onClick ? 'hover:shadow-xl active:scale-95' : ''}`}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2 tracking-wide">{title}</p>
          <h3 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{value}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1">
            {description}
            {trend && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                trend > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                trend < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </p>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${iconColors[color]} text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <Icon size={24} />
        </div>
      </div>
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
    <div 
      className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 text-white p-8 rounded-2xl shadow-xl mb-8"
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 w-full"> {/* Enhanced mobile padding */}
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

      {/* Recent Entries Summary - Always visible */}
      {logs && logs.length > 0 && (
        <div className="mb-8">
          <Card className="overflow-hidden shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 border-0">
            <CardHeader className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white py-6">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-xl mr-3 backdrop-blur-sm">
                  <Clock className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold">Recent Entries</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {logs.slice(-3).reverse().map((log, index) => (
                  <motion.div
                    key={log.id || log.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-apple-button transition-all duration-300"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{new Date(log.date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{log.stops} stops</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">£{log.total?.toFixed(2) || '0.00'}</p>
                        {log.extra > 0 && <p className="text-xs text-gray-500">+£{log.extra} extra</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
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
          onClick={() => setActiveTab("weekly")}
        />
        <DashboardCard 
          title="Daily Average" 
          value={stats.avgStopsPerDay}
          description="Click for detailed overview"
          icon={Clock}
          color="purple"
          trend={stats.avgTrend}
          onClick={() => setActiveTab("overview")}
        />
        <DashboardCard 
          title="Weekly Earnings" 
          value={`£${stats.weeklyEarnings}`}
          description="Click for invoice comparison"
          icon={DollarSign}
          color="green"
          trend={stats.earningsTrend}
          onClick={() => setActiveTab("invoice")}
        />
        <DashboardCard 
          title="Total Stops" 
          value={stats.totalStops}
          description="Click for complete overview"
          icon={Award}
          color="amber"
          onClick={() => setActiveTab("overview")}
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
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 m-2 rounded-xl">
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
          
          {/* Tab Content */}
          <TabsContent value="entry" className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Log New Entry</h2>
            <StopEntryForm logs={logs} updateLogs={updateLogs} />
          </TabsContent>
          
          <TabsContent value="weekly" className="p-4 sm:p-6">
            <WeeklyStats logs={logs} />
          </TabsContent>
          
          <TabsContent value="invoice" className="p-4 sm:p-6">
            <InvoiceComparison logs={logs} />
          </TabsContent>
          
          <TabsContent value="overview" className="p-4 sm:p-6">
            <StatsOverview logs={logs} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ModernDashboard;