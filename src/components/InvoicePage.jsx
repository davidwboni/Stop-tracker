import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import InvoiceCreate from "./InvoiceCreate";
import InvoiceHistory from "./InvoiceHistory";
import PayPeriodList from "../features/payperiod/PayPeriodList";
import EntryChecker from "./EntryChecker";
import TabCoach from "./TabCoach";
import { FileText, CheckCircle2, History, Crown, ScanLine } from "lucide-react";
import { trackEvent } from "../services/productAnalytics";

const InvoicePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = ["create", "history", "verify"].includes(requestedTab) ? requestedTab : "create";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [prefillInvoice, setPrefillInvoice] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "create" ? {} : { tab }, { replace: true });
  };

  useEffect(() => {
    trackEvent("invoice_tab_viewed", { tab: activeTab });
    if (activeTab === "verify") {
      trackEvent("invoice_check_started", { surface: "invoice" });
    }
  }, [activeTab]);

  const handleGenerateInvoice = (prefill) => {
    setPrefillInvoice(prefill);
    setActiveTab("create");
  };

  if (activeTab === "verify") {
    return (
      <motion.div
        className="max-w-2xl mx-auto pb-safe px-4 py-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold">Check Pay</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compare your own Stop Tracker record with the total shown on your statement.
          </p>
        </div>

        <EntryChecker />

        <div className="mt-4 rounded-[16px] border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-[12px] bg-primary/10 p-2 text-primary">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm">Scan statement with AI</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Crown className="h-3 w-3" /> PRO
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Upload a photo or PDF and let Stop Tracker read the statement for you. This will be a premium feature so API costs are covered.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 h-9 rounded-[11px] border border-border bg-card px-3 text-xs font-semibold text-muted-foreground opacity-70"
              >
                Coming with Pro
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleTabChange("create")}
          className="mt-5 text-xs text-muted-foreground underline underline-offset-4"
        >
          Open legacy invoice tools
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto pb-safe px-4 py-6 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <TabCoach
        id="invoice"
        title="Invoices"
        body="Create builds a new invoice (set your business details once, add a client, add lines). History keeps them. Check Pay compares a statement against what you actually delivered."
      />

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
        </div>
        <p className="text-muted-foreground text-sm">Create invoices and check you've been paid right</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted h-auto rounded-[16px] p-1 gap-1">
          <TabsTrigger value="create" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 rounded-[12px]">
            <FileText className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Create</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 rounded-[12px]">
            <History className="h-4 w-4" />
            <span className="text-xs sm:text-sm">History</span>
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 rounded-[12px]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Check Pay</span>
          </TabsTrigger>
        </TabsList>

        {/* One-line explainer so a first-time user knows what each tab does */}
        <p className="text-sm text-muted-foreground mt-3 px-1">
          {activeTab === "create" && "Build a new invoice from your logged deliveries."}
          {activeTab === "history" && "View, share, or delete invoices you've already made."}
          {activeTab === "verify" && "Compare a pay statement against what you actually delivered."}
        </p>

        <TabsContent value="create" className="mt-4">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InvoiceCreate prefill={prefillInvoice} />
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InvoiceHistory />
          </motion.div>
        </TabsContent>

        <TabsContent value="verify" className="mt-4">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PayPeriodList onGenerateInvoice={handleGenerateInvoice} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default InvoicePage;
