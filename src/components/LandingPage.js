import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ChevronRight, ArrowRight, BarChart2, FileText, Calculator } from "lucide-react";


// Mock screenshots for the app features
const mockScreenshots = {
  dashboard: "/screenshots/dashboard.png", // Replace with actual paths when available
  stopTracker: "/screenshots/stop-tracker.png",
  invoice: "/screenshots/invoice.png"
};

const features = [
  {
    title: "Track Your Deliveries",
    description: "Log your stops daily and see your performance metrics in real-time.",
    icon: <BarChart2 className="w-6 h-6" />,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
  },
  {
    title: "Invoice Verification",
    description: "Compare your records with company invoices to ensure you're paid correctly.",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
  },
  {
    title: "Earnings Calculator",
    description: "Track your earnings based on your personal payment agreement.",
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

export default function LandingPage({ onGetStarted }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block mb-1">Track every stop.</span>
                  <span className="block text-indigo-600 dark:text-indigo-400">Maximize your earnings.</span>
                </h1>
                <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300">
                  Stop Tracker helps delivery drivers monitor their deliveries, verify invoices, and ensure they're paid correctly for every stop.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={onGetStarted}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-8 text-lg rounded-xl shadow-md"
                  >
                    Get Started
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
                
                {/* Trust Indicators */}
                <div className="mt-12">
                  <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 gap-x-6">
                    {[
                      { stat: "2,500+", label: "Active Drivers" },
                      { stat: "£250K+", label: "Missing Pay Recovered" },
                      { stat: "4.8/5", label: "App Rating" }
                    ].map((item, i) => (
                      <div key={i} className="text-center">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{item.stat}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="mt-16 lg:mt-0 lg:col-span-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                {/* App Preview Mockup */}
                <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <img 
                    src={mockScreenshots[activeTab] || "https://via.placeholder.com/600x400?text=App+Screenshot"}
                    alt="Stop Tracker App Preview" 
                    className="w-full h-auto"
                  />
                  
                  {/* Feature selector tabs */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex space-x-2">
                      {["dashboard", "stopTracker", "invoice"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`w-3 h-3 rounded-full ${
                            activeTab === tab 
                              ? "bg-white" 
                              : "bg-gray-400/50 hover:bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to track your deliveries
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Stop Tracker is designed specifically for delivery drivers to optimize earnings
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="bg-gray-50 dark:bg-gray-900 p-8 rounded-2xl shadow-sm"
              >
                <div className={`p-3 rounded-full inline-block ${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              How Stop Tracker Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-x-8 gap-y-12">
            {[
              {
                step: "1",
                title: "Log Your Deliveries",
                description: "Input your daily stops and any additional pay at the end of each shift."
              },
              {
                step: "2",
                title: "Monitor Your Earnings",
                description: "View weekly summaries and track your earnings progress throughout the month."
              },
              {
                step: "3",
                title: "Verify Invoices",
                description: "Compare your tracked deliveries with company invoices to check for discrepancies."
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 -top-4 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div className="pt-8 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Testimonials Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              Trusted by Delivery Drivers
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.2 + 0.5 }}
                className="bg-gray-50 dark:bg-gray-900 p-8 rounded-2xl shadow-sm"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {testimonial.author.split(' ')[0][0]}
                      {testimonial.author.split(' ')[1][0]}
                    </div>
                  </div>
                  <div>
                    <p className="text-lg text-gray-600 dark:text-gray-300 italic mb-4">
                      "{testimonial.quote}"
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16 bg-indigo-600 dark:bg-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl mb-6">
            Ready to maximize your delivery earnings?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto">
            Join thousands of drivers who use Stop Tracker to ensure they're paid correctly for every delivery.
          </p>
          <Button 
            onClick={onGetStarted}
            className="bg-white text-indigo-600 hover:bg-indigo-50 py-4 px-8 text-lg rounded-xl shadow-lg"
          >
            Create Your Account
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-white">Stop Tracker</h3>
              <p className="text-gray-400">Track deliveries. Verify invoices. Get paid.</p>
            </div>
            <div className="flex space-x-6">
              <button className="text-gray-400 hover:text-white">Privacy Policy</button>
              <button className="text-gray-400 hover:text-white">Terms of Service</button>
              <button className="text-gray-400 hover:text-white">Contact</button>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} Stop Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}