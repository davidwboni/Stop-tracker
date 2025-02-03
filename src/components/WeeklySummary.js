import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, CalendarDays } from "lucide-react";

const WeeklySummary = ({ logs }) => {
  const weeklySummary = useMemo(() => {
    const weeks = {};

    logs.forEach((log) => {
      const date = new Date(log.date);
      const weekNum = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNum}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekNumber: weekNum,
          startDate: getWeekStart(date),
          stops: 0,
          earnings: 0,
          days: new Set(),
          dailyData: [],
        };
      }

      weeks[weekKey].stops += log.stops;
      weeks[weekKey].earnings += log.total;
      weeks[weekKey].days.add(log.date);
      weeks[weekKey].dailyData.push({
        date: new Date(log.date).toLocaleDateString("en-GB", { weekday: "short" }),
        stops: log.stops,
        earnings: log.total,
      });
    });

    return Object.entries(weeks)
      .map(([key, data]) => ({
        ...data,
        weekKey: key,
        daysWorked: data.days.size,
        averageStops: Math.round(data.stops / data.days.size) || 0,
        averageEarnings: (data.earnings / data.days.size).toFixed(2) || 0,
      }))
      .sort((a, b) => b.startDate - a.startDate);
  }, [logs]);

  const StatCard = ({ title, value, subtitle, icon: Icon }) => (
    <motion.div
      whileHover={{ y: -2, scale: 1.02, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)" }}
      className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1 text-gray-700 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
          <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {weeklySummary.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-300">
          No data available for the selected period.
        </div>
      )}
      {weeklySummary.map((week) => (
        <motion.div
          key={week.weekKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-bold">Week {week.weekNumber}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {week.startDate.toLocaleDateString("en-GB")} -{" "}
                  {new Date(week.startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Stops"
                  value={week.stops}
                  subtitle={`${week.daysWorked} days worked`}
                  icon={CalendarDays}
                />
                <StatCard
                  title="Average Stops"
                  value={week.averageStops}
                  subtitle="per day"
                  icon={TrendingUp}
                />
                <StatCard
                  title="Total Earnings"
                  value={`£${week.earnings.toFixed(2)}`}
                  subtitle={`£${week.averageEarnings} per day`}
                  icon={DollarSign}
                />
              </div>

              {/* Weekly Performance Chart */}
              {week.dailyData.length > 0 && (
                <div className="h-[250px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={week.dailyData}>
                      <defs>
                        <linearGradient
                          id={`gradient-${week.weekNumber}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="stops"
                        stroke="#8b5cf6"
                        fill={`url(#gradient-${week.weekNumber})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Helper functions
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export default WeeklySummary;