import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#8b5cf6"];

const Statistics = ({ logs }) => {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [metric, setMetric] = useState("stops");

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return logs;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return logs.filter(
      (log) =>
        new Date(log.date) >= startDate && new Date(log.date) <= endDate
    );
  }, [logs, dateRange]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalEarnings = filteredLogs.reduce((sum, log) => sum + log.total, 0);
    const totalStops = filteredLogs.reduce((sum, log) => sum + log.stops, 0);
    const bestDay = filteredLogs.reduce(
      (best, log) => (log.stops > (best?.stops || 0) ? log : best),
      null
    );
    return {
      totalEarnings,
      totalStops,
      bestDay,
    };
  }, [filteredLogs]);

  // Data for charts
  const lineChartData = filteredLogs.map((log) => ({
    date: new Date(log.date).toLocaleDateString(),
    stops: log.stops,
    earnings: log.total,
  }));

  const pieChartData = [
    { name: "Stops", value: stats.totalStops },
    { name: "Earnings", value: stats.totalEarnings },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Date Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              placeholder="Start Date"
              className="bg-[var(--background)] text-[var(--text)]"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              placeholder="End Date"
              className="bg-[var(--background)] text-[var(--text)]"
            />
          </div>
          <div className="flex gap-4">
            <Button
              variant={metric === "stops" ? "default" : "outline"}
              onClick={() => setMetric("stops")}
            >
              View Stops
            </Button>
            <Button
              variant={metric === "earnings" ? "default" : "outline"}
              onClick={() => setMetric("earnings")}
            >
              View Earnings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{stats.totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Stops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStops}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Best Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.bestDay?.stops || 0}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {stats.bestDay?.date
                ? new Date(stats.bestDay.date).toLocaleDateString()
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey={metric} fill="var(--secondary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stops vs Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;