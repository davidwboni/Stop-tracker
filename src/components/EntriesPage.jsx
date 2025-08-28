import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { 
  FileText, 
  Filter, 
  Calendar,
  Download,
  Search
} from "lucide-react";
import { Input } from "./ui/input";
import EntriesList from "./EntriesList";
import { format } from "date-fns";
import { useData } from "../contexts/DataContext";

const EntriesPage = () => {
  const { logs, updateLogs, loading } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  const handleDeleteEntry = (id) => {
    const updatedLogs = logs.filter(log => log.id !== id);
    updateLogs(updatedLogs);
  };
  
  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.stops.toString().includes(searchTerm);
      
    const matchesDate = dateFilter === "" || log.date === dateFilter;
    
    return matchesSearch && matchesDate;
  });
  
  const exportEntries = () => {
    const exportData = filteredLogs.map(log => ({
      Date: format(new Date(log.date), 'dd/MM/yyyy'),
      Stops: log.stops,
      Extra: log.extra || 0,
      Total: log.total.toFixed(2),
      Notes: log.notes || ""
    }));
    
    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `stop-tracker-export-${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto"> {/* Removed fixed padding bottom */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardTitle className="flex items-center">
            <FileText className="mr-2" />
            All Delivery Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative md:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => setDateFilter("")}
              variant="ghost" 
              disabled={!dateFilter}
              className="flex-shrink-0"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filter
            </Button>
            <Button
              onClick={exportEntries}
              className="bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          
          {(logs || []).length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-200">No entries yet</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Start adding your delivery stops to track your earnings.</p>
            </div>
          ) : (
            <EntriesList 
              logs={filteredLogs} 
              onDeleteEntry={handleDeleteEntry} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EntriesPage;