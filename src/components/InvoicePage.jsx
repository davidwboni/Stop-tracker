import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import InvoiceCreate from "./InvoiceCreate";
import InvoiceHistory from "./InvoiceHistory";
import PayPeriodList from "../features/payperiod/PayPeriodList";
import TabCoach from "./TabCoach";
import { FileText, CheckCircle2, History } from "lucide-react";
import { useLocation } from "react-router-dom";

const InvoicePage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("create");
  const [prefillInvoice, setPrefillInvoice] = useState(null);

  useEffect(() => {
    if (location.state?.periodId) {
      setPrefillInvoice({ periodId: location.state.periodId, startDate: location.state.startDate, endDate: location.state.endDate, amount: location.state.amount, stops: location.state.stops });
      setActiveTab("create");
    }
  }, [location.state]);

  const handleGenerateInvoice = (prefill) => {
    setPrefillInvoice(prefill);
    setActiveTab("create");
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto pb-24 pt-2 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        </div>
        <p className="mt-2 text-muted-foreground text-sm">Create an invoice from your work ledger and keep every four-week invoice together.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#111827] border border-[#202a3d] h-auto rounded-[16px] p-1 gap-1">
          <TabsTrigger value="create" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 rounded-[12px]">
            <FileText className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Create</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 rounded-[12px]">
            <History className="h-4 w-4" />
            <span className="text-xs sm:text-sm">History</span>
          </TabsTrigger>
          
        </TabsList>

        {/* One-line explainer so a first-time user knows what each tab does */}
        <p className="text-sm text-muted-foreground mt-3 px-1">
          {activeTab === "create" && "Build a new invoice from your logged deliveries."}
          {activeTab === "history" && "View, share, or delete invoices you've already made."}
          
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

        
      </Tabs>
    </motion.div>
  );
};

export default InvoicePage;
