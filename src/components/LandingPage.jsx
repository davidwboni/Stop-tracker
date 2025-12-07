import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import PremiumModal from "./PremiumModal";
import {
  ArrowRight,
  Calculator,
  FileText,
  TrendingUp,
  Truck,
  DollarSign,
  Zap,
  CheckCircle,
  Star,
  Sparkles,
  Download,
  Lock,
  Smartphone
} from "lucide-react";

const features = [
  {
    title: "Daily Stop Logging",
    description: "Quick and easy daily entry. Log your stops in seconds with our clean, intuitive interface.",
    icon: <FileText className="w-6 h-6" />,
    gradient: "from-blue-500 to-indigo-600",
    tag: "Essential"
  },
  {
    title: "Professional Invoices",
    description: "Generate PDF invoices instantly. Perfect for sending to clients. Create, download, and manage invoices seamlessly.",
    icon: <Download className="w-6 h-6" />,
    gradient: "from-purple-500 to-pink-600",
    tag: "v3.0 New",
    premium: true
  },
  {
    title: "Smart Analytics",
    description: "Track your weekly performance with easy-to-read breakdowns. See your earnings at a glance.",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-orange-500 to-red-600",
    tag: "Essential"
  },
  {
    title: "Earnings Tracker",
    description: "Automatically calculate your daily and weekly earnings. Know exactly what you're owed every time.",
    icon: <DollarSign className="w-6 h-6" />,
    gradient: "from-green-500 to-emerald-600",
    tag: "Essential"
  },
  {
    title: "Invoice Comparison",
    description: "Compare your logged stops with company invoices. Catch missing payments and discrepancies instantly.",
    icon: <Calculator className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-600",
    tag: "Essential"
  },
  {
    title: "Payment Settings",
    description: "Configure your tiered payment rates. Set your cutoff points and rates exactly as your company pays you.",
    icon: <Smartphone className="w-6 h-6" />,
    gradient: "from-rose-500 to-orange-600",
    tag: "v3.0 New"
  }
];

const testimonials = [
  {
    quote: "The invoice feature just saved me £300! I can now generate invoices in seconds instead of manually creating them.",
    author: "Michael T.",
    role: "Amazon DSP Driver",
    avatar: "MT"
  },
  {
    quote: "v3.0 is incredible. The dark mode looks professional, and the new settings page makes everything crystal clear.",
    author: "Sarah J.",
    role: "DPD Courier",
    avatar: "SJ"
  },
  {
    quote: "Finally an app that understands delivery drivers. v3.0 is exactly what I needed. Worth every penny for premium!",
    author: "Alex K.",
    role: "Evri Driver",
    avatar: "AK"
  }
];

const pricingFeatures = [
  "Daily stop logging",
  "Weekly statistics",
  "Invoice comparison",
  "Payment settings",
  "Invoice generation (PDF)",
  "Professional templates"
];

