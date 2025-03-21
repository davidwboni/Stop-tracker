import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { 
  BarChart2, 
  FileText, 
  Calendar, 
  Settings, 
  Plus, 
  User,
  TrendingUp,
  Award,
  DollarSign,
  Clock
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import StopEntryForm from "./StopEntryForm";
import WeeklyStats from "./WeeklyStats";
import InvoiceComparison from "./InvoiceComparison";
import PersonalWelcome from "./PersonalWelcome";
import { useSyncData } from "../hooks/useSyncData";

const DashboardCard = ({ title, value, description, icon: Icon, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs">{description}</p>
      </div>
      <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 text-${color}-500 dark:text-${color}-400`}>
        <Icon size={20} />
      </div>
    </div>
  </motion.div>
);

const WelcomeMessage = ({ userName, isNewUser }) => {
  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  
  if (currentHour < 12) {
    greeting = "Good morning";
  } else if (currentHour < 18) {
    greeting = "Good afternoon";
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 rounded-xl shadow-sm mb-8"
    >
      <h1 className="text-2xl font-bold mb-2">{greeting}, {userName || "Driver"}!</h1>
      {isNewUser ? (
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to Stop Tracker! This app will help you track your deliveries,
          verify your invoice accuracy, and maximize your earnings.
        </p>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          Ready to log today's deliveries? Your weekly stats are looking good!
        </p>
      )}
    </motion.div>
  );
};

const ModernDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("entry");
  const [isNewUser, setIsNewUser] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  
  const { 
    data: logs, 
    loading: logsLoading, 
    error: logsError,
    syncStatus,
    updateData: updateLogs
  } = useSyncData("logs");

  // Calculate summary stats
  const stats = React.useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        totalStops: 0,
        weeklyStops: 0,
        avgStopsPerDay: 0,
        estimatedEarnings: 0
      };
    }
    
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday as week start
    
    const weeklyLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= weekStart;
    });
    
    const totalStops = logs.reduce((sum, log) => sum + log.stops, 0);
    const weeklyStops = weeklyLogs.reduce((sum, log) => sum + log.stops, 0);
    const avgRate = 1.90; // Default average rate
    
    return {
      totalStops,
      weeklyStops,
      avgStopsPerDay: Math.round(weeklyStops / (weeklyLogs.length || 1)),
      estimatedEarnings: Math.round(totalStops * avgRate)
    };
  }, [logs]);

  useEffect(() => {
    // Check if user is new (no logs)
    if (logs !== null) {
      setIsNewUser(logs.length === 0);
    }
    
    // Load user preferences
    const loadPreferences = async () => {
      // This would normally come from your Firebase data
      setUserPreferences({
        theme: 'light',
        paymentSettings: {
          ratePerStop: 1.90,
          bonusThreshold: 150,
          bonusAmount: 10
        }
      });
    };
    
    loadPreferences();
  }, [logs]);

  if (logsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* New PersonalWelcome component */}
      <PersonalWelcome />
      
      {/* Standard welcome message now below the personal one */}
      <WelcomeMessage 
        userName={user?.displayName?.split(' ')[0]} 
        isNewUser={isNewUser}
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full overflow-hidden">
          <TabsTrigger value="entry" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Log Entry
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="invoice" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-sm">
            <FileText className="w-4 h-4 mr-2" />
            Invoice
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 text-sm">
            <BarChart2 className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
          <DashboardCard 
            title="Weekly Stops" 
            value={stats.weeklyStops}
            description="Current week"
            icon={TrendingUp}
            color="blue"
          />
          <DashboardCard 
            title="Daily Average" 
            value={stats.avgStopsPerDay}
            description="Stops per day"
            icon={Clock}
            color="purple"
          />
          <DashboardCard 
            title="Total Earnings" 
            value={`£${stats.estimatedEarnings}`}
            description="Estimated"
            icon={DollarSign}
            color="green"
          />
          <DashboardCard 
            title="Total Stops" 
            value={stats.totalStops}
            description="All time"
            icon={Award}
            color="amber"
          />
        </div>

        {/* Tab Content */}
        <TabsContent value="entry" className="pt-4">
          <StopEntryForm logs={logs} updateLogs={updateLogs} syncStatus={syncStatus} />
        </TabsContent>
        
        <TabsContent value="weekly" className="pt-4">
          <WeeklyStats logs={logs} />
        </TabsContent>
        
        <TabsContent value="invoice" className="pt-4">
          <InvoiceComparison logs={logs} />
        </TabsContent>
        
        <TabsContent value="stats" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 dark:text-gray-400">
                {user?.role === 'pro' ? (
                  "Detailed statistics available here"
                ) : (
                  "Upgrade to Pro to access detailed statistics"
                )}
              </p>
              {user?.role !== 'pro' && (
                <Button className="mt-4 mx-auto block bg-blue-500 hover:bg-blue-600 text-white">
                  Upgrade to Pro
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernDashboard;