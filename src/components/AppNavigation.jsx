import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, FileText, Calculator, User, TrendingUp, MapPin } from "lucide-react";
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
    { path: '/app/dashboard', icon: Home, label: 'Home' },
    { path: '/app/entries', icon: FileText, label: 'Entries' },
    { path: '/app/routes', icon: MapPin, label: 'Routes' },
    { path: '/app/invoice', icon: Calculator, label: 'Invoice' },
    { path: '/app/stats', icon: TrendingUp, label: 'Stats' },
    { path: '/app/profile', icon: User, label: 'Profile' },
  ];
  
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border/80 shadow-[0_-10px_30px_rgba(8,31,43,0.06)] z-50 safe-area-inset-bottom transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
      
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
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-1 rounded-[16px] bg-primary/10 border border-primary/20"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <IconComponent size={22} className={isActive ? 'text-primary' : ''} />
                <span className={`text-xs mt-1 font-medium truncate max-w-full ${
                  isActive ? 'text-primary' : ''
                }`}>
                  {item.label}
                </span>
              </div>
              

            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppNavigation;