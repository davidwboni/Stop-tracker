import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Save,
  Info
} from "lucide-react";

const PaymentSettings = ({ userId, user, onSettingsSaved }) => {
  const [paymentConfig, setPaymentConfig] = useState({
    cutoffPoint: 110,
    rateBeforeCutoff: 1.98,
    rateAfterCutoff: 1.48,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load payment config
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        if (user?.isGuest) {
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const config = userDoc.data().paymentConfig || {};
          setPaymentConfig({
            cutoffPoint: config.cutoffPoint || 110,
            rateBeforeCutoff: config.rateBeforeCutoff || 1.98,
            rateAfterCutoff: config.rateAfterCutoff || 1.48,
          });
        }
      } catch (err) {
        console.error("Error fetching payment config:", err);
        setError("Failed to load payment settings");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentConfig();
  }, [userId, user]);

  // Clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentConfig(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    setUpdating(true);
    setError(null);

    try {
      if (user?.isGuest) {
        setSuccess("Settings saved locally");
        if (onSettingsSaved) onSettingsSaved(paymentConfig);
        setUpdating(false);
        return;
      }

      await updateDoc(doc(db, "users", userId), {
        paymentConfig: paymentConfig,
        updatedAt: new Date().toISOString()
      });

      setSuccess("Payment settings saved successfully!");
      if (onSettingsSaved) onSettingsSaved(paymentConfig);
    } catch (err) {
      console.error("Error updating payment config:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Payment Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure how you get paid for deliveries
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-primary/10 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          These settings affect how your earnings are calculated based on the number of stops.
        </AlertDescription>
      </Alert>

      {/* Payment Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              Earnings Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cutoff Point */}
            <div className="space-y-2">
              <Label htmlFor="cutoff" className="text-base font-semibold">
                Daily Cutoff Point
              </Label>
              <p className="text-sm text-muted-foreground">
                The number of stops where your rate changes
              </p>
              <div className="flex items-center gap-3">
                <Input
                  id="cutoff"
                  name="cutoffPoint"
                  type="number"
                  value={paymentConfig.cutoffPoint}
                  onChange={handleChange}
                  className="bg-input border-border focus:ring-2 focus:ring-primary max-w-xs"
                  min="1"
                  step="1"
                />
                <span className="text-sm text-muted-foreground">stops</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Example: If set to 110, you get one rate for 0-110 stops, another rate for 110+ stops
              </p>
            </div>

            {/* Rate Before Cutoff */}
            <div className="space-y-2">
              <Label htmlFor="rateBefore" className="text-base font-semibold">
                Rate (Before {paymentConfig.cutoffPoint} stops)
              </Label>
              <p className="text-sm text-muted-foreground">
                Payment per stop for deliveries below cutoff point
              </p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-primary">£</span>
                <Input
                  id="rateBefore"
                  name="rateBeforeCutoff"
                  type="number"
                  value={paymentConfig.rateBeforeCutoff}
                  onChange={handleChange}
                  className="bg-input border-border focus:ring-2 focus:ring-primary max-w-xs"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-muted-foreground">per stop</span>
              </div>
            </div>

            {/* Rate After Cutoff */}
            <div className="space-y-2">
              <Label htmlFor="rateAfter" className="text-base font-semibold">
                Rate (After {paymentConfig.cutoffPoint} stops)
              </Label>
              <p className="text-sm text-muted-foreground">
                Payment per stop for deliveries at or above cutoff point
              </p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-primary">£</span>
                <Input
                  id="rateAfter"
                  name="rateAfterCutoff"
                  type="number"
                  value={paymentConfig.rateAfterCutoff}
                  onChange={handleChange}
                  className="bg-input border-border focus:ring-2 focus:ring-primary max-w-xs"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-muted-foreground">per stop</span>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border/50">
              <h3 className="font-semibold mb-3">Example Calculation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    100 stops × £{paymentConfig.rateBeforeCutoff}:
                  </span>
                  <span className="font-semibold text-primary">
                    £{(100 * paymentConfig.rateBeforeCutoff).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    120 stops ({paymentConfig.cutoffPoint} at £{paymentConfig.rateBeforeCutoff} + {120 - paymentConfig.cutoffPoint} at £{paymentConfig.rateAfterCutoff}):
                  </span>
                  <span className="font-semibold text-primary">
                    £{(paymentConfig.cutoffPoint * paymentConfig.rateBeforeCutoff + (120 - paymentConfig.cutoffPoint) * paymentConfig.rateAfterCutoff).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-emerald-500">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleSave}
                  disabled={updating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? "Saving..." : "Save Settings"}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guest Notice */}
      {user?.isGuest && (
        <Alert className="bg-amber-500/10 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-500">
            These settings are stored locally only. Create an account to save them permanently.
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
};

export default PaymentSettings;
