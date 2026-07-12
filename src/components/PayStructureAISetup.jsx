import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Sparkles, Paperclip, Loader, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { interpretPayStructure } from "../services/interpretPayStructure";
import { calculateDayEarnings, PAY_MODELS } from "../features/payperiod/payStructure";

// Describe-or-upload panel. Sends the description / rate sheet to the Cloud
// Function, then shows a worked-example confirmation computed by OUR calculator
// before the parent saves the returned config.
const PayStructureAISetup = ({ onConfirm }) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { config, summary, sample }
  const fileRef = useRef(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interpretPayStructure({ text, file });
      setResult(data);
    } catch (err) {
      console.error("interpretPayStructure failed:", err);
      setError(err?.message || "Couldn't interpret that. Try rewording or a clearer photo.");
    } finally {
      setLoading(false);
    }
  };

  const reword = () => {
    setResult(null);
    setError(null);
  };

  // Confirmation view — worked example computed locally, never from the AI.
  if (result) {
    const cfg = result.config;
    const meta = PAY_MODELS.find((m) => m.id === cfg.model);
    const sample = result.sample || { quantity: 100 };
    const earned = calculateDayEarnings(cfg, { quantity: sample.quantity, miles: sample.miles });
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Here's what I understood</h3>
        </div>
        <p className="text-sm text-muted-foreground">{meta ? meta.label : cfg.model}</p>
        {result.summary && <p className="text-base leading-relaxed">{result.summary}</p>}

        <div className="p-4 rounded-[14px] bg-primary/5 border border-primary/20">
          <p className="text-xs font-semibold text-primary mb-1">QUICK CHECK</p>
          <p className="text-sm tabular-nums text-primary">
            {sample.quantity} {meta?.primary?.unit || "units"}
            {sample.miles ? ` @ ${sample.miles} miles` : ""} = £{earned.toFixed(2)}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Does that match what you'd earn? If not, reword it and try again.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => onConfirm(cfg)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Looks right
          </Button>
          <Button onClick={reword} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Not quite
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Describe how you get paid</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        In your own words, any language. e.g. "£1.70 per stop until 150, then 90p", or attach your rate sheet.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Tell me how you're paid…"
        className="w-full rounded-[14px] border border-border bg-input p-3 text-base focus:ring-2 focus:ring-primary focus:outline-none resize-none"
      />

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip className="w-4 h-4 mr-2" />
          {file ? "Change file" : "Attach PDF / photo"}
        </Button>
        {file && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{file.name}</span>}
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        For a rate table, a PDF or screenshot reads most accurately. A clear photo works too.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={run}
        disabled={loading || (!text.trim() && !file)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Reading…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Set up with AI
          </>
        )}
      </Button>
    </div>
  );
};

export default PayStructureAISetup;
