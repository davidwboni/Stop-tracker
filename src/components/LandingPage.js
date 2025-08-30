import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "./ui/button";
import { 
  ChevronRight, 
  ArrowRight, 
  BarChart2, 
  FileText, 
  Calculator, 
  Mail, 
  Shield, 
  Truck,
  DollarSign,
  Clock,
  Star,
  Zap,
  Smartphone,
  TrendingUp,
  Award,
  Users,
  CheckCircle
} from "lucide-react";

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
    title: "💰 Earnings Tracker",
    description: "Automatically calculate your daily earnings with precision. Never wonder about your pay again!",
    icon: <DollarSign className="w-8 h-8" />,
    gradient: "from-green-500 to-emerald-600",
    stats: "Track £1000s",
  },
  {
    title: "📊 Smart Analytics", 
    description: "Beautiful charts and insights that help you optimize your delivery performance.",
    icon: <TrendingUp className="w-8 h-8" />,
    gradient: "from-blue-500 to-indigo-600",
    stats: "Real-time data",
  },
  {
    title: "📱 Mobile First",
    description: "Designed for drivers on the go. Quick entry, instant sync, works everywhere.",
    icon: <Smartphone className="w-8 h-8" />,
    gradient: "from-purple-500 to-pink-600", 
    stats: "Lightning fast",
  },
  {
    title: "🔄 Auto-Sync",
    description: "Your data syncs instantly across all devices. Log on mobile, check on desktop.",
    icon: <Zap className="w-8 h-8" />,
    gradient: "from-orange-500 to-red-600",
    stats: "Cloud powered",
  },
  {
    title: "📈 Weekly Reports",
    description: "Comprehensive weekly summaries with trends, projections, and performance insights.",
    icon: <BarChart2 className="w-8 h-8" />,
    gradient: "from-teal-500 to-cyan-600",
    stats: "Pro insights",
  },
  {
    title: "💎 Invoice Checker",
    description: "Compare your records with company invoices. Catch discrepancies and get paid correctly.",
    icon: <CheckCircle className="w-8 h-8" />,
    gradient: "from-violet-500 to-purple-600",
    stats: "Save money",
  }
];

const stats = [
  { value: "1000+", label: "Active Drivers", icon: <Users className="w-6 h-6" /> },
  { value: "50k+", label: "Deliveries Tracked", icon: <Truck className="w-6 h-6" /> },
  { value: "£250k+", label: "Earnings Calculated", icon: <DollarSign className="w-6 h-6" /> },
  { value: "4.9★", label: "User Rating", icon: <Star className="w-6 h-6" /> },
];

const testimonials = [
  {
    quote: "🚀 Game changer! Stop Tracker helped me discover I was being underpaid by £200/month. Got it fixed immediately!",
    author: "Michael T.",
    role: "Amazon DSP Driver • 5 years",
    avatar: "MT",
    rating: 5
  },
  {
    quote: "⚡ Literally takes 30 seconds to log my stops. The analytics are insane - I can see exactly how much I'm earning!",
    author: "Sarah J.", 
    role: "DPD Courier • 3 years",
    avatar: "SJ",
    rating: 5
  },
  {
    quote: "💎 Best investment I made for my delivery business. The weekly reports help me negotiate better routes!",
    author: "Alex K.",
    role: "UberEats • Hermes • 2 years", 
    avatar: "AK",
    rating: 5
  }
];

