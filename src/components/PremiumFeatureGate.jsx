import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Lock,
  Crown,
  Check,
  X,
  Zap,
  TrendingUp,
  FileText,
  Bell,
  Star
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const PremiumFeatureGate = ({ featureName, children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const isPro = user?.role === "pro";

  if (isPro) {
    return children;
  }

  return (
    <>
      <div className="relative">
        {/* Blurred preview of locked feature */}
        <div className="filter blur-sm pointer-events-none select-none">
          {children}
        </div>

        {/* Overlay with unlock button */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
              <p className="text-muted-foreground mb-4">
                Unlock {featureName} and more with Stop Tracker Pro
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowModal(true)}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button
                  onClick={() => navigate("/app/dashboard")}
                  variant="outline"
                  className="flex-1"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Premium Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card className="border-2 border-amber-500/50">
                <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Crown className="w-6 h-6" />
                      Stop Tracker Pro
                    </CardTitle>
                    <Button
                      onClick={() => setShowModal(false)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className="text-white/90 text-sm mt-2">
                    Supercharge your delivery tracking experience
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Pricing */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-6 text-center">
                    <div className="text-4xl font-bold mb-2">
                      <span className="text-5xl">£4.99</span>
                      <span className="text-xl text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cancel anytime • 7-day free trial
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Invoice Generation</h4>
                        <p className="text-sm text-muted-foreground">
                          Create professional PDF invoices
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Invoice History</h4>
                        <p className="text-sm text-muted-foreground">
                          Access all past invoices anytime
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Advanced Analytics</h4>
                        <p className="text-sm text-muted-foreground">
                          Detailed performance insights
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          Daily reminders and updates
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Client Management</h4>
                        <p className="text-sm text-muted-foreground">
                          Save and manage multiple clients
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Priority Support</h4>
                        <p className="text-sm text-muted-foreground">
                          Get help when you need it most
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => navigate("/app/upgrade")}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 text-lg"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Start Free Trial
                    </Button>
                    <Button
                      onClick={() => setShowModal(false)}
                      variant="ghost"
                      className="w-full"
                    >
                      Maybe Later
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    By upgrading, you agree to our Terms of Service
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PremiumFeatureGate;
