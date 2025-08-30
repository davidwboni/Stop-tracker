import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval } from 'date-fns';
import { Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const InvoiceComparison = ({ logs = [] }) => {
  // Ensure logs is an array with useMemo to avoid dependency issues
  const safetyLogs = useMemo(() => logs || [], [logs]);
  
  const [invoiceStops, setInvoiceStops] = useState('');
  const [invoicePeriod, setInvoicePeriod] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM');
  });
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Get monthly logs for selected period
  const monthlyLogs = useMemo(() => {
    if (!invoicePeriod) return [];
    
    // Parse the year-month string into a date
    const date = new Date(`${invoicePeriod}-01T00:00:00`);
    const firstDay = startOfMonth(date);
    const lastDay = endOfMonth(date);
    
    return safetyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: firstDay, end: lastDay });
    });
  }, [safetyLogs, invoicePeriod]);
  
  // Calculate total stops for the month
  const totalMonthlyStops = useMemo(() => {
    return monthlyLogs.reduce((total, log) => total + log.stops, 0);
  }, [monthlyLogs]);
  
  // Calculate total earnings for the month
  const totalMonthlyEarnings = useMemo(() => {
    return monthlyLogs.reduce((total, log) => total + log.total, 0);
  }, [monthlyLogs]);

  const handleCompare = () => {
    setIsComparing(true);
    
    // Simulate API request
    setTimeout(() => {
      const invoiceStopsNum = parseInt(invoiceStops, 10) || 0;
      const diff = totalMonthlyStops - invoiceStopsNum;
      const percentage = invoiceStopsNum > 0 
        ? ((diff / invoiceStopsNum) * 100).toFixed(1) 
        : 0;
      
      setComparisonResult({
        invoice: invoiceStopsNum,
        recorded: totalMonthlyStops,
        difference: diff,
        percentage: percentage,
        status: diff > 0 ? 'underpaid' : diff < 0 ? 'overpaid' : 'match'
      });
      
      setIsComparing(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'underpaid':
        return 'text-red-600 dark:text-red-400';
      case 'overpaid':
        return 'text-green-600 dark:text-green-400';
      case 'match':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Compare your tracked deliveries with your invoice to make sure you're getting paid correctly.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Your Records</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Month
                  </label>
                  <Input
                    type="month"
                    value={invoicePeriod}
                    onChange={(e) => setInvoicePeriod(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Stops:</span>
                    <span className="font-medium">{totalMonthlyStops}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Days:</span>
                    <span className="font-medium">{monthlyLogs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Earnings:</span>
                    <span className="font-medium">£{totalMonthlyEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Invoice Details</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stops on Invoice
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter number of stops from your invoice"
                    value={invoiceStops}
                    onChange={(e) => setInvoiceStops(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Button
                  onClick={handleCompare}
                  disabled={isComparing || !invoiceStops}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isComparing ? 'Comparing...' : 'Compare with Records'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Comparison Results */}
          {comparisonResult && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Comparison Results</h3>
              <div className={`p-6 rounded-xl border ${
                comparisonResult.status === 'underpaid' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                comparisonResult.status === 'overpaid' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {comparisonResult.status === 'underpaid' && (
                      <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
                    )}
                    {comparisonResult.status === 'overpaid' && (
                      <Check className="w-6 h-6 text-green-500 mr-2" />
                    )}
                    {comparisonResult.status === 'match' && (
                      <Check className="w-6 h-6 text-blue-500 mr-2" />
                    )}
                    <h4 className="text-lg font-medium">
                      {comparisonResult.status === 'underpaid' && 'Potential Underpayment Detected'}
                      {comparisonResult.status === 'overpaid' && 'You May Be Overpaid'}
                      {comparisonResult.status === 'match' && 'Perfect Match!'}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setExpandedDetails(!expandedDetails)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {expandedDetails ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Invoice Stops</p>
                    <p className="text-xl font-bold">{comparisonResult.invoice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your Records</p>
                    <p className="text-xl font-bold">{comparisonResult.recorded}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Difference</p>
                    <p className={`text-xl font-bold ${getStatusColor(comparisonResult.status)}`}>
                      {comparisonResult.difference > 0 ? '+' : ''}{comparisonResult.difference}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Percentage</p>
                    <p className={`text-xl font-bold ${getStatusColor(comparisonResult.status)}`}>
                      {comparisonResult.percentage > 0 ? '+' : ''}{comparisonResult.percentage}%
                    </p>
                  </div>
                </div>
                
                {expandedDetails && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="font-medium mb-2">What This Means</h5>
                    {comparisonResult.status === 'underpaid' && (
                      <div>
                        <p className="mb-2">Your records show <strong>{comparisonResult.difference} more stops</strong> than your invoice indicates. This suggests you may be underpaid for this period.</p>
                        <h6 className="font-medium mt-4 mb-2">Next Steps:</h6>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Download your detailed daily records</li>
                          <li>Contact your service provider with your evidence</li>
                          <li>Request a review of your invoice</li>
                        </ol>
                      </div>
                    )}
                    {comparisonResult.status === 'overpaid' && (
                      <div>
                        <p className="mb-2">Your invoice shows <strong>{Math.abs(comparisonResult.difference)} more stops</strong> than your records indicate. Double-check your entries to make sure you've recorded all your deliveries.</p>
                        <h6 className="font-medium mt-4 mb-2">Next Steps:</h6>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Review your daily entries for any missing data</li>
                          <li>Check if all days in the period have been recorded</li>
                          <li>If accurate, keep these records for future reference</li>
                        </ol>
                      </div>
                    )}
                    {comparisonResult.status === 'match' && (
                      <div>
                        <p className="mb-2">Great! Your records match exactly with your invoice. This means you're being paid correctly for all your deliveries.</p>
                        <h6 className="font-medium mt-4 mb-2">Next Steps:</h6>
                        <ol className="list-decimal pl-5 space-y-1">
                          <li>Continue tracking your deliveries daily</li>
                          <li>Compare each invoice when received</li>
                          <li>Store your records for future reference</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Daily Breakdown */}
      {monthlyLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stops</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extra Pay</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {monthlyLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                        No records found for this period.
                      </td>
                    </tr>
                  ) : (
                    monthlyLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3 text-sm">
                          {format(parseISO(log.date), 'EEE, MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {log.stops}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          £{log.extra ? log.extra.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          £{log.total?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold">Total</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{totalMonthlyStops}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      £{monthlyLogs.reduce((sum, log) => sum + (log.extra || 0), 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      £{totalMonthlyEarnings.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceComparison;