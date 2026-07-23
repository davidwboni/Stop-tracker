import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, Filter, Search, Package, ChevronDown } from "lucide-react";
import { Input } from "./ui/input";
import EntriesList from "./EntriesList";
import TabCoach from "./TabCoach";
import { useData } from "../contexts/DataContext";

const EntriesPage = () => {
  const { logs, updateLogs, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleDeleteEntry = (id) => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    updateLogs((logs || []).filter((log) => log.id !== id));
  };

  const filteredLogs = (logs || []).filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.stops.toString().includes(searchTerm);

    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.date);
      if (startDate && endDate) matchesDate = logDate >= new Date(startDate) && logDate <= new Date(endDate);
      else if (startDate) matchesDate = logDate >= new Date(startDate);
      else if (endDate) matchesDate = logDate <= new Date(endDate);
    }
    return matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasFilters = searchTerm || startDate || endDate;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
      <TabCoach
        id="entries"
        title="Your entries"
        body="Every day you log lands here, newest first. Tap a day to see the detail; search and date filters sit just below the list. Swipe left or right to hop between tabs."
      />

      {/* Slim header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-[12px]">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Entries</h1>
          <p className="text-xs text-muted-foreground">{(logs || []).length} days tracked</p>
        </div>
      </div>

      {/* Day-by-day list, the focus */}
      {(logs || []).length === 0 ? (
        <Card className="border-2 border-dashed border-border rounded-[18px]">
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1">No entries yet</h3>
            <p className="text-muted-foreground text-sm">Log a delivery on the Home tab to see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <EntriesList logs={filteredLogs} onDeleteEntry={handleDeleteEntry} />
      )}

      {/* Search & filter, secondary, below the list */}
      {(logs || []).length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-1 py-2 text-sm text-muted-foreground touch-manipulation"
            aria-expanded={showFilters}
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search &amp; filter
              {hasFilters && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                  {filteredLogs.length} results
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {showFilters && (
            <div className="mt-2 space-y-2 bg-card border border-border rounded-[14px] p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search stops or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 rounded-[12px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 text-sm rounded-[12px]" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 text-sm rounded-[12px]" />
              </div>
              <Button
                onClick={() => { setStartDate(""); setEndDate(""); setSearchTerm(""); }}
                variant="outline"
                disabled={!hasFilters}
                className="w-full h-10 rounded-[12px]"
              >
                <Filter className="w-4 h-4 mr-2" /> Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntriesPage;