export default function LandingPage({ onGetStarted, onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Modal */}
      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        onUpgrade={() => {
          // Handle upgrade
          console.log("Upgrade clicked");
        }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 border-b border-border/50">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 mb-6 bg-primary/10 backdrop-blur-md rounded-full border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-primary text-sm font-medium">🚀 Stop Tracker v3.0 - Now with Invoice Generation!</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-foreground mb-6">
              Stop Tracker<span className="text-primary"> 3.0</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Track delivery stops, generate professional invoices, compare payments, and get paid correctly. Available now on web, Android & iOS.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold min-h-[56px] touch-manipulation"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                onClick={() => setPremiumModalOpen(true)}
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold min-h-[56px] touch-manipulation"
              >
                <Star className="w-5 h-5 mr-2" />
                Unlock Premium (£4.99)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const guestData = {
                    isGuest: true,
                    guestId: 'guest_' + Date.now(),
                    displayName: 'Demo User',
                    email: 'demo@stoptracker.com'
                  };
                  localStorage.setItem('guestSession', JSON.stringify(guestData));
                  onGetStarted();
                }}
                className="w-full sm:w-auto bg-muted hover:bg-muted/80 border-border px-8 py-6 text-lg rounded-xl transition-all duration-300 min-h-[56px] touch-manipulation"
              >
                Try Demo
                <Zap className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Simple Stats */}
            <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">50k+</div>
                <div className="text-sm">Stops Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">£250k+</div>
                <div className="text-sm">Earnings Calculated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">4.9★</div>
                <div className="text-sm">User Rating</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* What's New Section */}
      <div className="py-16 bg-card border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 mb-4 bg-primary/10 rounded-full">
              <Star className="w-4 h-4 text-primary mr-2" />
              <span className="text-primary font-semibold text-sm">What's New in v3.0</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Professional Invoice Generation Built In
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create beautiful PDF invoices in seconds. Perfect for sending to clients and companies.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="bg-background rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-6 h-6 text-primary" />
                <h3 className="font-bold text-lg">Generate PDFs</h3>
              </div>
              <p className="text-muted-foreground">Create professional invoices with your details, client info, and automatic calculations in one click.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-background rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
                <h3 className="font-bold text-lg">Sleek Dark Mode</h3>
              </div>
              <p className="text-muted-foreground">Beautiful Apple-inspired dark mode design. Professional, smooth, and easy on the eyes during long shifts.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-background rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-6 h-6 text-secondary" />
                <h3 className="font-bold text-lg">Native Apps</h3>
              </div>
              <p className="text-muted-foreground">Download on iOS & Android. Same powerful app, true native experience. Published to app stores.</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, powerful tools to track deliveries, generate invoices, and maximize your earnings.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="bg-card rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg relative"
              >
                {feature.tag && (
                  <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold ${
                    feature.premium
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {feature.tag}
                  </div>
                )}
                <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-xl mb-4`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-card border-y border-border/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 mb-4 bg-accent/10 rounded-full">
              <Star className="w-4 h-4 text-accent mr-2 fill-current" />
              <span className="text-accent font-semibold text-sm">Loved by Drivers</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Real Stories from Real Drivers
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of drivers who trust Stop Tracker v3.0
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-background rounded-xl p-6 border border-border/50"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-accent fill-current" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">{testimonial.author}</div>
                    <div className="text-muted-foreground text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free. Upgrade anytime to unlock invoice features.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl p-8 border-2 border-border/50"
            >
              <h3 className="text-2xl font-bold text-foreground mb-2">Free</h3>
              <p className="text-muted-foreground mb-6">Essential delivery tracking</p>
              <p className="text-4xl font-bold text-primary mb-6">£0</p>
              <Button disabled className="w-full mb-8">Current Plan</Button>
              <div className="space-y-3">
                {["Daily stop logging", "Weekly stats", "Invoice comparison", "Payment settings"].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border-2 border-primary/50 relative"
            >
              <div className="absolute -top-4 left-6 px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                RECOMMENDED
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Premium</h3>
              <p className="text-muted-foreground mb-6">Everything + invoice generation</p>
              <p className="text-4xl font-bold text-primary mb-2">£4.99</p>
              <p className="text-sm text-muted-foreground mb-6">One-time payment</p>
              <Button
                onClick={() => setPremiumModalOpen(true)}
                className="w-full mb-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Star className="w-4 h-4 mr-2" />
                Unlock Premium
              </Button>
              <div className="space-y-3">
                {pricingFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-br from-primary/20 to-secondary/20 border-y border-border/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            Ready to Get Paid Correctly?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of delivery drivers using Stop Tracker v3.0 to track stops, generate invoices, and ensure they're paid for every delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onGetStarted}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-bold min-h-[56px] touch-manipulation"
            >
              Start Tracking Now - Free!
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <Button
              onClick={() => setPremiumModalOpen(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-12 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-bold min-h-[56px] touch-manipulation"
            >
              Upgrade to Premium (£4.99)
            </Button>
          </div>
          <p className="text-muted-foreground text-sm mt-6">
            No credit card required • Set up in 2 minutes • Your data stays private • Available on Android & iOS
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl mr-3">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Stop Tracker v3.0</h3>
              </div>
              <p className="text-muted-foreground max-w-md">
                Professional delivery tracking and invoice generation for drivers. Built with ❤️ for the delivery community.
              </p>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <div className="space-y-3">
                <button
                  onClick={onPrivacyPolicy}
                  className="block text-muted-foreground hover:text-foreground transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={onTermsOfService}
                  className="block text-muted-foreground hover:text-foreground transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <div className="space-y-3">
                <button
                  onClick={onContactUs}
                  className="block text-muted-foreground hover:text-foreground transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border/50 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-muted-foreground text-sm">
                © 2025 Stop Tracker. All rights reserved.
              </div>
              <div className="flex items-center space-x-2 bg-background px-4 py-2 rounded-full border border-border/50">
                <span className="text-muted-foreground text-sm">made with</span>
                <div>💜</div>
                <span className="text-muted-foreground text-sm">by</span>
                <a
                  href="https://www.linkedin.com/in/davidwboni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors touch-manipulation"
                >
                  david boni
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
