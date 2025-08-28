import React from "react";
import { useAuth } from "../contexts/AuthContext";

const AppFooter = () => {
  const { user } = useAuth();
  
  // Don't show marketing message for logged-in users
  if (user) {
    return null;
  }
  
  return (
    <div className="bg-gray-900 p-4 border-t border-gray-800">
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-300 text-center font-medium mb-2">
          Ready to maximize your delivery earnings?
        </p>
        <p className="text-gray-400 text-center text-sm mb-3">
          Join thousands of drivers who use Stop Tracker to ensure they're paid correctly for every delivery.
        </p>
        <div className="flex justify-center">
          <a href="/terms.html" className="text-blue-400 text-sm">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default AppFooter;