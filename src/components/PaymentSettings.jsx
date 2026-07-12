import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useData } from "../contexts/DataContext";
import {
  PAY_MODELS,
  calculateDayEarnings,
  normalizePayStructure,
} from "../features/payperiod/payStructure";
import PayStructureAISetup from "./PayStructureAISetup";
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Save,
  Info,
  Sparkles,
  Pencil,
} from "lucide-react";

// Sensible starting params when the user switches into a model.
const SEED = {
  tiered_stops: { thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }], excessParcelRate: 0.05 },
  flat_stops: { ratePerStop: 0, excessParcelRate: 0.05 },
  per_mile: { ratePerMile: 0, baseFee: 0 },
  hourly: { ratePerHour: 0 },
  per_day: { ratePerDay: 0 },
};

// Representative daily quantity used to render the live worked example.
const SAMPLE = {
  tiered_stops: { quantity: 100, unit: "stops" },
  flat_stops: { quantity: 100, unit: "stops" },
  per_mile: { quantity: 80, unit: "miles" },
  hourly: { quantity: 8, unit: "hours" },
  per_day: { quantity: 1, unit: "day" },
  sliding_scale: { quantity: 100, miles: 80, unit: "stops" },
};

const num = (v) => (v === "" || v === undefined || v === null ? 0 : parseFloat(v) || 0);

const PaymentSettings = ({ userId, user, onSettingsSaved }) => {
  const { paymentConfig } = useData();
  const [config, setConfig] = useState(() => normalizePayStructure(paymentConfig));
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mode, setMode] = useState("ai"); // 'ai' | 'manual'

  const model = config.model;
  const isSliding = model === "sliding_scale";

  const selectModel = (id) => {
    if (id === config.model) return;
    setConfig({ model: id, ...SEED[id] });
    setSuccess(null);
    setError(null);
  };

  const setParam = (key, value) =>
    setConfig((c) => ({ ...c, [key]: num(value) }));

  const setTier = (idx, key, value) =>
    setConfig((c) => {
      const thresholds = (c.thresholds || [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }]).map((t) => ({ ...t }));
      thresholds[idx] = { ...thresholds[idx], [key]: num(value) };
      return { ...c, thresholds };
    });

  const sample = SAMPLE[model] || SAMPLE.tiered_stops;
  const workedExample = calculateDayEarnings(config, {
    quantity: sample.quantity,
    miles: sample.miles,
  });

  const saveConfig = async (cfg) => {
    setUpdating(true);
    setError(null);
    try {
      if (user?.isGuest) {
        setSuccess("Settings saved locally");
        if (onSettingsSaved) onSettingsSaved(cfg);
        return;
      }
      await updateDoc(doc(db, "users", userId), {
        paymentConfig: cfg,
        updatedAt: new Date().toISOString(),
      });
      setSuccess("Payment settings saved");
      if (onSettingsSaved) onSettingsSaved(cfg);
    } catch (err) {
      console.error("Error updating payment config:", err);
      setError("Couldn't save settings. Try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSave = () => saveConfig(config);

  // AI confirmed a config: adopt it, show it in the manual editor, and save.
  const handleAIConfirm = (cfg) => {
    const normalized = normalizePayStructure(cfg);
    setConfig(normalized);
    setMode("manual");
    saveConfig(normalized);
  };

  const field = (id, label, value, onChange, hint) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-semibold">{label}</Label>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-primary">£</span>
        <Input
          id={id}
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-input border-border focus:ring-2 focus:ring-primary max-w-xs"
        />
      </div>
    </div>
  );

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Pay Structure</h1>
        </div>
        <p className="text-muted-foreground">Set how you get paid — earnings update as you type.</p>
      </div>

      {/* Setup mode toggle */}
      <div className="inline-flex rounded-full border border-border p-1 bg-card">
        <button
          onClick={() => setMode("ai")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${mode === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Sparkles className="w-4 h-4 mr-1.5 inline-block align-[-2px]" />
          Describe with AI
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Pencil className="w-4 h-4 mr-1.5 inline-block align-[-2px]" />
          Enter manually
        </button>
      </div>

      {mode === "ai" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6 space-y-4">
              <PayStructureAISetup onConfirm={handleAIConfirm} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className={mode === "manual" ? "space-y-6" : "hidden"}>
      <Alert className="bg-primary/10 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-primary">
          Pick the model that matches your job, then fill in your rates.
        </AlertDescription>
      </Alert>

      {/* Model picker */}
      <div className="flex flex-wrap gap-2">
        {PAY_MODELS.filter((m) => m.id !== "sliding_scale").map((m) => {
          const on = m.id === model;
          return (
            <button
              key={m.id}
              onClick={() => selectModel(m.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors touch-manipulation ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              Your rates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSliding ? (
              <div className="p-4 rounded-[14px] bg-muted/30 border border-border/50">
                <p className="font-semibold mb-1">Sliding scale from your uploaded sheet</p>
                <p className="text-sm text-muted-foreground">
                  {(config.stopBands?.length || 0)} stop bands × {(config.mileBands?.length || 0)} mileage bands.
                  To change a sliding scale, re-upload your sheet in AI setup.
                </p>
              </div>
            ) : model === "tiered_stops" ? (
              <>
                {field("cutoff", "Cutoff (stops)", config.thresholds?.[0]?.stopCount ?? 110, (v) => setTier(0, "stopCount", v), "Where your per-stop rate changes")}
                {field("rateBefore", "Rate before cutoff", config.thresholds?.[0]?.rate ?? 0, (v) => setTier(0, "rate", v))}
                {field("rateAfter", "Rate after cutoff", config.thresholds?.[1]?.rate ?? 0, (v) => setTier(1, "rate", v))}
                {field("excessTiered", "Excess parcel rate", config.excessParcelRate ?? 0, (v) => setParam("excessParcelRate", v), "Per parcel beyond one per stop")}
              </>
            ) : model === "flat_stops" ? (
              <>
                {field("ratePerStop", "Rate per stop", config.ratePerStop ?? 0, (v) => setParam("ratePerStop", v))}
                {field("excessFlat", "Excess parcel rate", config.excessParcelRate ?? 0, (v) => setParam("excessParcelRate", v), "Per parcel beyond one per stop")}
              </>
            ) : model === "per_mile" ? (
              <>
                {field("ratePerMile", "Rate per mile", config.ratePerMile ?? 0, (v) => setParam("ratePerMile", v))}
                {field("baseFee", "Daily base fee", config.baseFee ?? 0, (v) => setParam("baseFee", v), "A fixed amount added each day (optional)")}
              </>
            ) : model === "hourly" ? (
              <>{field("ratePerHour", "Rate per hour", config.ratePerHour ?? 0, (v) => setParam("ratePerHour", v))}</>
            ) : (
              <>{field("ratePerDay", "Rate per day", config.ratePerDay ?? 0, (v) => setParam("ratePerDay", v), "A fixed amount for each day worked")}</>
            )}

            {/* Worked example */}
            <div className="mt-4 p-4 rounded-[14px] bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">QUICK CHECK</p>
              <p data-testid="worked-example" className="text-sm tabular-nums">
                {sample.quantity} {sample.unit}
                {sample.miles ? ` @ ${sample.miles} miles` : ""} = £{workedExample.toFixed(2)}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-emerald-500/10 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-emerald-500">{success}</AlertDescription>
              </Alert>
            )}

            {!isSliding && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={updating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>

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
