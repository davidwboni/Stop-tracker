import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useInvoice } from "../contexts/InvoiceContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {buildInvoicePdf} from '../services/invoicePdf';
import {
  Plus,
  Download,
  Send,
  Copy,
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
    defaultClientId,
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

  const initialRecipientSelected = useRef(false);
  React.useEffect(() => {
    if (initialRecipientSelected.current || !clients?.length) return;
    const candidate = clients.find(c=>c.id===defaultClientId) || (clients.length===1?clients[0]:null);
    if (candidate) {
      initialRecipientSelected.current = true;
      setClient(candidate);
      setRecipientDraft(candidate.email||'');
      setEditingRecipient(!candidate.email);
    }
  }, [clients,defaultClientId]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newClient, setNewClient] = useState(null);
  const [notes, setNotes] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareCanceled, setShareCanceled] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [recipientDraft, setRecipientDraft] = useState('');

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
    setRecipientDraft(c.email||'');
    setEditingRecipient(!c.email);
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
  const persist = async () => { if(persisted)return; await addInvoice(invoiceRecord(),{defaultClientId:client?.id});setPersisted(true); };

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
      setError(e?.message || "Couldn't generate the invoice.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!canGenerate) return setError("Add a client and confirm the amount and billing period.");
    if (!client?.email?.trim()) return setError("Add your contractor's billing email before sending.");
    setBusy(true);setError(null);setShared(false);setShareCanceled(false);
    try {
      // Store one immutable invoice record once; a cancelled share never creates a second number.
      const docPdf = await buildInvoicePdf(invoiceRecord());
      await persist();
      const file = new File([docPdf.output("blob")], `Invoice_${invoiceNumber}.pdf`, {type:"application/pdf"});
      if(navigator.share && navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:`Invoice ${invoiceNumber}`,text:`Invoice ${invoiceNumber} for ${client.name}. Please email to ${client.email}.`});
        // A resolved Web Share promise is NOT email delivery confirmation.
        setShared(true);
      }else{
        // mailto can prefill the recipient but cannot attach a PDF.
        // Download the exact saved PDF, then attach it in the email app.
        docPdf.save(`Invoice_${invoiceNumber}.pdf`);
        const subject=encodeURIComponent(`Invoice INV-${String(invoiceNumber).padStart(4,"0")} · ${dateFrom} – ${dateTo}`);
        const body=encodeURIComponent(`Please find my invoice for ${dateFrom} – ${dateTo} attached.\n\nAttach Invoice_${invoiceNumber}.pdf from your downloads before sending.`);
        window.location.href=`mailto:${encodeURIComponent(client.email)}?subject=${subject}&body=${body}`;
        setShared(true);
      }
    }catch(e){
      if(e?.name==="AbortError")setShareCanceled(true);
      else setError(e?.message||"Could not prepare or share your invoice. Try again, or download the PDF.");
    }finally{setBusy(false);}
  };
  const saveRecipient = async () => {
    const email=recipientDraft.trim();
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))return setError("Enter a valid billing email.");
    setBusy(true);setError(null);
    try{
      await saveClient({...client,email});
      setClient(c=>({...c,email}));
      setEditingRecipient(false);
      setEmailCopied(false);
    }catch(_){setError("Could not save this billing email. Retry when connected.");}
    finally{setBusy(false);}
  };
  const copyRecipient = async () => {
    try {await navigator.clipboard.writeText(client?.email||'');setEmailCopied(true);}
    catch(_){setError("Copy isn't available on this device. You can select the email address above.");}
  };

  // ---------- Create form ----------
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {prefill?.periodId && <div className="rounded-[18px] border border-border bg-card p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-primary">FOUR-WEEK PAY PERIOD</div>
        <div className="mt-1 font-semibold">{prefill.startDate} → {prefill.endDate}</div>
        <div className="mt-1 text-sm text-muted-foreground">{prefill.statementAmount != null ? "Checked statement amount prefilled. Review VAT and the recipient before sending." : "No verified statement amount. Review all invoice details before sending."}</div>
      </div>}

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
          {client.email && <div className="text-xs text-muted-foreground select-text">{client.email}</div>}
          {editingRecipient?<div className="flex flex-col gap-2 mt-2">
            <label className="text-xs text-muted-foreground">Billing email
              <Input type="email" autoComplete="email" aria-label="Billing email" value={recipientDraft} onChange={e=>setRecipientDraft(e.target.value)} placeholder="billing@contractor.co.uk" className="mt-1 min-h-[44px]"/>
            </label>
            <Button type="button" disabled={busy} onClick={saveRecipient} className="min-h-[44px]">Save billing email</Button>
            {client.email&&<button type="button" className="home-text-button text-xs" onClick={()=>setEditingRecipient(false)}>Cancel</button>}
           </div>:
           <div className="flex flex-wrap gap-3">
             {client.email&&<button className="home-text-button text-xs" type="button" onClick={copyRecipient}><Copy size={14}/> {emailCopied?'Copied':'Copy email'}</button>}
             <button type="button" className="home-text-button text-xs" onClick={()=>setEditingRecipient(true)}>Change billing email</button>
           </div>}
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
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{prefill?.statementAmount != null ? "From your checked statement. Confirm whether VAT should be added or is already included before sending." : "Enter the agreed amount and verify whether VAT should be shown separately."}</p>
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
      {persisted && (
        <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <AlertDescription>Invoice INV-{String(invoiceNumber).padStart(4, "0")} is saved in Records. {shared?'The share or email composer was opened; please confirm sending in your email app.':shareCanceled?'Sharing was cancelled. The invoice is saved; you can try again.':saved?'The PDF was downloaded.':'Choose an email app to send the PDF.'} Stop Tracker cannot confirm email delivery through device sharing.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {!client?.email&&client&&<p className="text-xs text-amber-700 dark:text-amber-300">Add a billing email for this client to send the invoice. You can still download a PDF.</p>}
        <Button onClick={handleShare} disabled={busy||!canGenerate||!client?.email} className="w-full min-h-[52px] bg-primary text-primary-foreground">
          {busy?<Loader2 className="w-4 h-4 mr-2 animate-spin"/>:<Send className="w-4 h-4 mr-2"/>}Send invoice via email app
        </Button>
        <Button onClick={handleDownload} disabled={busy||!canGenerate} variant="outline" className="w-full min-h-[48px]">
          <Download className="w-4 h-4 mr-2"/>Download PDF
        </Button>
        <p className="text-xs text-muted-foreground">Your device opens the sharing or email app. Select email and confirm sending there. Delivery is not automatically verified.</p>
        {persisted&&<a href="/app/records?tab=documents" className="home-text-button">View saved invoice in Records</a>}
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
