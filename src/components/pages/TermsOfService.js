import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Shield, FileText, Scale, User, Lock, CreditCard, Gavel } from 'lucide-react';

const TermsOfService = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        <Button 
          variant="ghost" 
          className="mb-8 flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm hover:shadow-md" 
          onClick={onBack || (() => window.location.href = '/app/dashboard')}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Stop Tracker
        </Button>
        
        <Card className="overflow-hidden shadow-apple-card hover:shadow-apple-card-hover transition-all duration-500 border-0">
          <CardHeader className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 text-white py-12 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <div className="relative z-10 flex items-center mb-4">
              <div className="p-4 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-4xl font-bold mb-2">Terms of Service</CardTitle>
                <p className="text-indigo-100 text-lg font-medium">Legal terms and conditions for using Stop Tracker</p>
              </div>
            </div>
            <p className="relative z-10 text-indigo-200 text-sm bg-indigo-800/30 px-4 py-2 rounded-xl inline-block">Last Updated: March 22, 2025</p>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 lg:p-10 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <div className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-800">
                  <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4" />
                  <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-2">Agreement</h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">Legal binding terms</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-800">
                  <User className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">User Rights</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Your responsibilities</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border-2 border-purple-100 dark:border-purple-800">
                  <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-4" />
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">Privacy</h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Data protection</p>
                </div>
                <div className="bg-pink-50 dark:bg-pink-900/20 p-6 rounded-3xl border-2 border-pink-100 dark:border-pink-800">
                  <Gavel className="w-10 h-10 text-pink-600 dark:text-pink-400 mb-4" />
                  <h3 className="text-lg font-bold text-pink-900 dark:text-pink-100 mb-2">Legal</h3>
                  <p className="text-sm text-pink-700 dark:text-pink-300">Governing law</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-800 dark:to-indigo-900/10 p-8 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 mb-8">
                <h2 className="text-3xl font-bold mb-4 flex items-center">
                  <Scale className="w-8 h-8 mr-3 text-indigo-600" />
                  Welcome to Stop Tracker
                </h2>
                <p className="text-lg leading-relaxed">By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully as they contain important information about your legal rights, remedies, and obligations.</p>
              </div>
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-indigo-600" />
            1. Acceptance of Terms
          </h2>
          <p>By accessing or using the Stop Tracker application ("App"), website, or any services provided by Stop Tracker (collectively, the "Services"), you agree to be bound by these Terms. If you do not agree to all of these Terms, you may not use the Services.</p>
          
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <CreditCard className="w-8 h-8 mr-3 text-blue-600" />
            2. Description of Service
          </h2>
          <p>Stop Tracker is an application designed to help delivery drivers track their stops, monitor earnings, and ensure accurate payment. The App provides tools for recording deliveries, calculating earnings, and maintaining delivery history.</p>
          
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <User className="w-8 h-8 mr-3 text-purple-600" />
            3. User Accounts
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-apple-button mb-6">
            <h3 className="text-xl font-semibold mb-3">3.1 Registration</h3>
            <p>To use certain features of the Services, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-apple-button mb-6">
            <h3 className="text-xl font-semibold mb-3">3.2 Account Security</h3>
            <p>You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify Stop Tracker immediately of any unauthorized use of your account.</p>
          </div>
          
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <Lock className="w-8 h-8 mr-3 text-pink-600" />
            4. User Data and Privacy
          </h2>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-apple-button">
              <h3 className="text-xl font-semibold mb-3">4.1 Data Collection</h3>
              <p>We collect and process data as described in our Privacy Policy. By using our Services, you consent to such processing and you warrant that all data provided by you is accurate.</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-apple-button">
              <h3 className="text-xl font-semibold mb-3">4.2 Data Ownership</h3>
              <p>You retain all rights to your delivery data. We do not claim ownership of the information you upload, but you grant us a license to use this data to provide and improve the Services.</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-green-600" />
            5. User Conduct
          </h2>
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border-2 border-red-100 dark:border-red-800 mb-6">
            <p className="font-semibold mb-4">You agree not to:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span>Use the Services for any illegal purpose</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span>Upload or transmit viruses or malicious code</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span>Attempt to gain unauthorized access</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span>Impersonate any person or entity</span>
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <CreditCard className="w-8 h-8 mr-3 text-emerald-600" />
            6. Payment and Billing
          </h2>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800">
              <h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-100">6.1 Fees</h3>
              <p className="text-emerald-700 dark:text-emerald-300">Use of the basic Services is free. Premium features may require payment of fees as described within the App.</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800">
              <h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-100">6.2 Subscription Terms</h3>
              <p className="text-emerald-700 dark:text-emerald-300">Payment will be charged to your selected payment method at confirmation of purchase and at the beginning of each subscription period.</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800">
              <h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-100">6.3 Cancellation</h3>
              <p className="text-emerald-700 dark:text-emerald-300">You may cancel your subscription at any time through your account settings. Cancellations take effect at the end of the current billing period.</p>
            </div>
          </div>
          
          <h2>7. Intellectual Property</h2>
          <h3>7.1 Our Intellectual Property</h3>
          <p>The Services and all materials therein, including, without limitation, software, images, text, graphics, illustrations, logos, patents, trademarks, service marks, copyrights, photographs, audio, videos, and music (the "Stop Tracker Content"), and all intellectual property rights related thereto, are the exclusive property of Stop Tracker and its licensors.</p>
          
          <h3>7.2 License to Use</h3>
          <p>Subject to these Terms, Stop Tracker grants you a limited, non-exclusive, non-transferable, non-sublicensable license to use the Services for your personal, non-commercial purposes.</p>
          
          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, in no event shall Stop Tracker be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Services.</p>
          
          <h2>9. Disclaimer of Warranties</h2>
          <p>The Services are provided "as is" and "as available" without warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
          
          <h2>10. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. If we make material changes to these Terms, we will notify you by email or by posting a notice on our website prior to the changes becoming effective.</p>
          
          <h2>11. Termination</h2>
          <p>We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.</p>
          
          <h2>12. Governing Law</h2>
          <p>These Terms shall be governed by the laws of the United Kingdom, without respect to its conflict of laws principles.</p>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 rounded-3xl border-2 border-indigo-100 dark:border-indigo-800 mt-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-3 text-indigo-600" />
              Contact Us
            </h2>
            <p className="mb-6">If you have any questions about these Terms, please don't hesitate to reach out:</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📧 Email</h4>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium">support@stoptracker.app</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-apple-button">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🏢 Address</h4>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium">London, United Kingdom</p>
              </div>
            </div>
          </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </div>
    </div>
  );
};

export default TermsOfService;