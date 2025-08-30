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
} from "lucide-react";
import _ from "lodash";

const formatDate = (inputDate) => {
  const date = new Date(inputDate);
  return date.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
};

const EntriesList = ({ logs, onDeleteEntry }) => {
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [viewDetails, setViewDetails] = useState(false);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
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
          total: acc.total + log.total,
        }),
        { stops: 0, total: 0 }
      );
  };

  const last7Days = calculateSummary(7);
  const last4Weeks = calculateSummary(28);
  const lastMonth = calculateSummary(30);

  const SortButton = ({ field, label }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[var(--text)]"
    >
      {label}
      {sortBy === field ? (
        sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <Card className="bg-[var(--background)] shadow-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center flex-col sm:flex-row">
          <span className="text-[var(--text)]">Delivery Entries</span>
          <div className="flex gap-2 text-sm">
            <SortButton field="date" label="Date" />
            <SortButton field="stops" label="Stops" />
            <SortButton field="total" label="Amount" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[var(--text)] text-lg font-semibold">
              Last 7 Days
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setViewDetails(!viewDetails)}
            >
              <BarChart2 className="w-4 h-4" />
              {viewDetails ? "Hide Details" : "View Details"}
            </Button>
          </div>
          <div className="bg-[var(--secondary)] rounded-lg p-4">
            <div className="text-[var(--text)] text-sm">
              Stops: <strong>{last7Days.stops}</strong>
            </div>
            <div className="text-[var(--text)] text-sm">
              Income: <strong>£{last7Days.total.toFixed(2)}</strong>
            </div>
            <div className="mt-2 h-2 bg-[var(--accent)] rounded-full overflow-hidden">
              <div
                style={{ width: `${(last7Days.stops / 500) * 100}%` }}
                className="h-full bg-[var(--primary)]"
              />
            </div>
          </div>

          {viewDetails && (
            <div className="mt-4 space-y-4">
              {[{ label: "Last 4 Weeks", data: last4Weeks }, { label: "Last Month", data: lastMonth }].map(
                (item, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--background)] p-4 rounded-lg shadow-md"
                  >
                    <div className="text-[var(--text)] font-semibold">
                      {item.label}
                    </div>
                    <div className="text-[var(--text)] text-sm">
                      Stops: <strong>{item.data.stops}</strong>
                    </div>
                    <div className="text-[var(--text)] text-sm">
                      Income: <strong>£{item.data.total.toFixed(2)}</strong>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          <div className="space-y-2">
            {paginatedLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-between items-center p-4 rounded-lg bg-[var(--background)] hover:bg-[var(--primary)] transition-colors"
              >
                <div>
                  <div className="font-medium text-[var(--text)]">
                    {formatDate(log.date)}
                  </div>
                  <div className="text-sm text-[var(--text)]">
                    {log.stops} stops {log.extra > 0 ? `+ £${log.extra}` : ""}
                  </div>
                  {log.notes && (
                    <div className="text-sm text-[var(--text-muted)] mt-1">
                      {log.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-medium text-[var(--text)]">
                    £{log.total?.toFixed(2) || '0.00'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteEntry(log.id)}
                    className="hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[var(--text)]"
            >
              Previous
            </Button>
            <span className="text-sm text-[var(--text)]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-[var(--text)]"
            >
              Next
            </Button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <label className="text-sm text-[var(--text)] mr-2">Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="bg-[var(--background)] text-[var(--text)] border-[var(--primary)] rounded-md p-1"
          >
            {[5, 7, 10, 20].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntriesList;