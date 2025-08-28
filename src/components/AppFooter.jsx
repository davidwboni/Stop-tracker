import React from "react";
import { motion } from "framer-motion";
import { Heart, Code, Sparkles } from "lucide-react";

const AppFooter = () => {
  return (
    <motion.footer 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-16 py-8 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/10 border-t border-gray-200/50 dark:border-gray-700/50"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Main credit */}
          <div className="flex items-center space-x-2 text-center">
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl shadow-apple-button border border-gray-200/50 dark:border-gray-700/50">
              <Code className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">Made with</span>
              <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">by</span>
              <span className="font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                David Boni
              </span>
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
          
          {/* Additional details */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stop Tracker • Delivery Management App • © 2024
            </p>
          </div>
          
          {/* Decorative line */}
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-50"></div>
        </div>
      </div>
    </motion.footer>
  );
};

export default AppFooter;