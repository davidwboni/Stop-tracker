// src/features/payperiod/PayPeriodResults.jsx
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculatePeriodTotals, comparePeriodToLogs } from "./payPeriodCalculations";
import { useData } from "../../contexts/DataContext";

const STATUS_LABEL = {
  match: "Match",
  mismatch: "Mismatch",
  "missing-from-log": "Missing from your log",
  "missing-from-statement": "Missing from statement",
};

const STATUS_COLOR = {
  match: "text-emerald-600",
  mismatch: "text-destructive",
  "missing-from-log": "text-amber-600",
  "missing-from-statement": "text-amber-600",
};

const PayPeriodResults = ({ period, onGenerateInvoice }) => {
  const { logs, paymentConfig } = useData();

  const totals = useMemo(
    () => calculatePeriodTotals(period.dailyEntries, period.dpdCharge, period.adminFee, period.vatRate, paymentConfig),
    [period, paymentConfig]
  );

  const comparison = useMemo(() => comparePeriodToLogs(period.dailyEntries, logs || []), [period, logs]);

  const hasDiscrepancy = comparison.some((day) => day.status !== "match");

  return (
    <div className="space-y-4">
      {hasDiscrepancy ? (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Discrepancy found — review the daily breakdown below.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-emerald-500/10 border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-emerald-500">Every day matches your logged stops.</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Daily Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparison.map((day) => (
              <div key={day.date} className="flex items-center justify-between p-2 bg-muted rounded border border-border/50">
                <span className="text-sm">{format(parseISO(day.date), "EEE, dd MMM yyyy")}</span>
                <span className="text-sm">Yours: {day.loggedStops ?? "—"}</span>
                <span className="text-sm">Statement: {day.statementStops ?? "—"}</span>
                <span className={`text-sm font-semibold ${STATUS_COLOR[day.status]}`}>{STATUS_LABEL[day.status]}</span>
              </div>
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
            <span>£{totals.grossPayment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>DPD Charge</span>
            <span>-£{totals.dpdCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Admin Fee</span>
            <span>-£{totals.adminFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <span>£{totals.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT ({(period.vatRate * 100).toFixed(0)}%)</span>
            <span>£{totals.vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
            <span>Total with VAT</span>
            <span>£{totals.totalWithVat.toFixed(2)}</span>
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
