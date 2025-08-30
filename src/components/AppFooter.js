import React from "react";
import { useAuth } from "../contexts/AuthContext";

const AppFooter = () => {
  const { user } = useAuth();
  
  // Don't show marketing message for logged-in users
  if (user) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-gray-900 via-blue-900/10 to-gray-900 p-6 border-t border-gray-700/50">
      <div className="text-center">
        {/* Beautiful Creator Credit */}
        <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-white/10">
          <span className="text-gray-400 text-sm">made with</span>
          <div className="w-4 h-4 text-purple-400 animate-pulse">💜</div>
          <span className="text-gray-400 text-sm">by</span>
          <a
            href="https://www.linkedin.com/in/davidwboni/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text font-semibold hover:from-emerald-300 hover:via-cyan-300 hover:to-purple-300 transition-all duration-300 transform hover:scale-105"
          >
            david boni
          </a>
        </div>
        
        {/* Copyright */}
        <div className="mt-4 text-gray-500 text-sm">
          © 2024 Stop Tracker. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AppFooter;