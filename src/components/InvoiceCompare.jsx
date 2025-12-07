import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Download,
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { useData } from "../contexts/DataContext";

const InvoiceCompare = () => {
  const { logs } = useData();
  const [invoiceStartDate, setInvoiceStartDate] = useState("");
  const [invoiceEndDate, setInvoiceEndDate] = useState("");
  const [invoiceStops, setInvoiceStops] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Calculate logged stops and earnings for the invoice period
  const loggedData = useMemo(() => {
    if (!invoiceStartDate || !invoiceEndDate || !logs || logs.length === 0) {
      return { stops: 0, amount: 0, days: 0, entries: [] };
    }

    try {
      const start = parseISO(invoiceStartDate);
      const end = parseISO(invoiceEndDate);

      const filteredEntries = logs.filter(log => {
        const logDate = parseISO(log.date);
        return isWithinInterval(logDate, { start, end });
      });

      const totalStops = filteredEntries.reduce((sum, log) => sum + (log.stops || 0), 0);
      const totalAmount = filteredEntries.reduce((sum, log) => sum + (log.total || 0), 0);

      return {
        stops: totalStops,
        amount: totalAmount,
        days: filteredEntries.length,
        entries: filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date))
      };
    } catch (error) {
      console.error("Error calculating logged data:", error);
      return { stops: 0, amount: 0, days: 0, entries: [] };
    }
  }, [invoiceStartDate, invoiceEndDate, logs]);

  // Calculate discrepancy
  const comparison = useMemo(() => {
    if (!showResults) return null;

    const invoiceStopsNum = parseInt(invoiceStops) || 0;
    const invoiceAmountNum = parseFloat(invoiceAmount) || 0;

    const stopsDifference = loggedData.stops - invoiceStopsNum;
    const amountDifference = loggedData.amount - invoiceAmountNum;

    return {
      invoiceStops: invoiceStopsNum,
      invoiceAmount: invoiceAmountNum,
      stopsDifference,
      amountDifference,
      hasDifference: stopsDifference !== 0 || amountDifference !== 0,
      missingStops: stopsDifference > 0 ? stopsDifference : 0,
      missingAmount: amountDifference > 0 ? amountDifference : 0
    };
  }, [showResults, invoiceStops, invoiceAmount, loggedData]);

  const handleCompare = () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    setShowResults(true);
  };

  const handleReset = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    setInvoiceStartDate("");
    setInvoiceEndDate("");
    setInvoiceStops("");
    setInvoiceAmount("");
    setShowResults(false);
  };

  const handleExportReport = () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

    if (!comparison) return;

    const reportData = {
      invoicePeriod: {
        start: format(parseISO(invoiceStartDate), 'dd/MM/yyyy'),
        end: format(parseISO(invoiceEndDate), 'dd/MM/yyyy')
      },
      invoice: {
        stops: comparison.invoiceStops,
        amount: comparison.invoiceAmount.toFixed(2)
      },
      logged: {
        stops: loggedData.stops,
        amount: loggedData.amount.toFixed(2),
        days: loggedData.days
      },
      discrepancy: {
        stops: comparison.stopsDifference,
        amount: comparison.amountDifference.toFixed(2),
        missingStops: comparison.missingStops,
        missingAmount: comparison.missingAmount.toFixed(2)
      },
      dailyBreakdown: loggedData.entries.map(entry => ({
        date: format(parseISO(entry.date), 'dd/MM/yyyy'),
        stops: entry.stops,
        amount: entry.total?.toFixed(2) || '0.00',
        notes: entry.notes || ''
      }))
    };

    const reportText = `
STOP TRACKER 2.0 - INVOICE COMPARISON REPORT
============================================

Invoice Period: ${reportData.invoicePeriod.start} to ${reportData.invoicePeriod.end}

INVOICE DATA:
  Stops: ${reportData.invoice.stops}
  Amount: £${reportData.invoice.amount}

YOUR LOGGED DATA:
  Stops: ${reportData.logged.stops}
  Amount: £${reportData.logged.amount}
  Days Worked: ${reportData.logged.days}

DISCREPANCY:
  Stops Difference: ${comparison.stopsDifference > 0 ? '+' : ''}${reportData.discrepancy.stops}
  Amount Difference: ${comparison.amountDifference > 0 ? '+' : ''}£${reportData.discrepancy.amount}
  ${comparison.missingStops > 0 ? `⚠️  MISSING STOPS: ${comparison.missingStops}` : '✅ No missing stops'}
  ${comparison.missingAmount > 0 ? `⚠️  MISSING PAYMENT: £${reportData.discrepancy.missingAmount}` : '✅ No missing payment'}

DAILY BREAKDOWN:
${loggedData.entries.map(entry =>
  `  ${format(parseISO(entry.date), 'EEE, dd MMM yyyy')}: ${entry.stops} stops - £${entry.total?.toFixed(2) || '0.00'}${entry.notes ? ` (${entry.notes})` : ''}`
).join('\n')}

Report generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `invoice-comparison-${format(new Date(), 'yyyyMMdd')}.txt`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 -mx-6 -mt-6 pb-safe">
      {/* Header - 2.0 Style */}
      <div className="px-4 py-6 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full"></div>
        <div className="text-center relative z-10">
          <div className="flex items-center justify-center mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Invoice Comparison
          </h1>
          <p className="text-sm text-white/90 leading-relaxed max-w-md mx-auto">
            Catch missing stops! Compare your invoice against your logged deliveries to ensure you're paid correctly.
          </p>
        </div>
      </div>

      {/* Invoice Input Form */}
      <div className="px-4">
        <Card className="border-2 border-orange-100 dark:border-orange-900 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-b-2 border-orange-100 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-lg font-bold text-orange-900 dark:text-orange-100">
                Enter Invoice Details
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Date Range */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Invoice Period (4 weeks)
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={invoiceStartDate}
                    onChange={(e) => setInvoiceStartDate(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 dark:focus:border-orange-400 transition-colors touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={invoiceEndDate}
                    onChange={(e) => setInvoiceEndDate(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-orange-500 dark:focus:border-orange-400 transition-colors touch-manipulation"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Data */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                What's on Your Invoice?
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Stops on Invoice
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={invoiceStops}
                      onChange={(e) => setInvoiceStops(e.target.value)}
                      placeholder="e.g. 500"
                      className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors touch-manipulation"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Amount on Invoice (£)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      placeholder="e.g. 850.00"
                      className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors touch-manipulation"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleCompare}
                disabled={!invoiceStartDate || !invoiceEndDate || !invoiceStops}
                className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Compare Now
              </Button>
              {showResults && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="h-12 rounded-xl border-2 font-medium min-h-[48px] touch-manipulation"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <AnimatePresence>
        {showResults && comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="px-4 space-y-4"
          >
            {/* Summary Alert */}
            {comparison.hasDifference ? (
              <Alert className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl shadow-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-900 dark:text-red-100 font-medium">
                  {comparison.missingStops > 0 && (
                    <p className="text-lg font-bold mb-1">
                      ⚠️ {comparison.missingStops} stops missing from invoice!
                    </p>
                  )}
                  {comparison.missingAmount > 0 && (
                    <p className="text-lg font-bold">
                      💰 You're owed £{comparison.missingAmount.toFixed(2)}!
                    </p>
                  )}
                  {comparison.stopsDifference < 0 && (
                    <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                      Invoice shows {Math.abs(comparison.stopsDifference)} more stops than logged
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-900 dark:text-green-100 font-medium">
                  <p className="text-lg font-bold">✅ Perfect match!</p>
                  <p className="text-sm mt-1">Your invoice matches your logged deliveries exactly.</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Comparison Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Your Logged Data */}
              <Card className="border-2 border-blue-200 dark:border-blue-800 rounded-2xl shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Your Logged Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Stops</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{loggedData.stops}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">£{loggedData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days Worked</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{loggedData.days}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Data */}
              <Card className="border-2 border-orange-200 dark:border-orange-800 rounded-2xl shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-orange-500 to-red-600 text-white pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Invoice Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stops on Invoice</span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{comparison.invoiceStops}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount on Invoice</span>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">£{comparison.invoiceAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/20 rounded-xl">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Difference</span>
                    <span className={`text-2xl font-bold ${comparison.stopsDifference > 0 ? 'text-red-600 dark:text-red-400' : comparison.stopsDifference < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                      {comparison.stopsDifference > 0 ? '+' : ''}{comparison.stopsDifference}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Breakdown */}
            {loggedData.entries.length > 0 && (
              <Card className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Daily Breakdown
                    </CardTitle>
                    <Button
                      onClick={handleExportReport}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl min-h-[44px] touch-manipulation"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {loggedData.entries.map((entry, index) => (
                      <motion.div
                        key={entry.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {format(parseISO(entry.date), 'EEE, dd MMM yyyy')}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">
                              "{entry.notes}"
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Stops</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{entry.stops}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              £{entry.total?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!showResults && (
        <div className="px-4">
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calculator className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Ready to Compare?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Enter your invoice details above and click "Compare Now" to check if you've been paid correctly.
                  We'll highlight any missing stops or payment discrepancies.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InvoiceCompare;
