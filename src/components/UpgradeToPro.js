import React from "react";
import { Button } from "./ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const UpgradeToPro = ({ onUpgrade }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl w-full text-center"
      >
        {/* Header Section */}
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-6">
          Upgrade to Pro
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Unlock premium features and take your experience to the next level
          with our Pro plan.
        </p>

        {/* Plans Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan Card */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Free Plan
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <XCircle className="text-red-500 w-5 h-5 mr-3" />
                Ads displayed
              </li>
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <XCircle className="text-red-500 w-5 h-5 mr-3" />
                Basic features only
              </li>
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <XCircle className="text-red-500 w-5 h-5 mr-3" />
                Standard support
              </li>
            </ul>
          </motion.div>

          {/* Pro Plan Card */}
          <motion.div
            whileHover={{
              scale: 1.03,
              boxShadow: "0 12px 24px rgba(0, 0, 0, 0.2)",
            }}
            className="bg-green-50 dark:bg-green-900 rounded-lg shadow-lg p-6 border-2 border-green-600"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Pro Plan
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                Ad-free experience
              </li>
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                Access to premium features
              </li>
              <li className="flex items-center text-gray-600 dark:text-gray-300">
                <CheckCircle className="text-green-500 w-5 h-5 mr-3" />
                Priority support
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Upgrade Button */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 text-lg rounded-lg shadow-lg transition-transform"
            onClick={onUpgrade}
          >
            Upgrade Now - £4.99/month
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UpgradeToPro;