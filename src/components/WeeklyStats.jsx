import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
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
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";

const WeeklyStats = ({ logs = [] }) => {
  const [weekOffset, setWeekOffset] = useState(0);

  const safetyLogs = useMemo(() => logs || [], [logs]);

  const selectedWeek = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });

    return {
      start,
      end,
      formatted: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
    };
  }, [weekOffset]);

  const weeklyLogs = useMemo(() => {
    return safetyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: selectedWeek.start, end: selectedWeek.end });
    });
  }, [safetyLogs, selectedWeek]);

  const weekDays = useMemo(() => {
    const days = [];
    const dayFormat = "EEE";

    for (let i = 0; i < 7; i++) {
      const date = addDays(selectedWeek.start, i);
      const dayName = format(date, dayFormat);
      const formattedDate = format(date, "yyyy-MM-dd");

      const logEntry = weeklyLogs.find(log => log.date === formattedDate);

      days.push({
        day: dayName,
        date: formattedDate,
        dateShort: format(date, "d MMM"),
        stops: logEntry ? logEntry.stops : 0,
        earnings: logEntry ? logEntry.total : 0,
        hasData: !!logEntry
      });
    }

    return days;
  }, [selectedWeek, weeklyLogs]);

  const weekSummary = useMemo(() => {
    const totalStops = weeklyLogs.reduce((sum, log) => sum + log.stops, 0);
    const totalEarnings = weeklyLogs.reduce((sum, log) => sum + log.total, 0);
    const daysWorked = weeklyLogs.length;
    const avgStopsPerDay = daysWorked > 0 ? Math.round(totalStops / daysWorked) : 0;
    const avgEarningsPerDay = daysWorked > 0 ? (totalEarnings / daysWorked).toFixed(2) : 0;

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
      avgEarningsPerDay,
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

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-4">
          <div className="text-center mb-4">
            <CardTitle className="text-lg mb-1">
              {selectedWeek.formatted}
            </CardTitle>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handlePrevWeek}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </motion.div>
            <Button
              onClick={handleCurrentWeek}
              className={`text-xs font-medium px-4 h-10 rounded-full ${
                weekOffset === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              This Week
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleNextWeek}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-full disabled:opacity-50"
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </CardHeader>

        {/* Summary Stats Grid */}
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-lg p-4 border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Stops</span>
                <Package className="w-4 h-4 text-primary opacity-60" />
              </div>
              <div className="text-2xl font-bold mb-1">{weekSummary.totalStops}</div>
              {weekSummary.stopsChange !== 0 && (
                <div className={`flex items-center text-xs font-medium ${
                  weekSummary.stopsChange >= 0
                    ? 'text-green-500'
                    : 'text-destructive'
                }`}>
                  {weekSummary.stopsChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(weekSummary.stopsChange)}% vs last week
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-lg p-4 border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Earnings</span>
                <DollarSign className="w-4 h-4 text-accent opacity-60" />
              </div>
              <div className="text-2xl font-bold text-primary mb-1">£{weekSummary.totalEarnings.toFixed(2)}</div>
              {weekSummary.earningsChange !== 0 && (
                <div className={`flex items-center text-xs font-medium ${
                  weekSummary.earningsChange >= 0
                    ? 'text-green-500'
                    : 'text-destructive'
                }`}>
                  {weekSummary.earningsChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(weekSummary.earningsChange)}% vs last week
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-lg p-4 border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Days Worked</span>
                <Calendar className="w-4 h-4 text-secondary opacity-60" />
              </div>
              <div className="text-2xl font-bold">{weekSummary.daysWorked}</div>
              <div className="text-xs text-muted-foreground mt-1">out of 7 days</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-lg p-4 border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Per Day</span>
                <TrendingUp className="w-4 h-4 text-primary opacity-60" />
              </div>
              <div className="text-2xl font-bold">£{weekSummary.avgEarningsPerDay}</div>
              <div className="text-xs text-muted-foreground mt-1">{weekSummary.avgStopsPerDay} stops</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      {weekDays.some(day => day.hasData) && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weekDays.map((day, index) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    day.hasData
                      ? 'bg-card border-border/50'
                      : 'bg-muted/30 border-border/25'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{day.day}</div>
                    <div className="text-xs text-muted-foreground">{day.dateShort}</div>
                  </div>
                  <div className="text-right">
                    {day.hasData ? (
                      <>
                        <div className="font-semibold text-primary">£{day.earnings.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{day.stops} stops</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">No entry</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeeklyStats;
