import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Plus, TrendingUp, FileCheck } from "lucide-react";

const DashboardCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <motion.div
    whileHover={{
      y: -2,
      scale: 1.02,
      boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)",
    }}
    className="bg-gradient-to-r from-[var(--background)] to-[var(--background)] dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-md"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--text)] dark:text-[var(--text)]">{title}</p>
        <h3 className={`text-3xl font-bold mt-1 ${color}`}>{value}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{subtitle}</p>
        )}
      </div>
      <div
        className={`${color} opacity-90 p-3 bg-gray-100 dark:bg-gray-700 rounded-full`}
      >
        <Icon size={28} />
      </div>
    </div>
  </motion.div>
);

const StatsOverview = ({ logs }) => {
  const totalStops = logs.reduce((sum, entry) => sum + entry.stops, 0);
  const averageStops = Math.round(totalStops / logs.length) || 0;
  const bestDay = logs.reduce(
    (best, entry) =>
      entry.stops > (best?.stops || 0) ? entry : best,
    null
  );

  const weeklyData = React.useMemo(() => {
    return logs.slice(-7).map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      stops: entry.stops,
      earnings: entry.total,
    }));
  }, [logs]);

  const monthlyData = React.useMemo(() => {
    const grouped = logs.reduce((acc, entry) => {
      const month = new Date(entry.date).toLocaleDateString("en-US", {
        month: "short",
      });
      if (!acc[month]) acc[month] = { stops: 0, earnings: 0, count: 0 };
      acc[month].stops += entry.stops;
      acc[month].earnings += entry.total;
      acc[month].count += 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([month, stats]) => ({
      month,
      averageStops: Math.round(stats.stops / stats.count),
      totalEarnings: stats.earnings,
    }));
  }, [logs]);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-[var(--background)] to-white dark:from-gray-900 dark:to-[var(--background)]">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Today's Stops"
          value={logs[logs.length - 1]?.stops || 0}
          subtitle="Latest entry"
          icon={Plus}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <DashboardCard
          title="Average Stops"
          value={averageStops}
          subtitle="All time"
          icon={TrendingUp}
          color="text-purple-600 dark:text-purple-400"
        />
        <DashboardCard
          title="Best Day"
          value={bestDay?.stops || 0}
          subtitle={bestDay ? new Date(bestDay.date).toLocaleDateString() : "No data"}
          icon={FileCheck}
          color="text-blue-600 dark:text-blue-400"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="stops" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="averageStops" stroke="var(--primary)" strokeWidth={2} />
                    <Line type="monotone" dataKey="totalEarnings" stroke="var(--secondary)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsOverview;