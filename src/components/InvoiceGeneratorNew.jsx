import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  FileText,
  Download,
  Plus,
  X,
  CheckCircle2,
  Users,
  Mail,
  Share2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useData } from "../contexts/DataContext";
import { useInvoice } from "../contexts/InvoiceContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const InvoiceGeneratorNew = () => {
  const { logs } = useData();
  const { clients, saveClient, deleteClient, addInvoice, getNextInvoiceNumber } = useInvoice();

  // Invoice form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceStartDate, setInvoiceStartDate] = useState("");
  const [invoiceEndDate, setInvoiceEndDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  // Client selection
  const [selectedClientId, setSelectedClientId] = useState("new");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);

  // User details (would ideally come from user profile)
  const userDetails = {
    name: "David Boni",
    address: "98 Albany Road",
    city: "Crawley",
    county: "West Sussex",
    postcode: "RH11 7DG",
    country: "GB",
    phone: "07493668573",
    email: "davidwboni@gmail.com",
  };

  // Auto-populate next invoice number
  useEffect(() => {
    if (!invoiceNumber) {
      setInvoiceNumber(getNextInvoiceNumber().toString());
    }
  }, []);

  // Handle client selection
  useEffect(() => {
    if (selectedClientId === "new") {
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setVatNumber("");
      setShowClientForm(true);
    } else {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setClientName(client.name);
        setClientEmail(client.email);
        setClientPhone(client.phone);
        setVatNumber(client.vatNumber || "");
        setShowClientForm(false);
      }
    }
  }, [selectedClientId, clients]);

  // Calculate logged data for the period
  const loggedData = useMemo(() => {
    if (!invoiceStartDate || !invoiceEndDate || !logs || logs.length === 0) {
      return { stops: 0, amount: 0, days: 0, entries: [] };
    }

    try {
      const start = parseISO(invoiceStartDate);
      const end = parseISO(invoiceEndDate);

      const filteredEntries = logs.filter((log) => {
        const logDate = parseISO(log.date);
        return logDate >= start && logDate <= end;
      });

      const totalStops = filteredEntries.reduce((sum, log) => sum + (log.stops || 0), 0);
      const totalAmount = filteredEntries.reduce((sum, log) => sum + (log.total || 0), 0);

      return {
        stops: totalStops,
        amount: totalAmount,
        days: filteredEntries.length,
        entries: filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date)),
      };
    } catch (error) {
      console.error("Error calculating logged data:", error);
      return { stops: 0, amount: 0, days: 0, entries: [] };
    }
  }, [invoiceStartDate, invoiceEndDate, logs]);

  const handleGenerateInvoice = async () => {
    if (!invoiceNumber || !invoiceStartDate || !invoiceEndDate || !invoiceAmount) {
      alert("Please fill in all required fields");
      return;
    }

    if (!clientName) {
      alert("Please enter client details");
      return;
    }

    setIsGenerating(true);

    try {
      // Save client if new or saveAsTemplate is checked
      if (saveAsTemplate) {
        const clientData = {
          id: selectedClientId !== "new" ? selectedClientId : Date.now().toString(),
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          vatNumber: vatNumber
        };
        await saveClient(clientData);
      }

      // Generate PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let yPosition = margin;

      // Header - User Info
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(userDetails.name, margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const addressText = [
        userDetails.address,
        `${userDetails.city} ${userDetails.county} ${userDetails.postcode}`,
        userDetails.country,
      ];
      addressText.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      yPosition += 2;
      doc.text(userDetails.phone, margin, yPosition);
      yPosition += 4;
      doc.text(userDetails.email, margin, yPosition);

      // Invoice title and details on the right
      const rightColX = pageWidth - margin - 50;
      doc.setFontSize(24);
      doc.setFont(undefined, "bold");
      doc.text("Invoice", rightColX, margin + 8);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Invoice #: ${invoiceNumber}`, rightColX, margin + 18);
      doc.text(`Date: ${format(parseISO(invoiceStartDate), "d MMM yyyy")}`, rightColX, margin + 24);

      yPosition = margin + 35;

      // Bill To section
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text("BILL TO", margin, yPosition);
      yPosition += 7;

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(clientName, margin, yPosition);
      yPosition += 5;
      if (clientEmail) {
        doc.text(clientEmail, margin, yPosition);
        yPosition += 5;
      }
      if (clientPhone) {
        doc.text(clientPhone, margin, yPosition);
        yPosition += 5;
      }

      yPosition += 5;

      // Invoice table
      const tableData = [
        [
          "DELIVERIES AND COLLECTIONS",
          `${invoiceStartDate} to ${invoiceEndDate}`,
          "1",
          `£${parseFloat(invoiceAmount).toFixed(2)}`,
          `£${parseFloat(invoiceAmount).toFixed(2)}`,
        ],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Description", "Period", "Qty", "Rate", "Amount"]],
        body: tableData,
        margin: margin,
        styles: {
          fontSize: 10,
          cellPadding: 5,
          textColor: [255, 255, 255],
        },
        headStyles: {
          fillColor: [26, 31, 46],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: {
          fillColor: [245, 245, 247],
          textColor: [0, 0, 0],
        },
      });

      yPosition = doc.internal.pageSize.getHeight() - 80;

      // Summary section
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);

      const subtotal = parseFloat(invoiceAmount);
      const vat = vatNumber ? (subtotal * 0.2).toFixed(2) : 0;
      const total = (subtotal + parseFloat(vat)).toFixed(2);

      // Right-aligned summary
      const summaryX = pageWidth - margin - 50;
      doc.text("Subtotal", summaryX - 40, yPosition);
      doc.text(`£${subtotal.toFixed(2)}`, summaryX + 10, yPosition);
      yPosition += 6;

      if (vatNumber) {
        doc.text(`VAT #${vatNumber} (20%)`, summaryX - 40, yPosition);
        doc.text(`£${vat}`, summaryX + 10, yPosition);
        yPosition += 8;
      }

      doc.setFont(undefined, "bold");
      doc.text("Total", summaryX - 40, yPosition);
      doc.text(`£${total}`, summaryX + 10, yPosition);
      yPosition += 8;

      doc.setFont(undefined, "normal");
      if (paymentDate) {
        doc.text(`Paid on ${format(parseISO(paymentDate), "d MMM yyyy")}`, summaryX - 40, yPosition);
        doc.text(`£${total}`, summaryX + 10, yPosition);
        yPosition += 6;
      }

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text("Amount due", summaryX - 40, yPosition + 8);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(paymentDate ? `£0.00` : `£${total}`, summaryX + 10, yPosition + 8);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by Stop Tracker v3.0", margin, pageHeight - 8);

      // Generate filename
      const filename = `Invoice_#${invoiceNumber}_${format(parseISO(invoiceStartDate), "dd-MMM-yyyy")}.pdf`;

      // Save the PDF
      doc.save(filename);

      // Save invoice to history
      const invoiceData = {
        invoiceNumber,
        invoiceStartDate,
        invoiceEndDate,
        invoiceAmount,
        paymentDate,
        clientName,
        clientEmail,
        clientPhone,
        vatNumber,
        subtotal: subtotal.toFixed(2),
        vat,
        total,
        fileName: filename
      };

      await addInvoice(invoiceData);

      // Show success message
      setSuccessMessage(`Invoice #${invoiceNumber} generated successfully!`);
      setTimeout(() => {
        setSuccessMessage("");
        handleReset();
      }, 3000);
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Error generating invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setInvoiceNumber((getNextInvoiceNumber()).toString());
    setInvoiceStartDate("");
    setInvoiceEndDate("");
    setInvoiceAmount("");
    setPaymentDate("");
    setSelectedClientId("new");
  };

  const handleEmailInvoice = () => {
    if (!clientEmail) {
      alert("Please enter client email");
      return;
    }

    const subject = `Invoice #${invoiceNumber}`;
    const body = `Dear ${clientName},\n\nPlease find attached invoice #${invoiceNumber} for the period ${invoiceStartDate} to ${invoiceEndDate}.\n\nAmount: £${invoiceAmount}\n\nThank you for your business.\n\nBest regards,\n${userDetails.name}`;

    window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-500">{successMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Client</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClientId("new");
                    setShowClientForm(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Client
                </Button>
              </div>

              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ New Client</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Details Form */}
            <AnimatePresence>
              {(showClientForm || selectedClientId === "new") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-border pt-6"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Client Name *</Label>
                      <Input
                        id="client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Company or Individual Name"
                        className="bg-input border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="client-email">Client Email</Label>
                      <Input
                        id="client-email"
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="bg-input border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="client-phone">Client Phone</Label>
                      <Input
                        id="client-phone"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="+44 1234 567890"
                        className="bg-input border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vat-number">VAT Number (Optional)</Label>
                      <Input
                        id="vat-number"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="GB123456789"
                        className="bg-input border-border"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="save-template"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="save-template" className="text-sm text-muted-foreground cursor-pointer">
                      Save this client for future invoices
                    </Label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invoice Number and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-number">Invoice Number *</Label>
                <Input
                  id="invoice-number"
                  placeholder="e.g., 58"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={invoiceStartDate}
                  onChange={(e) => setInvoiceStartDate(e.target.value)}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={invoiceEndDate}
                  onChange={(e) => setInvoiceEndDate(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Invoice Amount and Payment Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-amount">Invoice Amount (£) *</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  placeholder="e.g., 3420.84"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="bg-input border-border"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date (Optional)</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Logged Data Summary */}
            {loggedData.stops > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-muted/30 rounded-lg p-4 border border-border/50"
              >
                <h3 className="font-semibold mb-3">Logged Data for Period</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Stops</p>
                    <p className="text-lg font-semibold">{loggedData.stops}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Days</p>
                    <p className="text-lg font-semibold">{loggedData.days}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tracked Amount</p>
                    <p className="text-lg font-semibold">£{loggedData.amount.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating || !invoiceNumber || !clientName}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate & Download PDF"}
                </Button>
              </motion.div>

              {clientEmail && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleEmailInvoice}
                    variant="outline"
                    className="w-full sm:w-auto gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email Invoice
                  </Button>
                </motion.div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-border hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default InvoiceGeneratorNew;
