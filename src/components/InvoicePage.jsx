import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import InvoiceGenerator from "./InvoiceGenerator";
import InvoiceCompare from "./InvoiceCompare";
import { FileText, CheckCircle2 } from "lucide-react";

const InvoicePage = () => {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <motion.div
      className="max-w-5xl mx-auto pb-safe px-4 py-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Invoice Management</h1>
        <p className="text-muted-foreground">Create and manage your invoices seamlessly</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">Create</span>
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Verify Invoice</span>
            <span className="sm:hidden">Verify</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <InvoiceGenerator />
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
