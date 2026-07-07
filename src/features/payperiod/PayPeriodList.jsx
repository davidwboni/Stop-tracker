// src/features/payperiod/PayPeriodList.jsx
import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, ArrowLeft, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usePayPeriods } from "./PayPeriodContext";
import PayPeriodForm from "./PayPeriodForm";
import PayPeriodResults from "./PayPeriodResults";

const PayPeriodList = ({ onGenerateInvoice }) => {
  const { payPeriods, loading } = usePayPeriods();
  const [view, setView] = useState("list"); // 'list' | 'form' | 'results'
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const handleSaved = (period) => {
    setSelectedPeriod(period);
    setView("results");
  };

  const handleSelectPeriod = (period) => {
    setSelectedPeriod(period);
    setView("results");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading pay periods...</p>;
  }

  if (view === "form") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <PayPeriodForm onSaved={handleSaved} onCancel={() => setView("list")} />
      </div>
    );
  }

  if (view === "results" && selectedPeriod) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Pay Periods
        </Button>
        <PayPeriodResults period={selectedPeriod} onGenerateInvoice={onGenerateInvoice} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setView("form")} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        New Pay Period
      </Button>

      {payPeriods.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No pay periods yet. Add one to compare your logged stops against your boss's statement.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payPeriods.map((period) => (
            <Card
              key={period.id}
              className="border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectPeriod(period)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {format(parseISO(period.fromDate), "dd MMM")} - {format(parseISO(period.toDate), "dd MMM yyyy")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayPeriodList;
