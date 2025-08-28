import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ChevronRight, ArrowRight, BarChart2, FileText, Calculator, Mail, Shield } from "lucide-react";

// App screenshots with fallback mechanism
const appScreenshots = {
  dashboard: process.env.PUBLIC_URL + "/img/screenshots/screenshot1.jpg",
  weeklyView: process.env.PUBLIC_URL + "/img/screenshots/screenshot3.jpg",
  invoice: process.env.PUBLIC_URL + "/img/screenshots/screenshot2.jpg",
  recentEntries: process.env.PUBLIC_URL + "/img/screenshots/screenshot4.jpg",
  stats: process.env.PUBLIC_URL + "/img/screenshots/screenshot5.jpg"
};

// Improved fallback image - more visually appealing
const fallbackImage = process.env.PUBLIC_URL + "/app-screenshot.svg";

const features = [
  {
    title: "Delivery Tracking",
    description: "Record your daily stops and view your history over time.",
    icon: <BarChart2 className="w-6 h-6" />,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
  },
  {
    title: "Data Management",
    description: "Organize your delivery information in one place for easy reference.",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
  },
  {
    title: "Statistics",
    description: "View charts and data visualizations of your delivery patterns.",
    icon: <Calculator className="w-6 h-6" />,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
  }
];

const testimonials = [
  {
    quote: "Stop Tracker has saved me hundreds of pounds by catching invoice discrepancies. Now I never have to worry about being underpaid.",
    author: "Michael T., Delivery Driver",
    role: "5 years experience"
  },
  {
    quote: "The app is incredibly simple to use. I log my stops at the end of each day, and now I know exactly what to expect on payday.",
    author: "Sarah J., Courier",
    role: "3 years experience"
  }
];

export default function LandingPage({ onGetStarted, onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Auto-rotate through screenshots
  useEffect(() => {
    const tabs = ["dashboard", "weeklyView", "invoice", "recentEntries", "stats"];
    const interval = setInterval(() => {
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex]);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [activeTab]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/20">
      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-indigo-500/10"></div>
        <div className="absolute -top-4 -right-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-6 -left-6 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* App Icon */}
            <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl mb-8 transform hover:scale-110 transition-transform duration-300">
              <BarChart2 className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Stop Tracker
              </span>
            </h1>
            
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full border border-blue-200/50 dark:border-blue-700/50 mb-8">
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                🚚 The Ultimate Delivery Tracking App
              </p>
            </div>
            
            <p className="text-xl md:text-2xl leading-relaxed text-gray-700 dark:text-gray-300 mx-auto max-w-3xl mb-12 font-medium">
              An easy way to track your deliveries and manage your work
            </p>
            <div className="mt-8">
              <Button 
                onClick={onGetStarted}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 text-lg rounded-lg shadow-sm"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Features Section - Simplified */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Key Features
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 transform group-hover:-translate-y-2 group-hover:scale-105 border border-gray-200/50 dark:border-gray-700/50 text-center">
                  <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* How It Works Section - Simplified */}
      <div className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Basic Usage
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Enter Data",
                description: "Record your delivery information in the app."
              },
              {
                title: "View Reports",
                description: "Check your statistics and history in the dashboard."
              },
              {
                title: "Export Information",
                description: "Save or share your delivery records when needed."
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Removed testimonials section */}
      
      {/* Simple Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-white">Stop Tracker</h3>
            </div>
            <div className="flex space-x-6">
              <button 
                onClick={onPrivacyPolicy} 
                className="text-gray-400 hover:text-white text-sm"
              >
                Privacy Policy
              </button>
              <button 
                onClick={onTermsOfService} 
                className="text-gray-400 hover:text-white text-sm"
              >
                Terms of Service
              </button>
              <button 
                onClick={onContactUs} 
                className="text-gray-400 hover:text-white text-sm"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}