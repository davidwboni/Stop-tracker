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
    <div className="bg-white dark:bg-gray-700/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
          <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight mt-1">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-xl ${gradient || 'bg-gradient-to-br from-blue-500 to-indigo-600'} flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center pt-2 mt-2 border-t border-gray-100 dark:border-gray-600">
          <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
            change >= 0 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change)}%
          </div>
        </div>
      )}
    </div>
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
      <ResponsiveContainer width="100%" height={200}>
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
    <div className="space-y-4 -mx-6 -mt-6">
      {/* Week Navigation */}
      <Card className="mx-0 rounded-none border-0 shadow-none bg-white dark:bg-gray-800">
        <CardHeader className="px-4 pb-4">
          <div className="text-center mb-4">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2">Weekly Summary</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedWeek.formatted}</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Button 
              onClick={handlePrevWeek} 
              variant="ghost" 
              size="sm"
              className="h-9 w-9 p-0 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleCurrentWeek} 
              variant="outline" 
              size="sm"
              className={`text-xs font-medium px-4 py-2 h-9 rounded-full ${weekOffset === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700'}`}
            >
              This Week
            </Button>
            <Button 
              onClick={handleNextWeek} 
              variant="ghost" 
              size="sm"
              className="h-9 w-9 p-0 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {/* Stats Grid - Mobile optimized */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard 
              title="Total Stops" 
              value={weekSummary.totalStops}
              subtitle={`${weekSummary.daysWorked} days`}
              icon={Clock}
              change={weekSummary.stopsChange}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard 
              title="Daily Avg" 
              value={weekSummary.avgStopsPerDay}
              subtitle="per day"
              icon={Calendar}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatCard 
              title="Earnings" 
              value={`£${weekSummary.totalEarnings.toFixed(0)}`}
              subtitle="this week"
              icon={DollarSign}
              change={weekSummary.earningsChange}
              gradient="bg-gradient-to-br from-green-500 to-green-600"
            />
            <StatCard 
              title="Projected" 
              value={`£${(weekSummary.totalEarnings / (weekSummary.daysWorked || 1) * 5).toFixed(0)}`}
              subtitle="5-day week"
              icon={Star}
              gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            />
          </div>
          
          {/* Chart Type Selector - Mobile friendly */}
          <div className="flex justify-center space-x-1 mb-4">
            <Button
              onClick={() => setChartType("bar")}
              size="sm"
              className={`text-xs font-medium px-3 py-2 h-8 rounded-full ${chartType === "bar" ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              Bar
            </Button>
            <Button
              onClick={() => setChartType("area")}
              size="sm"
              className={`text-xs font-medium px-3 py-2 h-8 rounded-full ${chartType === "area" ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              Area
            </Button>
            <Button
              onClick={() => setChartType("line")}
              size="sm"
              className={`text-xs font-medium px-3 py-2 h-8 rounded-full ${chartType === "line" ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              Line
            </Button>
          </div>
          
          {/* Chart */}
          <div className="mt-4">
            {weeklyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <Calendar className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No data for this week</p>
                {weekOffset !== 0 && (
                  <Button 
                    onClick={handleCurrentWeek}
                    size="sm"
                    className="text-blue-600 dark:text-blue-400 text-xs"
                    variant="link"
                  >
                    Go to current week
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ height: '200px' }}>
                {renderChart()}
              </div>
            )}
          </div>
          
          {/* Daily Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">Daily Breakdown</h4>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {weekDays.map((day) => (
                  <div 
                    key={day.date}
                    className={`flex items-center justify-between p-3 ${!day.hasData ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white w-10">
                        {day.day}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(parseISO(day.date), "MMM d")}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-right">
                        {day.hasData ? day.stops : "-"}
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 text-right w-16">
                        {day.hasData ? `£${day.earnings.toFixed(0)}` : "-"}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Total</div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-semibold">{weekSummary.totalStops}</div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400 w-16 text-right">
                        £{weekSummary.totalEarnings.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 4-Week Projection Card */}
      <Card className="mx-0 rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white">
            <h3 className="text-sm font-medium mb-2 opacity-90">4-Week Projection</h3>
            <p className="text-2xl font-bold mb-2">
              £{((weekSummary.totalEarnings / (weekSummary.daysWorked || 1)) * 20).toFixed(0)}
            </p>
            <p className="text-blue-100 text-xs leading-relaxed">
              Based on £{(weekSummary.totalEarnings / (weekSummary.daysWorked || 1)).toFixed(0)}/day average
              over {weekSummary.daysWorked || 0} days worked this week.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyStats;