import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Check, X, Star, Lock } from "lucide-react";

const PremiumModal = ({ isOpen, onClose, onUpgrade }) => {
  const features = [
    {
      name: "Delivery Tracking",
      free: true,
      premium: true,
    },
    {
      name: "Earnings Dashboard",
      free: true,
      premium: true,
    },
    {
      name: "Weekly Statistics",
      free: true,
      premium: true,
    },
    {
      name: "Invoice Comparison",
      free: true,
      premium: true,
    },
    {
      name: "PDF Invoice Generation",
      free: false,
      premium: true,
      highlight: true,
    },
    {
      name: "Invoice History & Storage",
      free: false,
      premium: true,
      highlight: true,
    },
    {
      name: "Email Invoice Sending",
      free: false,
      premium: true,
      highlight: true,
    },
    {
      name: "Multiple Payment Profiles",
      free: false,
      premium: true,
      highlight: true,
    },
    {
      name: "Export Data to CSV/Excel",
      free: false,
      premium: true,
      highlight: true,
    },
    {
      name: "Advanced Analytics",
      free: false,
      premium: true,
      highlight: true,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="bg-card border-border/50">
              <CardHeader className="relative bg-gradient-to-br from-primary/10 to-secondary/10 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Star className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Unlock Premium Features</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        One-time purchase • Forever access
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-8">
                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Free Plan */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-lg border-2 border-border/50 p-6"
                  >
                    <h3 className="text-xl font-bold mb-2">Free Plan</h3>
                    <p className="text-3xl font-bold text-primary mb-4">£0</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Essential delivery tracking features
                    </p>
                    <Button disabled className="w-full mb-6">
                      Current Plan
                    </Button>
                    <div className="space-y-3">
                      {features.map((feature, idx) =>
                        feature.free && !feature.highlight ? (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-accent" />
                            <span className="text-sm">{feature.name}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </motion.div>

                  {/* Premium Plan */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-lg border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 p-6 relative"
                  >
                    <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      RECOMMENDED
                    </div>
                    <h3 className="text-xl font-bold mb-2">Premium Plan</h3>
                    <p className="text-4xl font-bold text-primary mb-1">£4.99</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      One-time payment • Forever access
                    </p>
                    <Button
                      onClick={() => {
                        onUpgrade();
                        onClose();
                      }}
                      className="w-full mb-6 bg-primary hover:bg-primary/90"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Unlock Premium Now
                    </Button>
                    <div className="space-y-3">
                      {features.map((feature, idx) =>
                        feature.premium ? (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 ${
                              feature.highlight ? "font-semibold text-primary" : ""
                            }`}
                          >
                            <Check className="w-5 h-5 text-accent" />
                            <span className="text-sm">{feature.name}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Feature Comparison Table */}
                <div className="overflow-x-auto">
                  <h3 className="text-lg font-bold mb-4">Feature Comparison</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-semibold">Feature</th>
                        <th className="text-center py-3 px-4 font-semibold">Free</th>
                        <th className="text-center py-3 px-4 font-semibold">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-border/30 ${
                            feature.highlight ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="py-3 px-4">{feature.name}</td>
                          <td className="text-center py-3 px-4">
                            {feature.free ? (
                              <Check className="w-5 h-5 text-accent mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Check className="w-5 h-5 text-accent mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg p-6 border border-border/50">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    Why Go Premium?
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Professional invoices ready to send to clients</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Keep all your invoice history in one place</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Send invoices directly via email</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Manage multiple payment profiles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Export your data to CSV or Excel</span>
                    </li>
                  </ul>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-muted-foreground text-center">
                  One-time payment. No subscriptions. No hidden fees. Cancel anytime.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumModal;
