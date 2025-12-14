import React, { useState, useEffect } from "react";
import { Home, FileText, Calculator, User, TrendingUp, Settings, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const AppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  };

  // Auto-hide navigation on scroll (disabled for better UX)
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      // Keep navbar always visible for easier access
      setIsVisible(true);

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  const navItems = [
    { path: '/app/dashboard', icon: Home, label: 'Home', color: 'from-primary to-secondary' },
    { path: '/app/entries', icon: FileText, label: 'Entries', color: 'from-orange-500 to-red-600' },
    { path: '/app/routes', icon: MapPin, label: 'Routes', color: 'from-indigo-500 to-blue-600' },
    { path: '/app/invoice', icon: Calculator, label: 'Invoice', color: 'from-rose-500 to-pink-600' },
    { path: '/app/stats', icon: TrendingUp, label: 'Stats', color: 'from-secondary to-purple-600' },
    { path: '/app/profile', icon: User, label: 'Profile', color: 'from-emerald-500 to-teal-600' },
  ];
  
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-apple-card z-50 safe-area-inset-bottom transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-900/50"></div>
      
      <div className="relative flex justify-around items-center py-2 px-4">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.path.replace('/app', '')) || 
                          (item.path === '/app/dashboard' && currentPath === '/app');
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                // Add haptic feedback
                if (navigator.vibrate) {
                  navigator.vibrate(10);
                }

                if (item.path === '/app/dashboard') {
                  // Always scroll to top for home button
                  scrollToTop();
                  // Only navigate if not already on dashboard
                  if (!currentPath.includes('dashboard') && currentPath !== '/app') {
                    navigate(item.path);
                  }
                } else {
                  navigate(item.path);
                }
              }}
              className={`relative flex flex-col items-center p-2.5 rounded-2xl transition-all duration-200 transform active:scale-95 min-w-0 flex-1 touch-manipulation min-h-[64px] ${
                isActive 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {isActive && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.color} shadow-lg`}></div>
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <IconComponent size={22} className={isActive ? 'text-white' : ''} />
                <span className={`text-xs mt-1 font-medium truncate max-w-full ${
                  isActive ? 'text-white' : ''
                }`}>
                  {item.label}
                </span>
              </div>
              
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppNavigation;