import React from "react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { BarChart, Truck, Clock, Settings, Shield } from "lucide-react";

const features = [
  {
    icon: <Truck size={24} />, 
    title: "Track Deliveries",
    description: "Monitor daily stops with real-time updates.",
  },
  {
    icon: <BarChart size={24} />, 
    title: "Analytics Dashboard",
    description: "Visualize your performance metrics effortlessly.",
  },
  {
    icon: <Clock size={24} />, 
    title: "Time Management",
    description: "Optimize your delivery schedule with precision.",
  },
  {
    icon: <Settings size={24} />, 
    title: "Custom Settings",
    description: "Personalize rates and preferences easily.",
  },
];

export default function LandingPage({ onLoginClick, onSignupClick }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-white dark:from-gray-900 dark:to-[var(--background)]">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-24 pb-16 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] mb-6">
            Maximize Your Delivery Earnings
          </h1>
          <p className="text-xl text-[var(--text)] dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Track stops, calculate earnings, and optimize your delivery
            performance with our comprehensive toolkit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onLoginClick}
                className="w-full sm:w-auto text-lg px-8 py-6 bg-[var(--primary)] hover:bg-[var(--secondary)] text-white font-semibold rounded-lg transition-all"
              >
                Get Started
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onSignupClick}
                variant="outline"
                className="w-full sm:w-auto text-lg px-8 py-6 border-2 border-[var(--primary)] text-[var(--primary)] dark:text-[var(--secondary)] rounded-lg transition-all"
              >
                Try Demo
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Features Section */}
        <div className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text)] dark:text-[var(--text)]">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white dark:bg-[var(--background)] p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
              >
                <div className="w-12 h-12 bg-[var(--accent)] dark:bg-[var(--secondary)] rounded-lg flex items-center justify-center mb-4">
                  <div className="text-[var(--primary)] dark:text-[var(--text)]">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">
                  {feature.title}
                </h3>
                <p className="text-[var(--text)] dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonial Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="py-16 text-center"
        >
          <div className="max-w-3xl mx-auto bg-[var(--primary)] text-white rounded-xl p-8 shadow-lg">
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-75" />
            <p className="text-xl md:text-2xl mb-6">
              "Stop Tracker has revolutionized how I manage my delivery routes.
              I've increased my efficiency and earnings significantly."
            </p>
            <p className="font-semibold">- David, Professional Driver</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}