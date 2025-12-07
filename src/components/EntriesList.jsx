import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  BarChart2,
  TrendingUp,
  DollarSign,
  Zap,
  Package
} from "lucide-react";
import _ from "lodash";

const formatDate = (inputDate) => {
  const date = new Date(inputDate);
  return date.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const EntriesList = ({ logs, onDeleteEntry }) => {
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewDetails, setViewDetails] = useState(false);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    // Add haptic feedback
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const sortedLogs = useMemo(
    () => _.orderBy(logs, [sortBy], [sortOrder]),
    [logs, sortBy, sortOrder]
  );

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = sortedLogs.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const calculateSummary = (days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return logs
      .filter((log) => new Date(log.date) >= cutoffDate)
      .reduce(
        (acc, log) => ({
          stops: acc.stops + log.stops,
          total: acc.total + (log.total || 0),
        }),
        { stops: 0, total: 0 }
      );
  };

  const last7Days = calculateSummary(7);
  const last4Weeks = calculateSummary(28);
  const lastMonth = calculateSummary(30);

  const SortButton = ({ field, label, icon: Icon }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="flex items-center gap-2 h-10 rounded-xl transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 touch-manipulation min-h-[44px]"
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="font-medium">{label}</span>
      {sortBy === field ? (
        sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-30" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Stats Summary - 2.0 Style */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Last 7 Days */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation"
        >
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">7 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{last7Days.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{last7Days.total.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Last 4 Weeks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation"
        >
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">28 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{last4Weeks.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{last4Weeks.total.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Last Month */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">30 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{lastMonth.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{lastMonth.total.toFixed(2)}</span>
          </div>
        </motion.div>
      </div>

      {/* Main Entries Card */}
      <Card className="border-2 border-gray-100 dark:border-gray-800 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              All Deliveries
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                ({logs.length} total)
              </span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <SortButton field="date" label="Date" />
              <SortButton field="stops" label="Stops" />
              <SortButton field="total" label="Amount" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {paginatedLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.01 }}
                  className="group"
                >
                  <div className="flex justify-between items-center p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-lg touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                          {formatDate(log.date)}
                        </div>
                        {log.extra > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            +£{log.extra}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{log.stops} stops</span>
                      </div>
                      {log.notes && (
                        <div className="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          £{log.total?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                          onDeleteEntry(log.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  disabled={page === 1}
                  className="h-11 px-6 rounded-xl border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  disabled={page === totalPages}
                  className="h-11 px-6 rounded-xl border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
                >
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  className="h-11 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-medium focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                >
                  {[5, 10, 20, 50].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EntriesList;
