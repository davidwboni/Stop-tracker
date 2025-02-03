import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./select";
import { Settings, Save } from "lucide-react";

const slidingScaleRates = {
  "5": [5.0, 5.0, 5.0, 5.0, 5.0],
  "10": [5.0, 5.0, 5.0, 5.0, 5.0],
  "25": [4.5, 4.58, 4.65, 4.72, 4.97],
  "50": [2.69, 2.73, 2.76, 2.8, 2.92],
  "75": [2.09, 2.11, 2.13, 2.16, 2.24],
  "100": [1.89, 1.91, 1.93, 1.94, 2.03],
  "125": [1.79, 1.81, 1.82, 1.84, 1.91],
};

const PaymentConfig = ({ currentConfig, onSave }) => {
  // Initialize config state with provided defaults.
  const [config, setConfig] = useState(currentConfig);
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper to update config state fields
  const handleChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save handler validates based on payment type.
  const handleSave = useCallback(() => {
    if (config.paymentType === "fixed") {
      if (!config.ratePerStop) {
        alert("Please enter a rate per stop.");
        return;
      }
    } else if (config.paymentType === "sliding") {
      if (!config.mileage) {
        alert("Please select a mileage value.");
        return;
      }
    }

    onSave(config);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }, [config, onSave]);

  return (
    <Card className="bg-[var(--background)] dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text)] dark:text-white">
          <Settings className="w-5 h-5" /> Payment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Type Selector */}
        <label className="block text-sm font-medium dark:text-gray-300">
          Payment Type
        </label>
        <Select
          value={config.paymentType}
          onValueChange={(value) => handleChange("paymentType", value)}
        >
          <SelectTrigger className="w-full" />
          <SelectContent>
            <SelectItem value="fixed">Fixed Rate</SelectItem>
            <SelectItem value="sliding">Sliding Scale</SelectItem>
          </SelectContent>
        </Select>

        {/* Fixed Rate Configuration */}
        {config.paymentType === "fixed" && (
          <>
            <label className="block text-sm font-medium dark:text-gray-300">
              Rate Per Stop (£)
            </label>
            <Input
              type="number"
              step="0.01"
              value={config.ratePerStop || ""}
              onChange={(e) =>
                handleChange("ratePerStop", parseFloat(e.target.value) || "")
              }
              className="dark:bg-gray-700 dark:text-white"
              placeholder="Enter fixed rate"
            />
          </>
        )}

        {/* Sliding Scale Configuration */}
        {config.paymentType === "sliding" && (
          <>
            <label className="block text-sm font-medium dark:text-gray-300">
              Mileage
            </label>
            <Select
              value={config.mileage}
              onValueChange={(value) => handleChange("mileage", value)}
            >
              <SelectTrigger className="w-full" />
              <SelectContent>
                {Object.keys(slidingScaleRates).map((mileageKey) => (
                  <SelectItem key={mileageKey} value={mileageKey}>
                    {mileageKey} miles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-[var(--primary)] hover:bg-[var(--secondary)] text-white"
        >
          <Save className="w-4 h-4 mr-2" /> Save Settings
        </Button>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-500 text-white p-2 rounded-md text-center">
            Settings saved successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentConfig;