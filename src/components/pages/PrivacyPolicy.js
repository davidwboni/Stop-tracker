import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, ShieldCheck, Shield, Lock, Eye, Database } from 'lucide-react';

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        {onBack && (
          <Button 
            variant="ghost" 
            className="mb-8 flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200" 
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        )}
        
        <Card className="overflow-hidden shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 border-0">
          <CardHeader className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white py-12 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <div className="relative z-10 flex items-center mb-4">
              <div className="p-4 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-4xl font-bold mb-2">Privacy Policy</CardTitle>
                <p className="text-blue-100 text-lg font-medium">Your privacy and data protection matter to us</p>
              </div>
            </div>
            <p className="relative z-10 text-blue-200 text-sm bg-blue-800/30 px-4 py-2 rounded-xl inline-block">Last Updated: March 21, 2025</p>
          </CardHeader>
          <CardContent className="p-10 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <div className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-800">
                  <Shield className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Data Protection</h3>
                  <p className="text-blue-700 dark:text-blue-300">We use industry-standard encryption to protect your information</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border-2 border-green-100 dark:border-green-800">
                  <Lock className="w-10 h-10 text-green-600 dark:text-green-400 mb-4" />
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Secure Storage</h3>
                  <p className="text-green-700 dark:text-green-300">Your data is stored securely with Google Firebase</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border-2 border-purple-100 dark:border-purple-800">
                  <Eye className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">Transparency</h3>
                  <p className="text-purple-700 dark:text-purple-300">We're transparent about what data we collect and why</p>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <Database className="w-8 h-8 mr-3 text-blue-600" />
                Information We Collect
              </h2>
              
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 p-8 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 mb-8">
                <h3 className="text-2xl font-bold mb-4">Personal Information</h3>
                <p className="mb-6">When you create an account, we collect the following information to provide you with our services:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📧 Email Address</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">For account authentication and communication</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">👤 Display Name</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">To personalize your experience</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🖼️ Profile Picture</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Optional, for profile customization</p>
                  </div>
                </div>
              </div>
          
          <h3>Usage Data</h3>
          <p>
            We collect data about how you use the App, including:
          </p>
          <ul>
            <li>Delivery stop records you input</li>
            <li>Login times and frequency of use</li>
            <li>Features you interact with</li>
            <li>Device information (type, operating system, browser)</li>
          </ul>
          
          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve the App</li>
            <li>Personalize your experience</li>
            <li>Process and complete transactions</li>
            <li>Send administrative information, such as updates or security alerts</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze trends, usage, and activities</li>
            <li>Detect, prevent, and address technical issues</li>
          </ul>
          
          <h2>Data Storage and Security</h2>
          <p>
            Your data is stored securely on Google Firebase servers. We implement appropriate technical and
            organizational measures to protect your personal data against unauthorized or unlawful processing,
            accidental loss, destruction, or damage.
          </p>
          
          <h2>Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information to third parties. We may share your information in the following circumstances:
          </p>
          <ul>
            <li>With service providers who need access to such information to carry out work on our behalf</li>
            <li>In response to a request for information if we believe disclosure is in accordance with any applicable law, regulation, or legal process</li>
            <li>If we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of ourselves or others</li>
            <li>In connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company</li>
            <li>With your consent or at your direction</li>
          </ul>
          
          <h2>Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal data, including:
          </p>
          <ul>
            <li>Access to your personal data</li>
            <li>Correction of inaccurate or incomplete data</li>
            <li>Deletion of your personal data</li>
            <li>Restriction of processing of your personal data</li>
            <li>Data portability</li>
            <li>Objection to processing of your personal data</li>
          </ul>
          
          <h2>Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our App and to hold certain information.
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
          
          <h2>Children's Privacy</h2>
          <p>
            Our App is not intended for children under 16 years of age, and we do not knowingly collect personal information from children under 16.
          </p>
          
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-3xl border-2 border-blue-100 dark:border-blue-800 mt-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <ShieldCheck className="w-6 h-6 mr-3 text-blue-600" />
                  Contact Us
                </h2>
                <p className="mb-6">If you have any questions about this Privacy Policy, please don't hesitate to reach out:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📧 Email</h4>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">privacy@stoptracker.app</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🌐 Website</h4>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">www.stoptracker.app/contact</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;