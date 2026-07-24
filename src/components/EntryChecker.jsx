import React, { useState, useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Input } from "./ui/input";
import { Money } from "./ui/money";
import { ClipboardCheck, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";

// Dead-simple reconciliation, right where the driver keeps their logs: pick the
// invoice's period, type its total stops, and see instantly whether your logged
// entries match. No pay dates, VAT, admin or DPD-charge fields - those are extras
// the driver doesn't want to fill in just to sanity-check a stop count.
const EntryChecker = () => {
  const { logs } = useData();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invoiceStops, setInvoiceStops] = useState("");

  const result = useMemo(() => {
    if (!from || !to) return null;
    const inRange = (logs || []).filter((l) => l.date >= from && l.date <= to);
    const loggedStops = inRange.reduce((s, l) => s + (l.stops || 0), 0);
    const loggedPay = inRange.reduce((s, l) => s + (l.total || 0), 0);
    const invoice = parseInt(invoiceStops, 10);
    const hasInvoice = !Number.isNaN(invoice);
    return {
      loggedStops,
      loggedPay,
      days: inRange.length,
      invoice,
      hasInvoice,
      diff: hasInvoice ? loggedStops - invoice : null,
    };
  }, [logs, from, to, invoiceStops]);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-[14px] px-4 py-3 touch-manipulation active:scale-[0.99] transition-transform"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Check against an invoice
        </span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 bg-card border border-border rounded-[14px] p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Pick the invoice's period and type its total stops. We'll compare it to what you logged.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 text-sm rounded-[12px]" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 text-sm rounded-[12px]" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Stops on the invoice</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 852"
              value={invoiceStops}
              onChange={(e) => setInvoiceStops(e.target.value)}
              className="h-10 text-sm rounded-[12px]"
            />
          </div>

          {result && (
            <div className="rounded-[12px] bg-primary/5 border border-primary/20 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You logged</span>
                <span className="font-semibold tabular-nums">
                  {result.loggedStops} stops · {result.days} days
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your total pay</span>
                <span className="font-semibold text-primary"><Money amount={result.loggedPay} /></span>
              </div>
              {result.hasInvoice && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invoice stops</span>
                    <span className="font-semibold tabular-nums">{result.invoice}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 pt-2 mt-1 border-t border-border text-sm font-medium ${
                      result.diff === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {result.diff === 0 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {result.diff === 0
                      ? "Perfect match - your log matches the invoice."
                      : result.diff > 0
                        ? `You logged ${result.diff} more than the invoice says.`
                        : `You logged ${Math.abs(result.diff)} fewer than the invoice says.`}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EntryChecker;
