import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Filter, Search, Package, ChevronDown, X } from "lucide-react";
import { Input } from "./ui/input";
import EntriesList from "./EntriesList";
import EntryChecker from "./EntryChecker";
import { useData } from "../contexts/DataContext";
import { calculateDayEarnings } from "../features/payperiod/payStructure";
import { Money } from "./ui/money";

const EntriesPage = () => {
  const { logs, updateLogs, loading, paymentConfig } = useData();
  const location = useLocation();
  const showTourExample = !!location.state?.walkthrough && (logs || []).length === 0;
  const tourAmount = calculateDayEarnings(paymentConfig,{quantity:150});
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editing,setEditing] = useState(null);

  const handleDeleteEntry = (id) => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    updateLogs((logs || []).filter((log) => log.id !== id));
  };

  const saveEdit=async()=>{
    if(!editing)return;
    const stops=Number(editing.stops)||0;
    const extra=Number(editing.extra)||0;
    const total=calculateDayEarnings(paymentConfig,{quantity:stops})+extra;
    await updateLogs((logs||[]).map(l=>l.id===editing.id?{...l,date:editing.date,stops,extra,total,notes:editing.notes||""}:l));
    setEditing(null);
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
    <div className="max-w-2xl mx-auto pb-24 -mt-2">
      

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Entries</h1>
        <span className="text-xs text-[#8e9ab2]">{(logs || []).length} days tracked</span>
      </div>

      <EntryChecker />

      {/* Day-by-day list, the focus */}
      <div data-tour="entries-ledger">
      {showTourExample ? (
        <div data-tour="entry-example" className="rounded-2xl border border-[#302a5b] bg-[#111827] p-4 shadow-lg shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold">Example work day</div>
              <div className="mt-1 text-xs text-muted-foreground">Tue, 22 Sep · 150 stops</div>
              <div className="mt-2 text-xs text-muted-foreground">Notes: Busy route, 1 collection</div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-[#9b91ff]"><Money amount={tourAmount}/></div>
              <div className="mt-1 text-[10px] text-[#7f8ba3]">expected</div>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-[#0d1422] px-3 py-2 text-[11px] text-[#8e9ab2]">During normal use, swipe this row to the right to edit it.</div>
        </div>
      ) : (logs || []).length === 0 ? (
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
        <><p className="mb-2 px-1 text-[11px] text-muted-foreground">Swipe an entry to the right to edit its date, stops or notes.</p><EntriesList logs={filteredLogs} onDeleteEntry={handleDeleteEntry} onEditEntry={setEditing} /></>
      )}
      </div>

      {editing&&<div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-3"><div className="w-full max-w-md rounded-[24px] border border-[#2a3550] bg-[#111827] p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Edit entry</h2><button onClick={()=>setEditing(null)} className="p-2 text-muted-foreground"><X/></button></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs text-muted-foreground">Date<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-white"/></label><label className="text-xs text-muted-foreground">Stops<input inputMode="numeric" type="number" value={editing.stops} onChange={e=>setEditing({...editing,stops:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-white"/></label><label className="text-xs text-muted-foreground">Extra (£)<input inputMode="decimal" type="number" step="0.01" value={editing.extra||""} onChange={e=>setEditing({...editing,extra:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-white"/></label></div><label className="mt-3 block text-xs text-muted-foreground">Notes<input value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})} placeholder="Add a note…" className="mt-1 h-11 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-white"/></label><button onClick={saveEdit} className="mt-4 h-12 w-full rounded-xl bg-[#7567ff] font-bold text-white">Save changes</button></div></div>}

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
