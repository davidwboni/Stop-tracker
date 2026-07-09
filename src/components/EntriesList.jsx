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
import { Money } from "./ui/money";

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
      className="flex items-center gap-2 h-10 rounded-[14px] transition-all duration-200 hover:bg-primary/5 touch-manipulation min-h-[44px]"
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="font-medium">{label}</span>
      {sortBy === field ? (
        sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4 text-primary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-30" />
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Last 7 Days */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-border/50 touch-manipulation">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">7 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{last7Days.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={last7Days.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Last 4 Weeks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="border-border/50 touch-manipulation">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">28 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{last4Weeks.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={last4Weeks.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Last Month */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <Card className="border-border/50 touch-manipulation h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">30 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{lastMonth.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={lastMonth.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Entries Card */}
      <Card className="border-border/50 shadow-sm rounded-[18px] overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Zap className="w-6 h-6 text-primary mr-2" />
              All Deliveries
              <span className="ml-2 text-sm font-normal text-muted-foreground">
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
                  <div className="flex justify-between items-center p-4 sm:p-5 rounded-[14px] bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-foreground text-lg">
                          {formatDate(log.date)}
                        </div>
                        {log.extra > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400">
                            +£{log.extra}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{log.stops} stops</span>
                      </div>
                      {log.notes && (
                        <div className="text-sm text-muted-foreground mt-2 italic">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          <Money amount={log.total || 0} />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                          onDeleteEntry(log.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-[14px] transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  disabled={page === 1}
                  className="h-11 px-6 rounded-[14px] border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-4 py-2 bg-muted rounded-[14px]">
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
                  className="h-11 px-6 rounded-[14px] border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
                >
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  className="h-11 px-4 bg-input border border-border rounded-[14px] font-medium focus:border-primary transition-colors touch-manipulation"
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
