import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
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
  Sparkles
} from "lucide-react";

const features = [
  {
    title: "Daily Stop Logging",
    description: "Quick and easy daily entry. Log your stops in seconds with our clean, simple interface.",
    icon: <FileText className="w-6 h-6" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Invoice Comparison",
    description: "Compare your logged stops with company invoices. Catch missing payments instantly.",
    icon: <Calculator className="w-6 h-6" />,
    gradient: "from-purple-500 to-pink-600",
  },
  {
    title: "Smart Analytics",
    description: "Track your weekly performance and earnings with beautiful, easy-to-read charts.",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-orange-500 to-red-600",
  },
  {
    title: "Earnings Tracker",
    description: "Automatically calculate your daily and weekly earnings. Know exactly what you're owed.",
    icon: <DollarSign className="w-6 h-6" />,
    gradient: "from-green-500 to-emerald-600",
  }
];

const testimonials = [
  {
    quote: "Found £200 missing from my monthly invoice. This app paid for itself immediately!",
    author: "Michael T.",
    role: "Amazon DSP Driver",
    avatar: "MT"
  },
  {
    quote: "Simple, fast, and exactly what I needed. Takes 30 seconds to log my stops each day.",
    author: "Sarah J.",
    role: "DPD Courier",
    avatar: "SJ"
  },
  {
    quote: "Finally an app that understands how drivers actually get paid. Highly recommended!",
    author: "Alex K.",
    role: "Evri Driver",
    avatar: "AK"
  }
];

export default function LandingPage({ onGetStarted, onContactUs, onPrivacyPolicy, onTermsOfService }) {
  // Updated landing page - clean & modern
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
        {/* Simple animated background */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 mb-6 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
              <Sparkles className="w-4 h-4 text-white mr-2" />
              <span className="text-white text-sm font-medium">Android-Optimized for Drivers</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6">
              Stop Tracker
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Track your delivery stops, compare invoices, and ensure you're paid correctly for every delivery.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold min-h-[56px] touch-manipulation"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
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
                className="w-full sm:w-auto bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg rounded-xl transition-all duration-300 min-h-[56px] touch-manipulation"
              >
                Try Demo
                <Zap className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Simple Stats */}
            <div className="flex flex-wrap justify-center gap-8 text-white/90">
              <div className="text-center">
                <div className="text-3xl font-bold">50k+</div>
                <div className="text-sm text-white/70">Stops Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">£250k+</div>
                <div className="text-sm text-white/70">Earnings Calculated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">4.9★</div>
                <div className="text-sm text-white/70">User Rating</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, powerful tools to track deliveries and maximize your earnings.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-xl mb-4`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 mb-4 bg-yellow-100 rounded-full">
              <Star className="w-4 h-4 text-yellow-600 mr-2 fill-current" />
              <span className="text-yellow-800 font-semibold text-sm">Loved by Drivers</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
              Real Stories
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of drivers who trust Stop Tracker
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
                className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{testimonial.author}</div>
                    <div className="text-gray-600 text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
            Ready to Get Paid Correctly?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of drivers who use Stop Tracker to ensure they're paid for every delivery.
          </p>
          <Button
            onClick={onGetStarted}
            className="bg-white text-indigo-600 hover:bg-gray-100 px-12 py-6 text-xl rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 font-bold min-h-[56px] touch-manipulation"
          >
            Start Tracking Now - Free!
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
          <p className="text-white/70 text-sm mt-6">
            No credit card required • Set up in 2 minutes • Your data stays private
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mr-3">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Stop Tracker</h3>
              </div>
              <p className="text-gray-400 max-w-md">
                The delivery tracking app built by drivers, for drivers.
              </p>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-3">
                <button
                  onClick={onPrivacyPolicy}
                  className="block text-gray-400 hover:text-white transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={onTermsOfService}
                  className="block text-gray-400 hover:text-white transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-3">
                <button
                  onClick={onContactUs}
                  className="block text-gray-400 hover:text-white transition-colors min-h-[44px] text-left touch-manipulation"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-gray-500 text-sm">
                © 2025 Stop Tracker. All rights reserved.
              </div>
              <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full">
                <span className="text-gray-400 text-sm">made with</span>
                <div className="text-purple-400">💜</div>
                <span className="text-gray-400 text-sm">by</span>
                <a
                  href="https://www.linkedin.com/in/davidwboni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors touch-manipulation"
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
