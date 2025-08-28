import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Send, CheckCircle, AlertCircle, ArrowLeft, MessageCircle, Mail, Clock, User, MessageSquare, Sparkles } from 'lucide-react';

const ContactUs = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (!formData.message.trim()) {
      setError('Message is required');
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous status
    setError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    // Simulate sending the form data to a server
    try {
      // This would be replaced with an actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
          <CardHeader className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-700 text-white py-12 overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <div className="relative z-10 flex items-center mb-4">
              <div className="p-4 bg-white/20 rounded-2xl mr-4 backdrop-blur-sm">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-4xl font-bold mb-2">Contact Us</CardTitle>
                <p className="text-blue-100 text-lg font-medium">We'd love to hear from you. Get in touch!</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border-2 border-blue-100 dark:border-blue-800">
                <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Email Support</h3>
                <p className="text-blue-700 dark:text-blue-300">Fast and reliable email support</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border-2 border-green-100 dark:border-green-800">
                <Clock className="w-10 h-10 text-green-600 dark:text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Quick Response</h3>
                <p className="text-green-700 dark:text-green-300">Usually within 24 hours</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border-2 border-purple-100 dark:border-purple-800">
                <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-4" />
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">Friendly Team</h3>
                <p className="text-purple-700 dark:text-purple-300">Here to help you succeed</p>
              </div>
            </div>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl border-2 border-green-100 dark:border-green-800"
            >
              <div className="p-6 bg-green-500 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">Message Sent Successfully!</h2>
              <p className="text-green-700 dark:text-green-300 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                Thank you for reaching out! We've received your message and will respond within 24 hours.
              </p>
              <Button 
                onClick={() => setSuccess(false)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Send Another Message
              </Button>
            </motion.div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 p-8 rounded-3xl border border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white flex items-center justify-center">
                <User className="w-6 h-6 mr-3 text-blue-600" />
                Get in Touch
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Your Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    className="h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300 resize-none"
                    required
                  />
                </div>
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                      <span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
                    </div>
                  </motion.div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                      Sending Message...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="mr-3 h-6 w-6" />
                      Send Message
                    </span>
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-12 grid md:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-8 rounded-3xl border-2 border-blue-100 dark:border-blue-800 shadow-apple-button hover:shadow-apple-card transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-500 rounded-2xl mr-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-xl text-blue-900 dark:text-blue-100">Email Us Directly</h3>
          </div>
          <p className="text-blue-700 dark:text-blue-300 mb-6 leading-relaxed">
            For faster support and detailed inquiries, you can reach out to us directly via email.
          </p>
          <a 
            href="mailto:support@stoptracker.app" 
            className="inline-flex items-center bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl text-blue-600 dark:text-blue-400 font-semibold shadow-apple-button hover:shadow-apple-card transition-all duration-300 transform hover:scale-105"
          >
            <Mail className="w-4 h-4 mr-2" />
            support@stoptracker.app
          </a>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-8 rounded-3xl border-2 border-green-100 dark:border-green-800 shadow-apple-button hover:shadow-apple-card transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-500 rounded-2xl mr-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-xl text-green-900 dark:text-green-100">Response Times</h3>
          </div>
          <p className="text-green-700 dark:text-green-300 mb-6 leading-relaxed">
            We pride ourselves on quick response times and excellent customer support.
          </p>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-2xl shadow-apple-button">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Typical Response:</span>
              <span className="font-bold text-green-600 dark:text-green-400">&lt; 24 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700 dark:text-gray-300">Business Hours:</span>
              <span className="font-bold text-green-600 dark:text-green-400">9AM - 5PM BST</span>
            </div>
          </div>
        </motion.div>
      </div>
      </motion.div>
    </div>
  );
};

export default ContactUs;