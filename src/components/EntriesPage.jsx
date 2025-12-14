import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  FileText,
  Filter,
  Calendar,
  Download,
  Search,
  Package,
  Sparkles
} from "lucide-react";
import { Input } from "./ui/input";
import EntriesList from "./EntriesList";
import { format } from "date-fns";
import { useData } from "../contexts/DataContext";

const EntriesPage = () => {
  const { logs, updateLogs, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [filterMode, setFilterMode] = useState("day"); // "day", "month", "year"
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const handleDeleteEntry = (id) => {
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
    const updatedLogs = logs.filter(log => log.id !== id);
    updateLogs(updatedLogs);
  };

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = searchTerm === "" ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.stops.toString().includes(searchTerm);

    let matchesDate = true;

    if (filterMode === "day" && dateFilter) {
      matchesDate = log.date === dateFilter;
    } else if (filterMode === "month" && monthFilter) {
      const logDate = new Date(log.date);
      const filterDate = new Date(monthFilter + "-01");
      matchesDate = logDate.getMonth() === filterDate.getMonth() &&
                    logDate.getFullYear() === filterDate.getFullYear();
    } else if (filterMode === "year" && yearFilter) {
      const logDate = new Date(log.date);
      matchesDate = logDate.getFullYear() === parseInt(yearFilter);
    }

    return matchesSearch && matchesDate;
  });

  const exportEntries = () => {
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    const exportData = filteredLogs.map(log => ({
      Date: format(new Date(log.date), 'dd/MM/yyyy'),
      Stops: log.stops,
      Extra: log.extra || 0,
      Total: log.total?.toFixed(2) || '0.00',
      Notes: log.notes || ""
    }));

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `stop-tracker-export-${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your entries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-safe">
      {/* Header Section - 2.0 Style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl mr-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  All Entries
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  {(logs || []).length} total deliveries tracked
                </p>
              </div>
            </div>
            {filteredLogs.length > 0 && (
              <Button
                onClick={exportEntries}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 transition-all duration-300 min-h-[48px] touch-manipulation rounded-xl px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters Section - Android-First */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search & Filter
              </h2>
            </div>

            {/* Filter Mode Selection */}
            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => setFilterMode("day")}
                variant={filterMode === "day" ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                Day
              </Button>
              <Button
                onClick={() => setFilterMode("month")}
                variant={filterMode === "month" ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                Month
              </Button>
              <Button
                onClick={() => setFilterMode("year")}
                variant={filterMode === "year" ? "default" : "outline"}
                size="sm"
                className="flex-1"
              >
                Year
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search stops or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                />
              </div>

              {/* Date Filter - Changes based on mode */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                {filterMode === "day" && (
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                  />
                )}
                {filterMode === "month" && (
                  <Input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                  />
                )}
                {filterMode === "year" && (
                  <Input
                    type="number"
                    placeholder="YYYY"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    min="2020"
                    max="2030"
                    className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                  />
                )}
              </div>

              {/* Clear Filter Button */}
              <Button
                onClick={() => {
                  setDateFilter("");
                  setMonthFilter("");
                  setYearFilter("");
                  setSearchTerm("");
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                variant="outline"
                disabled={!dateFilter && !monthFilter && !yearFilter && !searchTerm}
                className="h-12 rounded-xl border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || dateFilter || monthFilter || yearFilter) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {dateFilter && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      Day: {format(new Date(dateFilter), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {monthFilter && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      Month: {format(new Date(monthFilter + "-01"), 'MMMM yyyy')}
                    </span>
                  )}
                  {yearFilter && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      Year: {yearFilter}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium">
                    {filteredLogs.length} results
                  </span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Entries List or Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {(logs || []).length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  No entries yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                  Start tracking your delivery stops to see them here. Use the "Log Entry" tab on the dashboard to add your first delivery!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EntriesList
            logs={filteredLogs}
            onDeleteEntry={handleDeleteEntry}
          />
        )}
      </motion.div>
    </div>
  );
};

export default EntriesPage;
