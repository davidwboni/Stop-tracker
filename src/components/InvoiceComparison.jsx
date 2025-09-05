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
    <div className="space-y-4 -mx-6 -mt-6">
      <Card className="mx-0 rounded-none border-0 shadow-none bg-white dark:bg-gray-800">
        <CardHeader className="px-4 pb-4">
          <div className="text-center mb-4">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Invoice Comparison
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare tracked vs invoice
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Your Records</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Select Month
                  </label>
                  <Input
                    type="month"
                    value={invoicePeriod}
                    onChange={(e) => setInvoicePeriod(e.target.value)}
                    className="h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Total Stops:</span>
                    <span className="text-sm font-medium">{totalMonthlyStops}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Delivery Days:</span>
                    <span className="text-sm font-medium">{monthlyLogs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Estimated Earnings:</span>
                    <span className="text-sm font-medium">£{totalMonthlyEarnings.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Invoice Details</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Stops on Invoice
                  </label>
                  <Input
                    type="number"
                    placeholder="Invoice stops count"
                    value={invoiceStops}
                    onChange={(e) => setInvoiceStops(e.target.value)}
                    className="h-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                  />
                </div>
                
                <Button
                  onClick={handleCompare}
                  disabled={isComparing || !invoiceStops}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                >
                  {isComparing ? 'Comparing...' : 'Compare'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Comparison Results */}
          {comparisonResult && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Results</h3>
              <div className={`p-4 rounded-2xl border ${
                comparisonResult.status === 'underpaid' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                comparisonResult.status === 'overpaid' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {comparisonResult.status === 'underpaid' && (
                      <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    )}
                    {comparisonResult.status === 'overpaid' && (
                      <Check className="w-5 h-5 text-green-500 mr-2" />
                    )}
                    {comparisonResult.status === 'match' && (
                      <Check className="w-5 h-5 text-blue-500 mr-2" />
                    )}
                    <h4 className="text-sm font-medium">
                      {comparisonResult.status === 'underpaid' && 'Underpaid'}
                      {comparisonResult.status === 'overpaid' && 'Overpaid'}
                      {comparisonResult.status === 'match' && 'Perfect Match!'}
                    </h4>
                  </div>
                  <button 
                    onClick={() => setExpandedDetails(!expandedDetails)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {expandedDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice</p>
                    <p className="text-lg font-bold">{comparisonResult.invoice}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Records</p>
                    <p className="text-lg font-bold">{comparisonResult.recorded}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Difference</p>
                    <p className={`text-lg font-bold ${getStatusColor(comparisonResult.status)}`}>
                      {comparisonResult.difference > 0 ? '+' : ''}{comparisonResult.difference}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Percentage</p>
                    <p className={`text-lg font-bold ${getStatusColor(comparisonResult.status)}`}>
                      {comparisonResult.percentage > 0 ? '+' : ''}{comparisonResult.percentage}%
                    </p>
                  </div>
                </div>
                
                {expandedDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="text-sm font-medium mb-2">What This Means</h5>
                    {comparisonResult.status === 'underpaid' && (
                      <div>
                        <p className="text-sm mb-2">Your records show <strong>{comparisonResult.difference} more stops</strong> than your invoice. You may be underpaid.</p>
                        <h6 className="text-sm font-medium mt-3 mb-2">Next Steps:</h6>
                        <ol className="text-xs list-decimal pl-4 space-y-1">
                          <li>Review your detailed records</li>
                          <li>Contact your service provider</li>
                          <li>Request invoice review</li>
                        </ol>
                      </div>
                    )}
                    {comparisonResult.status === 'overpaid' && (
                      <div>
                        <p className="text-sm mb-2">Your invoice shows <strong>{Math.abs(comparisonResult.difference)} more stops</strong> than your records. Double-check your entries.</p>
                        <h6 className="text-sm font-medium mt-3 mb-2">Next Steps:</h6>
                        <ol className="text-xs list-decimal pl-4 space-y-1">
                          <li>Review daily entries for missing data</li>
                          <li>Check all days are recorded</li>
                          <li>Keep records for reference</li>
                        </ol>
                      </div>
                    )}
                    {comparisonResult.status === 'match' && (
                      <div>
                        <p className="text-sm mb-2">Perfect! Your records match your invoice exactly. You're being paid correctly.</p>
                        <h6 className="text-sm font-medium mt-3 mb-2">Next Steps:</h6>
                        <ol className="text-xs list-decimal pl-4 space-y-1">
                          <li>Continue daily tracking</li>
                          <li>Compare future invoices</li>
                          <li>Store records for reference</li>
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
        <Card className="mx-0 rounded-2xl border-0 shadow-sm">
          <CardHeader className="px-4 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {monthlyLogs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No records found for this period.
                  </div>
                ) : (
                  monthlyLogs.map((log) => (
                    <div key={log.id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(parseISO(log.date), 'EEE, MMM d')}
                        </div>
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          £{log.total?.toFixed(0) || '0'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>{log.stops} stops</div>
                        {log.extra > 0 && (
                          <div>+£{log.extra.toFixed(2)} extra</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Total</div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-semibold">{totalMonthlyStops} stops</div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        £{totalMonthlyEarnings.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceComparison;