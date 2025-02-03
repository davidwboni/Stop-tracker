import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
} from "recharts";
import { FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const InvoiceComparison = ({ logs = [] }) => {
  const [invoiceData, setInvoiceData] = useState({
    startDate: "",
    endDate: "",
    totalStops: "",
    invoiceAmount: "",
  });

  const [comparison, setComparison] = useState(null);

  const calculateComparison = () => {
    const { startDate, endDate, totalStops } = invoiceData;
    if (!startDate || !endDate || !totalStops) {
      alert("Please fill in all required fields.");
      return;
    }

    const filteredLogs = logs.filter((log) => {
      const date = new Date(log.date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });

    const appTotalStops = filteredLogs.reduce((sum, log) => sum + log.stops, 0);
    const difference = appTotalStops - parseInt(totalStops);
    const dailyAverages = filteredLogs.map((log) => ({
      date: new Date(log.date).toLocaleDateString(),
      stops: log.stops,
    }));

    setComparison({
      appTotal: appTotalStops,
      invoiceTotal: parseInt(totalStops),
      difference,
      dailyAverages,
    });
  };

  const summaryData = useMemo(() => {
    if (!comparison) return null;

    return {
      accuracy: (
        (Math.min(comparison.appTotal, comparison.invoiceTotal) /
          Math.max(comparison.appTotal, comparison.invoiceTotal)) *
        100
      ).toFixed(1),
      status:
        comparison.difference === 0
          ? "match"
          : comparison.difference > 0
          ? "over"
          : "under",
    };
  }, [comparison]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              value={invoiceData.startDate}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, startDate: e.target.value })
              }
              placeholder="Start Date"
              className="bg-[var(--background)] text-[var(--text)]"
            />
            <Input
              type="date"
              value={invoiceData.endDate}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, endDate: e.target.value })
              }
              placeholder="End Date"
              className="bg-[var(--background)] text-[var(--text)]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              value={invoiceData.totalStops}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, totalStops: e.target.value })
              }
              placeholder="Invoice Total Stops"
              className="bg-[var(--background)] text-[var(--text)]"
            />
            <Input
              type="number"
              value={invoiceData.invoiceAmount}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, invoiceAmount: e.target.value })
              }
              placeholder="Invoice Amount (Optional)"
              step="0.01"
              className="bg-[var(--background)] text-[var(--text)]"
            />
          </div>
          <Button
            onClick={calculateComparison}
            className="w-full bg-[var(--primary)] hover:bg-[var(--secondary)] text-white"
          >
            Compare
          </Button>
        </CardContent>
      </Card>

      {comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-muted)]">App Total</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{comparison.appTotal}</p>
                  <p className="text-sm text-[var(--text-muted)]">stops</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-muted)]">Invoice Total</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{comparison.invoiceTotal}</p>
                  <p className="text-sm text-[var(--text-muted)]">stops</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-muted)]">Accuracy</p>
                  <p className="text-3xl font-bold text-[var(--text)]">{summaryData.accuracy}%</p>
                  <p className="text-sm text-[var(--text-muted)]">match rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {comparison.difference !== 0 && (
            <Alert
              variant={comparison.difference > 0 ? "warning" : "destructive"}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[var(--text)]">
                {Math.abs(comparison.difference)} stops {" "}
                {comparison.difference > 0 ? "more" : "fewer"} in the app than
                on the invoice. Please review your entries.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-[var(--text)]">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.dailyAverages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Bar
                      dataKey="stops"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default InvoiceComparison;