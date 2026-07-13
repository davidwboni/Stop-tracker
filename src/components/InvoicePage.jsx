import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import InvoiceCreate from "./InvoiceCreate";
import InvoiceHistory from "./InvoiceHistory";
import PayPeriodList from "../features/payperiod/PayPeriodList";
import TabCoach from "./TabCoach";
import { FileText, CheckCircle2, History } from "lucide-react";

const InvoicePage = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [prefillInvoice, setPrefillInvoice] = useState(null);

  const handleGenerateInvoice = (prefill) => {
    setPrefillInvoice(prefill);
    setActiveTab("create");
  };

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
