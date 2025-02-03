import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  PlusCircle,
  FileText,
  BarChart2,
  Settings,
  Calendar,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import PaymentConfig from "./PaymentConfig";
import StatsOverview from "./StatsOverview";
import WeeklySummary from "./WeeklySummary";
import EntriesList from "./EntriesList";
import InvoiceComparison from "./InvoiceComparison";
import { useSyncData } from "../hooks/useSyncData";

// Static configuration for navigation tabs.
const TABS = [
  { key: "entry", label: "Entry", icon: PlusCircle },
  { key: "stats", label: "Stats", icon: BarChart2 },
  { key: "invoice", label: "Invoice", icon: FileText },
  { key: "weekly", label: "Weekly", icon: Calendar },
  { key: "settings", label: "Settings", icon: Settings },
];

const StopTracker = () => {
  // Custom hook for synchronizing logs.
  const {
    data: logs,
    loading: logsLoading,
    error: logsError,
    updateData: updateLogs,
  } = useSyncData("logs");

  // Local state definitions.
  const [activeTab, setActiveTab] = useState("entry");
  const [isLoading, setIsLoading] = useState(false);
  const [currentLog, setCurrentLog] = useState({
    date: new Date().toISOString().split("T")[0],
    stops: "",
    extra: "",
    notes: "",
  });
  const [paymentConfig, setPaymentConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("payment-config");
      return saved
        ? JSON.parse(saved)
        : { cutoffPoint: 110, rateBeforeCutoff: 1.98, rateAfterCutoff: 1.48 };
    } catch (error) {
      return { cutoffPoint: 110, rateBeforeCutoff: 1.98, rateAfterCutoff: 1.48 };
    }
  });
  const [showAlert, setShowAlert] = useState("");
  const [alertType, setAlertType] = useState("default");

  // Persist payment config changes to localStorage.
  useEffect(() => {
    localStorage.setItem("payment-config", JSON.stringify(paymentConfig));
  }, [paymentConfig]);

  // Handler to update the current log state from inputs.
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setCurrentLog((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Calculates the rate based on the number of stops and current payment config.
  const calculateRate = useCallback(
    (stops) => {
      if (stops <= paymentConfig.cutoffPoint) {
        return stops * paymentConfig.rateBeforeCutoff;
      }
      return (
        paymentConfig.cutoffPoint * paymentConfig.rateBeforeCutoff +
        (stops - paymentConfig.cutoffPoint) * paymentConfig.rateAfterCutoff
      );
    },
    [paymentConfig]
  );

  // Displays an alert message for a fixed duration.
  const displayAlert = useCallback((message, type = "default") => {
    setShowAlert(message);
    setAlertType(type);
    setTimeout(() => {
      setShowAlert("");
      setAlertType("default");
    }, 3000);
  }, []);

  // Adds a new log entry.
  const handleAddEntry = useCallback(async () => {
    if (!currentLog.stops) {
      displayAlert("Please enter number of stops", "error");
      return;
    }

    setIsLoading(true);
    try {
      const stops = parseInt(currentLog.stops, 10);
      const extra = currentLog.extra ? parseFloat(currentLog.extra) : 0;
      const total = calculateRate(stops) + extra;

      const newLog = {
        id: Date.now(),
        date: currentLog.date,
        stops,
        extra,
        total,
        notes: currentLog.notes,
      };

      // Append the new log and sort the entries by date.
      const updatedLogs = [...(logs || []), newLog].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      await updateLogs(updatedLogs);
      setCurrentLog((prev) => ({
        ...prev,
        stops: "",
        extra: "",
        notes: "",
      }));
      displayAlert("Entry added successfully", "success");
    } catch (error) {
      displayAlert("Error adding entry. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentLog, logs, updateLogs, calculateRate, displayAlert]);

  // Deletes an entry by its id.
  const handleDeleteEntry = useCallback(
    async (id) => {
      try {
        const updatedLogs = (logs || []).filter((log) => log.id !== id);
        await updateLogs(updatedLogs);
        displayAlert("Entry deleted successfully", "success");
      } catch (error) {
        displayAlert("Error deleting entry", "error");
      }
    },
    [logs, updateLogs, displayAlert]
  );

  // Loading state.
  if (logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Error state.
  if (logsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Tabs */}
      <div className="flex rounded-lg shadow-sm bg-white dark:bg-gray-800 p-1 sticky top-0 z-10">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Tabs Content */}
      {activeTab === "entry" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="date"
                name="date"
                value={currentLog.date}
                onChange={handleInputChange}
                className="w-full"
              />
              <Input
                type="number"
                name="stops"
                placeholder="Number of stops"
                value={currentLog.stops}
                onChange={handleInputChange}
                className="w-full"
              />
              <Input
                type="number"
                name="extra"
                placeholder="Extra pay (optional)"
                value={currentLog.extra}
                onChange={handleInputChange}
                step="0.01"
                className="w-full"
              />
              <Input
                type="text"
                name="notes"
                placeholder="Notes (optional)"
                value={currentLog.notes}
                onChange={handleInputChange}
                className="w-full"
              />
              <Button onClick={handleAddEntry} className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Entry"
                )}
              </Button>
            </CardContent>
          </Card>

          {logs?.length > 0 && (
            <EntriesList logs={logs} onDeleteEntry={handleDeleteEntry} />
          )}
        </>
      )}

      {activeTab === "stats" && logs && <StatsOverview logs={logs} />}
      {activeTab === "invoice" && <InvoiceComparison logs={logs} />}
      {activeTab === "weekly" && <WeeklySummary logs={logs} />}
      {activeTab === "settings" && (
        <PaymentConfig currentConfig={paymentConfig} onSave={setPaymentConfig} />
      )}

      {/* Alert */}
      {showAlert && (
        <Alert
          className={`fixed bottom-4 left-4 right-4 ${
            alertType === "success"
              ? "bg-green-50 border-green-200"
              : alertType === "error"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <AlertDescription
            className={`${
              alertType === "success"
                ? "text-green-800"
                : alertType === "error"
                ? "text-red-800"
                : "text-gray-800"
            }`}
          >
            {showAlert}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default StopTracker;