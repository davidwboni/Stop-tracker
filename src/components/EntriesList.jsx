import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Pencil,
  Zap,
  Package,
  MapPin
} from "lucide-react";
import _ from "lodash";
import { Money } from "./ui/money";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewDetails, setViewDetails] = useState(false);

  const sortedLogs = useMemo(
    () => _.orderBy(logs, ["date"], ["desc"]),
    [logs]
  );

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = sortedLogs.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );


  return (
    <div className="space-y-6">
      {/* Main Entries Card */}
      <Card className="border-border/60 shadow-sm rounded-[18px] overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center">
              <Zap className="w-5 h-5 text-primary mr-2" />
              Work diary
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {logs.length} {logs.length === 1 ? "day" : "days"}
            </span>
          </CardTitle>
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
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 sm:p-5 rounded-[14px] bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md touch-manipulation">
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
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Package className="w-4 h-4" />
                          {log.stops} stops
                        </span>
                        {log.miles > 0 && (
                          <span className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-4 h-4" />
                            {log.miles} mi
                          </span>
                        )}
                      </div>
                      {log.notes && (
                        <div className="text-sm text-muted-foreground mt-2 italic">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-shrink-0">
                      <div className="text-right mr-1">
                        <div className="text-2xl font-bold text-foreground">
                          <Money amount={log.total || 0} />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (navigator.vibrate) navigator.vibrate(8);
                          navigate(`/app/dashboard?date=${encodeURIComponent(log.date)}`);
                        }}
                        aria-label={`Edit entry for ${formatDate(log.date)}`}
                        className="hover:bg-primary/10 hover:text-primary rounded-[14px] min-h-[44px] min-w-[44px] touch-manipulation"
                      >
                        <Pencil className="w-4.5 h-4.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                          onDeleteEntry(log.id);
                        }}
                        aria-label={`Delete entry for ${formatDate(log.date)}`}
                        className="opacity-70 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-[14px] transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
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
