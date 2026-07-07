// src/features/payperiod/PayPeriodForm.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Plus, Trash2, Calculator } from "lucide-react";
import { usePayPeriods } from "./PayPeriodContext";

const emptyRow = () => ({ date: "", stops: "", totalParcels: "" });

const PayPeriodForm = ({ onSaved, onCancel }) => {
  const { addPayPeriod } = usePayPeriods();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [dailyRows, setDailyRows] = useState([emptyRow()]);
  const [dpdCharge, setDpdCharge] = useState("");
  const [adminFee, setAdminFee] = useState("");
  const [vatRate, setVatRate] = useState("0.20");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateRow = (index, field, value) => {
    const newRows = [...dailyRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setDailyRows(newRows);
  };

  const addRow = () => setDailyRows([...dailyRows, emptyRow()]);

  const removeRow = (index) => setDailyRows(dailyRows.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError("");

    if (!fromDate || !toDate || !payDate) {
      setError("Please fill in the period dates");
      return;
    }

    const validRows = dailyRows.filter((row) => row.date && row.stops !== "");
    if (validRows.length === 0) {
      setError("Add at least one daily entry");
      return;
    }

    setIsSaving(true);

    try {
      const dailyEntries = validRows.map((row) => ({
        date: row.date,
        stops: parseInt(row.stops, 10) || 0,
        totalParcels: parseInt(row.totalParcels, 10) || 0,
      }));

      const period = await addPayPeriod({
        fromDate,
        toDate,
        payDate,
        dailyEntries,
        dpdCharge: parseFloat(dpdCharge) || 0,
        adminFee: parseFloat(adminFee) || 0,
        vatRate: parseFloat(vatRate) || 0.2,
      });

      onSaved(period);
    } catch (err) {
      console.error("Error saving pay period:", err);
      setError("Error saving pay period. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          New Pay Period
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pp-from">From Date</Label>
            <Input id="pp-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-to">To Date</Label>
            <Input id="pp-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-pay">Pay Date</Label>
            <Input id="pp-pay" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Daily Entries (from your boss's statement)</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Day
            </Button>
          </div>

          {dailyRows.map((row, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={row.date} onChange={(e) => updateRow(index, "date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stops</Label>
                <Input type="number" value={row.stops} onChange={(e) => updateRow(index, "stops", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Parcels</Label>
                <Input
                  type="number"
                  value={row.totalParcels}
                  onChange={(e) => updateRow(index, "totalParcels", e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => removeRow(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pp-charge">DPD Charge (£)</Label>
            <Input id="pp-charge" type="number" step="0.01" value={dpdCharge} onChange={(e) => setDpdCharge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-admin">Admin Fee (£)</Label>
            <Input id="pp-admin" type="number" step="0.01" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-vat">VAT Rate</Label>
            <Input id="pp-vat" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? "Calculating..." : "Calculate & Save"}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayPeriodForm;
