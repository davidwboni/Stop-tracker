import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Route, ScanLine, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const PremiumFeatureGate = ({ featureName = "this feature", children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const isPro = user?.role === "pro";

  if (isPro) return children;

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none opacity-35 blur-[1px]">
          {children}
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px] p-4">
          <Card className="w-full max-w-sm border-primary/20">
            <CardContent className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Crown className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Stop Tracker Pro</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {featureName} is available with Verso Pro.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(true)}
                className="mt-4 w-full"
              >
                See Pro options
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-[18px] border border-border bg-card p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Stop Tracker Pro</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pro keeps paid API usage protected behind server-side entitlements while the core tracking experience stays free.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-[14px] border border-border p-3">
                  <Route className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">Road-aware route optimisation</div>
                    <div className="text-xs text-muted-foreground">
                      Uses protected server-side routing so paid API quota is not exposed in the app.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[14px] border border-border p-3">
                  <ScanLine className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">AI statement scanning</div>
                    <div className="text-xs text-muted-foreground">
                      Use AI-assisted image reading for supported rate sheets and premium automation.
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Manual work tracking and manual Check Pay remain free.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Not now
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    navigate("/app/upgrade");
                  }}
                >
                  Upgrade to Pro
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PremiumFeatureGate;
