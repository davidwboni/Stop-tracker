import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import {
  FileText,
  Download,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { useInvoice } from "../contexts/InvoiceContext";

const InvoiceHistory = () => {
  const { invoices, deleteInvoice } = useInvoice();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toString().includes(searchTerm) ||
    inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceAmount.toString().includes(searchTerm)
  );

  const handleDelete = async (id) => {
    try {
      await deleteInvoice(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const handleViewPDF = (invoice) => {
    // In a real app, you would regenerate or fetch the saved PDF
    alert(`PDF viewing for invoice #${invoice.invoiceNumber} would open here`);
  };

  const handleEmailInvoice = (invoice) => {
    const subject = `Invoice #${invoice.invoiceNumber}`;
    const body = `Please find attached invoice #${invoice.invoiceNumber} for £${invoice.invoiceAmount}.`;
    window.location.href = `mailto:${invoice.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by invoice number, client, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Invoices Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search" : "Create your first invoice to see it here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Invoice #{invoice.invoiceNumber}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(invoice.invoiceStartDate), "MMM d")} - {format(new Date(invoice.invoiceEndDate), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold text-primary">£{parseFloat(invoice.invoiceAmount).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <p className="text-muted-foreground">Client: <span className="text-foreground font-medium">{invoice.clientName}</span></p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleEmailInvoice(invoice)}
                        size="sm"
                        variant="outline"
                        className="h-9 gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>

                      {deleteConfirm === invoice.id ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => handleDelete(invoice.id)}
                            size="sm"
                            variant="destructive"
                            className="h-9 text-xs"
                          >
                            Confirm Delete
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirm(null)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setDeleteConfirm(invoice.id)}
                          size="sm"
                          variant="ghost"
                          className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {invoices.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold text-primary">{invoices.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-primary">
                  £{invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Value</p>
                <p className="text-2xl font-bold text-primary">
                  £{(invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0) / invoices.length).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Invoice</p>
                <p className="text-2xl font-bold text-primary">
                  #{invoices[0]?.invoiceNumber || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceHistory;
