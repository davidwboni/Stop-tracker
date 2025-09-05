import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useData } from "../contexts/DataContext";

const StatsOverview = ({ logs = [], loading = false }) => {
  // Try to get data from context as fallback if props are not provided
  const contextData = useData();
  
  // Use props first, then context data, then default empty values
  const safetyLogs = logs?.length ? logs : (contextData?.logs || []);
  const isLoading = loading || (contextData?.loading || false);

  // COLORS
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Empty data sets for when no data is available
  const emptyWeeklyData = Array(7).fill(0).map((_, i) => ({
    name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
    fullDate: format(addDays(startOfWeek(new Date()), i), 'MMM dd'),
    stops: 0,
    date: addDays(startOfWeek(new Date()), i)
  }));
  
  const emptyDayOfWeekData = Array(7).fill(0).map((_, i) => ({
    name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
    stops: 0,
    count: 0,
    average: 0
  }));

  const emptyMonthlyData = Array(3).fill(0).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 2 + i);
    return {
      name: format(date, 'MMM yyyy'),
      stops: 0,
      entries: 0,
      date: new Date(date.getFullYear(), date.getMonth(), 1)
    };
  });
  
  // Process data for charts
  const chartData = useMemo(() => {
    if (!safetyLogs || safetyLogs.length === 0) {
      return {
        weeklyData: emptyWeeklyData,
        monthlyData: emptyMonthlyData,
        dayOfWeekData: emptyDayOfWeekData
      };
    }

    try {
      // Group by month
      const monthlyMap = {};
      safetyLogs.forEach(log => {
        if (!log || !log.date) return;
        
        try {
          const date = new Date(log.date);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = {
              name: format(date, 'MMM yyyy'),
              stops: 0,
              entries: 0,
              date: new Date(date.getFullYear(), date.getMonth(), 1)
            };
          }
          monthlyMap[monthKey].stops += log.stops || 0;
          monthlyMap[monthKey].entries += 1;
        } catch (e) {
          console.error("Error processing log for monthly data:", e);
        }
      });

      const monthlyData = Object.values(monthlyMap).sort((a, b) => a.date - b.date);

      // Group by week
      const now = new Date();
      const currentWeekStart = startOfWeek(now);
      const currentWeekEnd = endOfWeek(now);
      
      const daysInWeek = eachDayOfInterval({
        start: currentWeekStart,
        end: currentWeekEnd
      });
      
      const weeklyMap = {};
      daysInWeek.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        weeklyMap[dayKey] = {
          name: format(day, 'E'),
          fullDate: format(day, 'MMM dd'),
          stops: 0,
          date: day
        };
      });
      
      safetyLogs.forEach(log => {
        if (!log || !log.date) return;
        
        try {
          const date = new Date(log.date);
          const dayKey = format(date, 'yyyy-MM-dd');
          if (weeklyMap[dayKey]) {
            weeklyMap[dayKey].stops += log.stops || 0;
          }
        } catch (e) {
          console.error("Error processing log for weekly data:", e);
        }
      });
      
      const weeklyData = Object.values(weeklyMap).sort((a, b) => a.date - b.date);

      // Group by day of week
      const dayOfWeekMap = Array(7).fill(0).map((_, i) => ({
        name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        stops: 0,
        count: 0
      }));
      
      safetyLogs.forEach(log => {
        if (!log || !log.date) return;
        
        try {
          const date = new Date(log.date);
          const dayOfWeek = date.getDay();
          dayOfWeekMap[dayOfWeek].stops += log.stops || 0;
          dayOfWeekMap[dayOfWeek].count += 1;
        } catch (e) {
          console.error("Error processing log for day of week data:", e);
        }
      });
      
      dayOfWeekMap.forEach(day => {
        if (day.count > 0) {
          day.average = Math.round(day.stops / day.count);
        } else {
          day.average = 0;
        }
      });

      return {
        weeklyData,
        monthlyData,
        dayOfWeekData: dayOfWeekMap
      };
    } catch (e) {
      console.error("Error processing chart data:", e);
      return {
        weeklyData: emptyWeeklyData,
        monthlyData: emptyMonthlyData,
        dayOfWeekData: emptyDayOfWeekData
      };
    }
  }, [safetyLogs]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!safetyLogs || safetyLogs.length === 0) {
      return {
        totalStops: 0,
        totalDays: 0,
        avgStopsPerDay: 0,
        bestDay: { date: null, stops: 0 },
        worstDay: { date: null, stops: 0 }
      };
    }

    try {
      // Map of dates to total stops
      const dateMap = {};
      safetyLogs.forEach(log => {
        if (!log || !log.date) return;
        
        if (!dateMap[log.date]) {
          dateMap[log.date] = 0;
        }
        dateMap[log.date] += log.stops || 0;
      });

      const totalStops = safetyLogs.reduce((sum, log) => sum + (log?.stops || 0), 0);
      const totalDays = Object.keys(dateMap).length;
      const avgStopsPerDay = totalDays > 0 ? Math.round(totalStops / totalDays) : 0;

      // Find best and worst days
      let bestDay = { date: null, stops: 0 };
      let worstDay = { date: null, stops: Number.MAX_SAFE_INTEGER };

      Object.entries(dateMap).forEach(([date, stops]) => {
        if (stops > bestDay.stops) {
          bestDay = { date, stops };
        }
        if (stops < worstDay.stops) {
          worstDay = { date, stops };
        }
      });

      return {
        totalStops,
        totalDays,
        avgStopsPerDay,
        bestDay,
        worstDay: worstDay.date ? worstDay : { date: null, stops: 0 }
      };
    } catch (e) {
      console.error("Error calculating overall stats:", e);
      return {
        totalStops: 0,
        totalDays: 0,
        avgStopsPerDay: 0,
        bestDay: { date: null, stops: 0 },
        worstDay: { date: null, stops: 0 }
      };
    }
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 -mx-6 -mt-6">
      {/* Header */}
      <div className="px-4 py-4 bg-white dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Statistics Overview
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your delivery insights
          </p>
        </div>
      </div>
      
      {/* SUMMARY CARDS */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{overallStats.totalStops}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Stops</p>
              <p className="text-xs text-gray-400">{overallStats.totalDays} days</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{overallStats.avgStopsPerDay}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Daily Avg</p>
              <p className="text-xs text-gray-400">per day</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{overallStats.bestDay.stops}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Best Day</p>
              <p className="text-xs text-gray-400">
                {overallStats.bestDay.date ? 
                  format(new Date(overallStats.bestDay.date), 'MMM dd') : 
                  'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WEEKLY CHART */}
      <div className="px-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week's Stops</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.weeklyData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    formatter={(value) => [`${value} stops`, 'Stops']}
                    labelFormatter={(label) => {
                      const day = chartData.weeklyData.find(d => d.name === label);
                      return day ? day.fullDate : label;
                    }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="stops" fill="#3B82F6" name="Stops" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MONTHLY TREND */}
      <div className="px-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.monthlyData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    formatter={(value) => [`${value} stops`, 'Stops']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="stops" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} name="Total Stops" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DAY OF WEEK AVERAGES - Single column on mobile */}
      <div className="px-4 space-y-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Stops by Day</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.dayOfWeekData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'average' ? 'Average Stops' : 'Total Stops']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="average" fill="#8884d8" name="Average Stops" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.dayOfWeekData.filter(d => d.stops > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="stops"
                    fontSize={10}
                  >
                    {chartData.dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} stops`, 'Stops']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper function for adding days to dates in empty data generation
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default StatsOverview;