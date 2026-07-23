import React, { useState } from "react";
import { motion } from "framer-motion";
import { useInvoice } from "../contexts/InvoiceContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Plus,
  Trash2,
  Download,
  Share2,
  Building2,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

const blankLine = () => ({ id: Date.now() + Math.random(), desc: "", qty: "", rate: "" });
const money = (n) => `£${(Number(n) || 0).toFixed(2)}`;

export default function InvoiceCreate({ prefill }) {
  const {
    clients,
    saveClient,
    addInvoice,
    getNextInvoiceNumber,
    senderProfile,
    saveSenderProfile,
  } = useInvoice();

  const [editingSender, setEditingSender] = useState(false);
  const [sender, setSender] = useState(
    senderProfile || { name: "", address: "", email: "", extra: "" }
  );

  const [invoiceNumber] = useState(() => getNextInvoiceNumber());
  const [dateFrom, setDateFrom] = useState(prefill?.startDate || "");
  const [dateTo, setDateTo] = useState(prefill?.endDate || "");
  const [client, setClient] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newClient, setNewClient] = useState(null);
  const [lines, setLines] = useState(
    prefill?.amount
      ? [{ id: 1, desc: "Delivery earnings", qty: "1", rate: String(prefill.amount) }]
      : [blankLine()]
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const total = lines.reduce(
    (s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0),
    0
  );

  const setLine = (id, key, val) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((ls) => [...ls, blankLine()]);
  const removeLine = (id) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  // ---------- Sender setup gate ----------
  const saveSender = async () => {
    if (!sender.name.trim()) return setError("Add your name or business name.");
    setBusy(true);
    setError(null);
    try {
      await saveSenderProfile(sender);
      setEditingSender(false);
    } catch (e) {
      setError("Couldn't save your details. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!senderProfile || editingSender) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="rounded-[14px] bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Your invoice details</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This is your own business info shown on every invoice. Set it once, edit anytime.
          </p>
        </div>

        <Field label="Your / business name" value={sender.name} onChange={(v) => setSender({ ...sender, name: v })} />
        <Field label="Address" value={sender.address} onChange={(v) => setSender({ ...sender, address: v })} />
        <Field label="Email" value={sender.email} onChange={(v) => setSender({ ...sender, email: v })} />
        <Field label="UTR / VAT no." optional value={sender.extra} onChange={(v) => setSender({ ...sender, extra: v })} />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={saveSender} disabled={busy} className="bg-primary text-primary-foreground">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save &amp; continue
          </Button>
          {senderProfile && (
            <Button variant="outline" onClick={() => setEditingSender(false)} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // ---------- Client actions ----------
  const chooseClient = (c) => {
    setClient(c);
    setPickerOpen(false);
    setNewClient(null);
  };
  const saveNewClient = async () => {
    if (!newClient?.name?.trim()) return setError("Add a client name.");
    setError(null);
    const all = await saveClient(newClient);
    chooseClient(all[all.length - 1] || newClient);
  };

  // ---------- Generate PDF ----------
  const buildPdf = () => {
    const docPdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;

    docPdf.setFontSize(22);
    docPdf.text("INVOICE", margin, y);
    docPdf.setFontSize(10);
    docPdf.text(`No. ${invoiceNumber}`, 555, y, { align: "right" });
    docPdf.text(new Date().toLocaleDateString("en-GB"), 555, y + 14, { align: "right" });
    y += 30;

    docPdf.setFontSize(11);
    docPdf.setFont(undefined, "bold");
    docPdf.text(sender.name, margin, y);
    docPdf.setFont(undefined, "normal");
    docPdf.setFontSize(9);
    [sender.address, sender.email, sender.extra].filter(Boolean).forEach((l, i) => {
      docPdf.text(String(l), margin, y + 14 + i * 12);
    });

    y += 70;
    docPdf.setFontSize(9);
    docPdf.setTextColor(120);
    docPdf.text("BILL TO", margin, y);
    docPdf.setTextColor(0);
    docPdf.setFontSize(11);
    docPdf.setFont(undefined, "bold");
    docPdf.text(client.name, margin, y + 15);
    docPdf.setFont(undefined, "normal");
    docPdf.setFontSize(9);
    [client.address, client.email].filter(Boolean).forEach((l, i) => {
      docPdf.text(String(l), margin, y + 29 + i * 12);
    });
    if (dateFrom || dateTo) {
      docPdf.text(`Period: ${dateFrom || "-"} to ${dateTo || "-"}`, 555, y + 15, { align: "right" });
    }

    autoTable(docPdf, {
      startY: y + 60,
      head: [["Description", "Qty", "Rate", "Amount"]],
      body: lines
        .filter((l) => l.desc || l.qty || l.rate)
        .map((l) => [
          l.desc || "-",
          l.qty || "1",
          money(l.rate),
          money((parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0)),
        ]),
      foot: [["", "", "Total", money(total)]],
      theme: "striped",
      headStyles: { fillColor: [29, 158, 117] },
      footStyles: { fillColor: [225, 245, 238], textColor: [15, 110, 86], fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });

    if (notes) {
      const afterY = docPdf.lastAutoTable.finalY + 24;
      docPdf.setFontSize(9);
      docPdf.setTextColor(120);
      docPdf.text("Notes", margin, afterY);
      docPdf.setTextColor(0);
      docPdf.text(docPdf.splitTextToSize(notes, 515), margin, afterY + 14);
    }
    return docPdf;
  };

  const persist = async () => {
    await addInvoice({
      invoiceNumber,
      clientName: client.name,
      clientEmail: client.email || "",
      invoiceAmount: total.toFixed(2),
      dateFrom,
      dateTo,
      lines,
    });
  };

  const canGenerate = client && total > 0;

  const handleDownload = async () => {
    if (!canGenerate) return setError("Add a client and at least one line with an amount.");
    setBusy(true);
    setError(null);
    try {
      const docPdf = buildPdf();
      docPdf.save(`Invoice_${invoiceNumber}.pdf`);
      await persist();
      setSaved(true);
    } catch (e) {
      console.error(e);
      setError("Couldn't generate the invoice.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!canGenerate) return setError("Add a client and at least one line with an amount.");
    setBusy(true);
    setError(null);
    try {
      const docPdf = buildPdf();
      const blob = docPdf.output("blob");
      const file = new File([blob], `Invoice_${invoiceNumber}.pdf`, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${invoiceNumber}`, text: `Invoice for ${client.name}` });
      } else {
        docPdf.save(`Invoice_${invoiceNumber}.pdf`);
      }
      await persist();
      setSaved(true);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setError("Couldn't share the invoice.");
      }
    } finally {
      setBusy(false);
    }
  };

  // ---------- Create form ----------
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header row: number + sender */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Invoice no.</div>
          <div className="text-lg font-bold text-primary tabular-nums">INV-{String(invoiceNumber).padStart(4, "0")}</div>
        </div>
        <button
          onClick={() => { setSender(senderProfile); setEditingSender(true); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5" />
          From: {senderProfile.name}
        </button>
      </div>

      {/* Optional dates */}
      <div className="flex gap-2">
        <Field label="From" optional type="date" value={dateFrom} onChange={setDateFrom} />
        <Field label="To" optional type="date" value={dateTo} onChange={setDateTo} />
      </div>

      {/* Client on demand */}
      {client ? (
        <div className="rounded-[14px] bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary">Billed to</span>
            <button onClick={() => setClient(null)}><X className="w-4 h-4 text-primary" /></button>
          </div>
          <div className="font-semibold text-primary">{client.name}</div>
          {client.email && <div className="text-xs text-muted-foreground">{client.email}</div>}
        </div>
      ) : pickerOpen ? (
        <div className="rounded-[14px] border border-border overflow-hidden">
          {clients.map((c) => (
            <button key={c.id} onClick={() => chooseClient(c)} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/40 border-b border-border flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              {c.name}
            </button>
          ))}
          {newClient ? (
            <div className="p-3 space-y-2 bg-muted/20">
              <Input placeholder="Client name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              <Input placeholder="Email (optional)" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              <Input placeholder="Address (optional)" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNewClient}>Save client</Button>
                <Button size="sm" variant="outline" onClick={() => setNewClient(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNewClient({ name: "", email: "", address: "" })} className="w-full text-left px-3 py-2.5 text-sm text-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add a new client…
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full h-11 border-[1.5px] border-dashed border-border rounded-[14px] text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:border-primary/40 touch-manipulation"
        >
          <Plus className="w-4 h-4" /> Add a client
        </button>
      )}

      {/* Editable line items */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Line items</div>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="flex gap-1.5 items-center">
              <Input className="flex-1 h-9 text-sm" placeholder="e.g. Deliveries" value={l.desc} onChange={(e) => setLine(l.id, "desc", e.target.value)} />
              <Input className="w-12 h-9 text-sm text-center" inputMode="numeric" placeholder="Qty" value={l.qty} onChange={(e) => setLine(l.id, "qty", e.target.value)} />
              <Input className="w-16 h-9 text-sm text-center" inputMode="decimal" placeholder="£" value={l.rate} onChange={(e) => setLine(l.id, "rate", e.target.value)} />
              <button onClick={() => removeLine(l.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addLine} className="mt-2 text-sm text-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add line
        </button>
      </div>

      <div className="flex items-center justify-between px-1 py-2 border-t border-border">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold text-primary tabular-nums">{money(total)}</span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notes (optional)"
        className="w-full rounded-[12px] border border-border bg-input p-3 text-sm resize-none"
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <AlertDescription>Invoice INV-{String(invoiceNumber).padStart(4, "0")} saved to History.</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleDownload} disabled={busy || !canGenerate} className="flex-1 bg-primary text-primary-foreground">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download
        </Button>
        <Button onClick={handleShare} disabled={busy || !canGenerate} variant="outline" className="flex-1">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, optional, type = "text" }) {
  return (
    <div className="flex-1">
      <label className="block text-xs text-muted-foreground mb-1">
        {label} {optional && <span className="opacity-70">(optional)</span>}
      </label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm" />
    </div>
  );
}
