import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import InvoiceGeneratorNew from "./InvoiceGeneratorNew";
import InvoiceHistory from "./InvoiceHistory";
import InvoiceCompare from "./InvoiceCompare";
import PremiumFeatureGate from "./PremiumFeatureGate";
import { FileText, CheckCircle2, History, Crown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const InvoicePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const isPro = user?.role === "pro";

  return (
    <motion.div
      className="max-w-5xl mx-auto pb-safe px-4 py-6 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          {!isPro && (
            <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              PRO FEATURE
            </span>
          )}
        </div>
        <p className="text-muted-foreground">Create and manage your invoices seamlessly</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
            <span className="sm:hidden">New</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">Past</span>
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Verify</span>
            <span className="sm:hidden">Check</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PremiumFeatureGate featureName="Invoice Creation">
              <InvoiceGeneratorNew />
            </PremiumFeatureGate>
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PremiumFeatureGate featureName="Invoice History">
              <InvoiceHistory />
            </PremiumFeatureGate>
          </motion.div>
        </TabsContent>

        <TabsContent value="verify" className="mt-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InvoiceCompare />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default InvoicePage;
