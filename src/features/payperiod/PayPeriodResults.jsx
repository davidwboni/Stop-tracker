// src/features/payperiod/PayPeriodResults.jsx
import React, { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Money } from "../../components/ui/money";
import { StatusBadge } from "../../components/ui/status-badge";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculatePeriodTotals, comparePeriodToLogs } from "./payPeriodCalculations";
import { useData } from "../../contexts/DataContext";
import { trackEvent } from "../../services/productAnalytics";

const PayPeriodResults = ({ period, onGenerateInvoice }) => {
  const { logs, paymentConfig } = useData();

  const totals = useMemo(
    () => calculatePeriodTotals(period.dailyEntries, period.dpdCharge, period.adminFee, period.vatRate, paymentConfig),
    [period, paymentConfig]
  );

  const comparison = useMemo(() => comparePeriodToLogs(period.dailyEntries, logs || []), [period, logs]);

  const hasDiscrepancy = comparison.some((day) => day.status !== "match");

  useEffect(() => {
    trackEvent("invoice_check_result", {
      surface: "invoice",
      discrepancy_found: hasDiscrepancy,
      compared_days: comparison.length,
    });
  }, [hasDiscrepancy, comparison.length]);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {hasDiscrepancy ? (
          <Alert className="bg-destructive/10 border-destructive/20">
            <motion.div initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </motion.div>
            <AlertDescription className="text-destructive font-medium">
              Discrepancy found, review the daily breakdown below.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-emerald-500/10 border-emerald-500/20">
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 18 }}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </motion.div>
            <AlertDescription className="text-emerald-500 font-medium">Every day matches your logged stops.</AlertDescription>
          </Alert>
        )}
      </motion.div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Daily Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparison.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.035, 0.25) }}
                className="flex items-center justify-between p-2 bg-muted rounded-[14px] border border-border/50"
              >
                <span className="text-sm">{format(parseISO(day.date), "EEE, dd MMM yyyy")}</span>
                <span className="text-sm tabular-nums">Yours: {day.loggedStops ?? "-"}</span>
                <span className="text-sm tabular-nums">Statement: {day.statementStops ?? "-"}</span>
                <StatusBadge status={day.status} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Gross Payment</span>
            <Money amount={totals.grossPayment} />
          </div>
          <div className="flex justify-between text-sm">
            <span>DPD Charge</span>
            <span>-<Money amount={totals.dpdCharge} /></span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Admin Fee</span>
            <span>-<Money amount={totals.adminFee} /></span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <Money amount={totals.total} />
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT ({(period.vatRate * 100).toFixed(0)}%)</span>
            <Money amount={totals.vat} />
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
            <span>Total with VAT</span>
            <Money amount={totals.totalWithVat} />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() =>
          onGenerateInvoice({
            amount: totals.totalWithVat,
            startDate: period.fromDate,
            endDate: period.toDate,
          })
        }
        className="w-full gap-2"
      >
        <FileText className="h-4 w-4" />
        Generate Invoice for £{totals.totalWithVat.toFixed(2)}
      </Button>
    </div>
  );
};

export default PayPeriodResults;
