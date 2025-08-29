import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  format, 
  parseISO, 
  isWithinInterval, 
  sub 
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  TrendingUp, 
  TrendingDown 
} from "lucide-react";

const WeeklyStats = ({ logs = [] }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [chartType, setChartType] = useState("bar"); // bar, area, line
  
  // Ensure logs is an array with useMemo to avoid dependency issues
  const safetyLogs = useMemo(() => logs || [], [logs]);
  
  // Calculate the selected week's date range
  const selectedWeek = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 }); // Monday as week start
    const end = endOfWeek(start, { weekStartsOn: 1 });
    
    return {
      start,
      end,
      formatted: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
    };
  }, [weekOffset]);
  
  // Filter logs for the selected week
  const weeklyLogs = useMemo(() => {
    return safetyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: selectedWeek.start, end: selectedWeek.end });
    });
  }, [safetyLogs, selectedWeek]);
  
  // Create week array for visualization
  const weekDays = useMemo(() => {
    const days = [];
    const dayFormat = "EEE";
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(selectedWeek.start, i);
      const dayName = format(date, dayFormat);
      const formattedDate = format(date, "yyyy-MM-dd");
      
      // Find matching log entry or use default values
      const logEntry = weeklyLogs.find(log => log.date === formattedDate);
      
      days.push({
        day: dayName,
        date: formattedDate,
        stops: logEntry ? logEntry.stops : 0,
        earnings: logEntry ? logEntry.total : 0,
        hasData: !!logEntry
      });
    }
    
    return days;
  }, [selectedWeek, weeklyLogs]);
  
  // Calculate summary stats for the week
  const weekSummary = useMemo(() => {
    const totalStops = weeklyLogs.reduce((sum, log) => sum + log.stops, 0);
    const totalEarnings = weeklyLogs.reduce((sum, log) => sum + log.total, 0);
    const daysWorked = weeklyLogs.length;
    const avgStopsPerDay = daysWorked > 0 ? Math.round(totalStops / daysWorked) : 0;
    
    // Get previous week
    const prevWeekStart = startOfWeek(sub(selectedWeek.start, { days: 7 }), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
    
    const prevWeekLogs = safetyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: prevWeekStart, end: prevWeekEnd });
    });
    
    const prevWeekStops = prevWeekLogs.reduce((sum, log) => sum + log.stops, 0);
    const prevWeekEarnings = prevWeekLogs.reduce((sum, log) => sum + log.total, 0);
    
    const stopsChange = prevWeekStops > 0 
      ? Math.round(((totalStops - prevWeekStops) / prevWeekStops) * 100) 
      : 0;
      
    const earningsChange = prevWeekEarnings > 0 
      ? Math.round(((totalEarnings - prevWeekEarnings) / prevWeekEarnings) * 100) 
      : 0;
    
    return {
      totalStops,
      totalEarnings,
      daysWorked,
      avgStopsPerDay,
      stopsChange,
      earningsChange
    };
  }, [weeklyLogs, safetyLogs, selectedWeek.start]);
  
  const handlePrevWeek = () => {
    setWeekOffset(prev => prev - 1);
  };
  
  const handleNextWeek = () => {
    if (weekOffset < 0) {
      setWeekOffset(prev => prev + 1);
    }
  };
  
  const handleCurrentWeek = () => {
    setWeekOffset(0);
  };
  
  const StatCard = ({ title, value, subtitle, icon: Icon, change, color, gradient }) => (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="bg-white/95 dark:bg-gray-800/95 rounded-3xl p-6 shadow-apple-card hover:shadow-apple-card-hover border border-gray-200/50 dark:border-gray-700/50 group cursor-pointer backdrop-blur-sm"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white transition-all duration-300">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`p-4 rounded-2xl ${gradient || 'bg-gradient-to-br from-blue-500 to-indigo-600'} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className={`flex items-center text-sm font-semibold px-3 py-1 rounded-full ${
            change >= 0 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(change)}% vs last week
          </div>
        </div>
      )}
    </motion.div>
  );
  
  const renderChart = () => {
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Stops: {payload[0].value}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Earnings: £{payload[1]?.value?.toFixed(2)}
            </p>
          </div>
        );
      }
    
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height={300}>
        {chartType === "bar" ? (
          <BarChart data={weekDays} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="stops" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar yAxisId="right" dataKey="earnings" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        ) : chartType === "area" ? (
          <AreaChart data={weekDays} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip content={<CustomTooltip />} />
            <Area yAxisId="left" type="monotone" dataKey="stops" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
            <Area yAxisId="right" type="monotone" dataKey="earnings" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
          </AreaChart>
        ) : (
          <LineChart data={weekDays} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="stops" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="earnings" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6">
          <CardTitle className="text-lg">Weekly Summary</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handlePrevWeek} 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleCurrentWeek} 
              variant="outline" 
              size="sm"
              className={`text-xs ${weekOffset === 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
            >
              Current Week
            </Button>
            <Button 
              onClick={handleNextWeek} 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          <h3 className="text-xl font-semibold text-center mb-6">{selectedWeek.formatted}</h3>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Total Stops" 
              value={weekSummary.totalStops}
              subtitle={`${weekSummary.daysWorked} days worked`}
              icon={Clock}
              change={weekSummary.stopsChange}
              color="bg-blue-100 text-blue-500 dark:bg-blue-900 dark:text-blue-300"
            />
            <StatCard 
              title="Daily Average" 
              value={weekSummary.avgStopsPerDay}
              subtitle="stops per day"
              icon={Calendar}
              color="bg-purple-100 text-purple-500 dark:bg-purple-900 dark:text-purple-300"
            />
            <StatCard 
              title="Total Earnings" 
              value={`£${weekSummary.totalEarnings.toFixed(2)}`}
              subtitle="this week"
              icon={DollarSign}
              change={weekSummary.earningsChange}
              color="bg-green-100 text-green-500 dark:bg-green-900 dark:text-green-300"
            />
            <StatCard 
              title="Projected" 
              value={`£${(weekSummary.totalEarnings / (weekSummary.daysWorked || 1) * 5).toFixed(2)}`}
              subtitle="5-day week"
              icon={Star}
              color="bg-amber-100 text-amber-500 dark:bg-amber-900 dark:text-amber-300"
            />
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex justify-center space-x-2 mb-4">
            <Button
              onClick={() => setChartType("bar")}
              variant={chartType === "bar" ? "primary" : "outline"}
              size="sm"
              className="text-xs"
            >
              Bar
            </Button>
            <Button
              onClick={() => setChartType("area")}
              variant={chartType === "area" ? "primary" : "outline"}
              size="sm"
              className="text-xs"
            >
              Area
            </Button>
            <Button
              onClick={() => setChartType("line")}
              variant={chartType === "line" ? "primary" : "outline"}
              size="sm"
              className="text-xs"
            >
              Line
            </Button>
          </div>
          
          {/* Chart */}
          <div className="mt-6">
            {weeklyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Calendar className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No data for this week</p>
                {weekOffset !== 0 && (
                  <Button 
                    onClick={handleCurrentWeek}
                    variant="link" 
                    className="mt-2 text-blue-600 dark:text-blue-400"
                  >
                    Go to current week
                  </Button>
                )}
              </div>
            ) : (
              renderChart()
            )}
          </div>
          
          {/* Daily Breakdown */}
          <div className="mt-8">
            <h4 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">Daily Breakdown</h4>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stops</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Earnings</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {weekDays.map((day) => (
                    <tr 
                      key={day.date}
                      className={day.hasData ? "" : "bg-gray-50 dark:bg-gray-800"}
                    >
                      <td className="px-4 py-3 text-sm font-medium">{day.day}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {format(parseISO(day.date), "MMM d")}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {day.hasData ? day.stops : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                        {day.hasData ? `£${day.earnings.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td colSpan="2" className="px-4 py-3 text-sm font-semibold">Total</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{weekSummary.totalStops}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                      £{weekSummary.totalEarnings.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 4-Week Projection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
            <h3 className="text-lg font-medium mb-2">4-Week Projection</h3>
            <p className="text-3xl font-bold mb-2">
              £{((weekSummary.totalEarnings / (weekSummary.daysWorked || 1)) * 20).toFixed(2)}
            </p>
            <p className="text-blue-100 text-sm">
              Based on your average of £{(weekSummary.totalEarnings / (weekSummary.daysWorked || 1)).toFixed(2)} per day
              over {weekSummary.daysWorked || 0} days worked.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyStats;