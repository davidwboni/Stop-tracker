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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

    if (startDate || endDate) {
      const logDate = new Date(log.date);

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        matchesDate = logDate >= start && logDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        matchesDate = logDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        matchesDate = logDate <= end;
      }
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
        <div className="bg-card border border-border rounded-[18px] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-primary/10 rounded-[14px] mr-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">
                  All Entries
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {(logs || []).length} total deliveries tracked
                </p>
              </div>
            </div>
            {filteredLogs.length > 0 && (
              <Button
                onClick={exportEntries}
                variant="outline"
                className="min-h-[48px] touch-manipulation rounded-[14px] px-6"
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
        <Card className="border-border/50 shadow-sm rounded-[18px] overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-card-foreground">
                Search & Filter
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  className="pl-11 h-12 rounded-[14px] focus:border-primary transition-colors touch-manipulation"
                />
              </div>

              {/* Start Date */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-11 h-12 rounded-[14px] focus:border-primary transition-colors touch-manipulation"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-11 h-12 rounded-[14px] focus:border-primary transition-colors touch-manipulation"
                />
              </div>

              {/* Clear Filter Button */}
              <Button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearchTerm("");
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                variant="outline"
                disabled={!startDate && !endDate && !searchTerm}
                className="h-12 rounded-[14px] border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200 hover:bg-primary/5"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || startDate || endDate) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {startDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      From: {format(new Date(startDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {endDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      To: {format(new Date(endDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 font-medium">
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
          <Card className="border-2 border-dashed border-border rounded-[18px] overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground mb-3">
                  No entries yet
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
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
