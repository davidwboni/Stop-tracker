import React, { useState } from "react";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal"; // Assuming you have a modal component
import { Loader2, Download, CheckCircle } from "lucide-react";

const ExportData = ({ logs }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);

  const exportToCSV = () => {
    setError("");
    setIsExporting(true);
    setExportSuccess(false);

    try {
      if (!logs || logs.length === 0) {
        throw new Error("No data available to export.");
      }

      const headers = ["Date", "Stops", "Extra", "Total"];
      const csvData = [
        headers,
        ...logs.map((log) => [
          new Date(log.date).toLocaleDateString(),
          log.stops,
          log.extra,
          log.total,
        ]),
      ];

      const csvContent = csvData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stops-data-${new Date().toLocaleDateString()}.csv`;
      link.click();

      setExportSuccess(true);
    } catch (e) {
      setError(e.message || "Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div>
      {/* Export Button */}
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="w-full bg-[var(--background)] text-[var(--text)] hover:bg-[var(--primary)] hover:text-white transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Export Data
      </Button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} title="Export Data">
          <p className="text-sm text-[var(--text)]">
            Are you sure you want to export your data? This will download a CSV file to your device.
          </p>
          {error && (
            <div className="mt-2 text-sm text-red-600">{error}</div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="w-auto text-[var(--text)] hover:bg-[var(--background-muted)]"
            >
              Cancel
            </Button>
            <Button
              onClick={exportToCSV}
              className="w-auto bg-[var(--primary)] hover:bg-[var(--secondary)] text-white"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </Modal>
      )}

      {/* Success Notification */}
      {exportSuccess && (
        <div className="mt-4 flex items-center gap-2 bg-green-100 text-green-800 p-3 rounded-md shadow">
          <CheckCircle className="w-5 h-5" />
          <p>Data exported successfully!</p>
        </div>
      )}
    </div>
  );
};

export default ExportData;