export default function LandingPage({ onGetStarted, onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Stunning Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          className="max-w-6xl mx-auto text-center z-10"
          style={{ y, opacity }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* Floating Badge */}
          <motion.div
            className="inline-flex items-center px-4 py-2 mb-8 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Truck className="w-4 h-4 text-emerald-400 mr-2" />
            <span className="text-white/90 text-sm font-medium">Trusted by 1000+ drivers worldwide</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight block">
              Stop Tracker
            </span>
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent text-3xl md:text-5xl lg:text-6xl block mt-2">
              Your Earnings, Perfected
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-xl md:text-2xl text-white/80 mx-auto max-w-4xl mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            The most advanced delivery tracking app that helps drivers 
            <span className="text-emerald-400 font-semibold"> maximize earnings</span>, 
            <span className="text-cyan-400 font-semibold"> track performance</span>, and 
            <span className="text-purple-400 font-semibold"> never miss a penny</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <Button 
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 active:scale-95 text-white px-8 py-4 text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold group min-h-[48px] touch-manipulation"
            >
              Start Tracking Now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // Create a guest session and navigate to the app
                const guestData = {
                  isGuest: true,
                  guestId: 'guest_' + Date.now(),
                  displayName: 'Demo User',
                  email: 'demo@stoptracker.com'
                };
                localStorage.setItem('guestSession', JSON.stringify(guestData));
                onGetStarted(); // This will navigate to the app
              }}
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 active:scale-95 px-8 py-4 text-lg rounded-2xl transition-all duration-300 group min-h-[48px] touch-manipulation"
            >
              Try Demo
              <Zap className="ml-2 w-5 h-5 group-hover:text-yellow-400 transition-colors" />
            </Button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 group-hover:border-white/40 transition-all duration-300">
                  <div className="text-emerald-400 mb-2 flex justify-center">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
      
      {/* Revolutionary Features Section */}
      <div className="py-32 bg-gradient-to-b from-white to-gray-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-4 py-2 mb-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                <Zap className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-purple-800 font-semibold text-sm">Game-Changing Features</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-pink-800 bg-clip-text text-transparent">
                  Everything You Need
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Built by drivers, for drivers. Every feature is designed to solve real problems and 
                <span className="text-purple-600 font-semibold"> maximize your earnings</span>.
              </p>
            </motion.div>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                className="group"
              >
                <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-purple-200 relative overflow-hidden">
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex p-4 bg-gradient-to-br ${feature.gradient} rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                    
                    {/* Stats Badge */}
                    <div className="absolute top-6 right-6">
                      <div className="px-3 py-1 bg-gray-100 rounded-full">
                        <span className="text-xs font-bold text-gray-600">{feature.stats}</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-800 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {feature.description}
                    </p>
                    
                    {/* Learn More Link */}
                    <div className={`inline-flex items-center text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                      <span>Learn more</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Testimonials Section */}
      <div className="py-32 bg-gradient-to-br from-slate-50 to-purple-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.1),transparent_50%)]"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-4 py-2 mb-6 bg-gradient-to-r from-emerald-100 to-cyan-100 rounded-full">
                <Star className="w-4 h-4 text-emerald-600 mr-2 fill-current" />
                <span className="text-emerald-800 font-semibold text-sm">Loved by drivers everywhere</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-gray-900 via-emerald-800 to-cyan-800 bg-clip-text text-transparent">
                  Real Stories, Real Results
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join thousands of drivers who've transformed their delivery business with Stop Tracker
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50 relative group">
                  {/* Rating Stars */}
                  <div className="flex mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <blockquote className="text-gray-700 text-lg leading-relaxed mb-8 font-medium">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{testimonial.author}</div>
                      <div className="text-gray-600 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Final CTA Section */}
      <div className="py-32 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white via-purple-100 to-cyan-100 bg-clip-text text-transparent">
                Ready to maximize your
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                delivery earnings?
              </span>
            </h2>
            
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
              Join thousands of drivers who use Stop Tracker to ensure they're paid correctly for every delivery.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={onGetStarted}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 active:scale-95 text-white px-12 py-4 text-xl rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-bold group min-h-[48px] touch-manipulation"
              >
                Get Started Now - It's Free!
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <p className="text-white/60 text-sm mt-8">
              ✨ No credit card required • 🚀 Set up in 2 minutes • 🔒 Your data stays private
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stunning Footer */}
      <footer className="bg-gradient-to-r from-slate-950 to-gray-950 border-t border-white/10 relative">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl mr-3">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Stop Tracker
                </h3>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                The most advanced delivery tracking app built by drivers, for drivers. Transform your earning potential today.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-6">Legal</h4>
              <div className="space-y-4">
                <button 
                  onClick={onPrivacyPolicy} 
                  className="block text-gray-400 hover:text-emerald-400 active:text-emerald-300 transition-colors duration-200 py-2 touch-manipulation"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={onTermsOfService} 
                  className="block text-gray-400 hover:text-emerald-400 active:text-emerald-300 transition-colors duration-200 py-2 touch-manipulation"
                >
                  Terms of Service
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Support</h4>
              <div className="space-y-4">
                <button 
                  onClick={onContactUs} 
                  className="block text-gray-400 hover:text-emerald-400 active:text-emerald-300 transition-colors duration-200 py-2 touch-manipulation"
                >
                  Contact Us
                </button>
                <div className="text-gray-400">Help Center</div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar with Your Credit */}
          <div className="border-t border-white/10 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-500 mb-4 md:mb-0">
                © 2024 Stop Tracker. All rights reserved.
              </div>
              
              {/* Your Beautiful Credit */}
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="text-gray-400">made with</span>
                <div className="w-5 h-5 text-purple-400 animate-pulse">💜</div>
                <span className="text-gray-400">by</span>
                <a
                  href="https://www.linkedin.com/in/davidwboni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text font-semibold hover:from-emerald-300 hover:via-cyan-300 hover:to-purple-300 transition-all duration-300 transform hover:scale-110 px-2 py-1 rounded"
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