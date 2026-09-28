import React, { useState } from "react";
import { motion } from "framer-motion";
import { useInvoice } from "../contexts/InvoiceContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {buildInvoicePdf} from '../services/invoicePdf';
import {
  Plus,
  Download,
  Share2,
  Building2,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

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
  const [invoiceAmount, setInvoiceAmount] = useState(prefill?.statementAmount != null ? String(prefill.statementAmount) : "");
  const [sender, setSender] = useState(
    senderProfile || { name: "", address: "", email: "", extra: "" }
  );

  const [invoiceNumber] = useState(() => getNextInvoiceNumber());
  const [dateFrom, setDateFrom] = useState(prefill?.startDate || "");
  const [dateTo, setDateTo] = useState(prefill?.endDate || "");
  const [client, setClient] = useState(null);

  React.useEffect(() => {
    if (!client && clients?.length === 1) setClient(clients[0]);
  }, [clients, client]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newClient, setNewClient] = useState(null);
  const [notes, setNotes] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [persisted, setPersisted] = useState(false);

  const total = Number(invoiceAmount) || 0;

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
            Set this up once and Stop Tracker will reuse it for future four-week invoices. Guest details stay on this device; signed-in details are saved to your account.
          </p>
        </div>

        <Field label="Your / business name" value={sender.name} onChange={(v) => setSender({ ...sender, name: v })} />
        <Field label="Address" value={sender.address} onChange={(v) => setSender({ ...sender, address: v })} />
        <Field label="Email" value={sender.email} onChange={(v) => setSender({ ...sender, email: v })} />
        <Field label="UTR / VAT no. / company details" optional value={sender.extra} onChange={(v) => setSender({ ...sender, extra: v })} />

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
    setBusy(true);try{const all=await saveClient(newClient);chooseClient(all[all.length-1]||newClient);}catch(e){setError(e.message||'Could not save client.');}finally{setBusy(false);}
  };

  // ---------- Generate PDF ----------
  const invoiceRecord = () => ({invoiceNumber,senderSnapshot:{...sender},clientSnapshot:{...client},notes,issuedDate:new Date().toISOString().slice(0,10),clientName:client.name,clientEmail:client.email||'',invoiceAmount:total.toFixed(2),dateFrom,dateTo,lines:[{desc:'Delivery services',qty:'1',rate:String(total)}],periodId:prefill?.periodId||null,status:'generated'});
  const persist = async () => { if(persisted)return; await addInvoice(invoiceRecord());setPersisted(true); };

  const canGenerate = client && total > 0 && /^\d+(\.\d{1,2})?$/.test(invoiceAmount) && Number.isSafeInteger(Math.round(total*100)) && dateFrom && dateTo && dateFrom<=dateTo;

  const handleDownload = async () => {
    if (!canGenerate) return setError("Add a client and the amount you need to invoice.");
    setBusy(true);
    setError(null);
    try {
      const docPdf = await buildInvoicePdf(invoiceRecord());
      await persist();
      docPdf.save(`Invoice_${invoiceNumber}.pdf`);

      setSaved(true);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Couldn't generate the invoice.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!canGenerate) return setError("Add a client and the amount you need to invoice.");
    setBusy(true);
    setError(null);
    try {
      const docPdf = await buildInvoicePdf(invoiceRecord());
      const blob = docPdf.output("blob");
      const file = new File([blob], `Invoice_${invoiceNumber}.pdf`, { type: "application/pdf" });
      await persist();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${invoiceNumber}`, text: `Invoice for ${client.name}` });
      } else {
        throw new Error("Sharing files is not supported by this browser. Use Download instead.");
      }


      setSaved(true);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error(e);
        setError(e?.message || "Couldn't share the invoice.");
      }
    } finally {
      setBusy(false);
    }
  };

  if(persisted)return <section className="home-card space-y-3"><h2>Invoice record saved</h2><p>Your invoice record is in Documents. You can download another copy from invoice history.</p>{error&&<p role="alert" className="home-error">{error} Your record is saved.</p>}<a href="/app/documents" className="home-primary">Open Documents</a></section>;
  // ---------- Create form ----------
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {prefill?.periodId && <div className="rounded-[18px] border border-border bg-card p-4"><div className="text-xs font-bold uppercase tracking-wider text-primary">PAY PERIOD</div><div className="mt-1 font-semibold">{prefill.startDate} → {prefill.endDate}</div><div className="mt-1 text-sm text-muted-foreground">{prefill.stops || 0} stops in your Stop Tracker record · {money(prefill.amount)} expected</div></div>}

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
        <Field label="From" type="date" value={dateFrom} onChange={setDateFrom} />
        <Field label="To" type="date" value={dateTo} onChange={setDateTo} />
      </div>

      {/* Client on demand */}
      {client ? (
        <div className="rounded-[14px] bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary">Billed to</span>
            <button aria-label="Change client" className="min-h-[44px] min-w-[44px] grid place-items-center" onClick={() => setClient(null)}><X className="w-4 h-4 text-primary" /></button>
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
              <Input aria-label="Client name" maxLength={200} placeholder="Client name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              <Input aria-label="Client email" maxLength={254} placeholder="Email (optional)" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              <Input aria-label="Client address" maxLength={500} placeholder="Address (optional)" value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={saveNewClient}>Save client</Button>
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

      <div className="rounded-2xl border border-border bg-card p-4">
        <label htmlFor="invoice-amount" className="block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Amount to invoice</label>
        <div className="mt-2 flex items-center rounded-xl border border-border bg-background px-4"><span className="text-xl text-muted-foreground">£</span><input id="invoice-amount" inputMode="decimal" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)} placeholder="0.00" className="h-14 min-w-0 flex-1 bg-transparent px-2 text-2xl font-bold text-foreground outline-none"/></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{prefill?.statementAmount != null ? "Prefilled from the statement you checked. Change it only if needed." : "Enter the agreed amount for this invoice. Check any required tax details with your contractor."}</p>
      </div>

      <textarea aria-label="Invoice notes (optional)" maxLength={5000}
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
      <Input type={type} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[44px] text-base mt-1" />
      </label>
    </div>
  );
}
