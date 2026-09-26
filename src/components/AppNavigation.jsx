import React from "react";
import "../styles/app-navigation.css";
import { Home, FileText, ShieldCheck, BarChart3, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { path: "/app/dashboard", icon: Home, label: "Home" },
  { path: "/app/routes", icon: MapPin, label: "Routes" },
  { path: "/app/documents", icon: FileText, label: "Documents" },
  { path: "/app/check-pay", icon: ShieldCheck, label: "Check Pay" },
  { path: "/app/money", icon: BarChart3, label: "Money" },
];

const AppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <nav aria-label="Main navigation" className="st-app-navigation fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-2xl items-center px-3 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = (path === "/app/documents" && location.pathname.startsWith("/app/invoice")) || (path === "/app/money" && ["/app/stats", "/app/periods"].includes(location.pathname)) || location.pathname.startsWith(path) || (path === "/app/dashboard" && location.pathname === "/app");
          return (
            <button key={path} data-tour={`nav-${label.toLowerCase().replace(/\s+/g,"-")}`} aria-label={label} aria-current={active ? "page" : undefined} onClick={() => { if (location.pathname.startsWith(path)) { scrollTop(); } else { navigate(path); requestAnimationFrame(() => scrollTop()); } }}
              className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] sm:text-[11px] font-medium transition duration-200 active:scale-95 ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && <span className="absolute bottom-0 h-1 w-5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
export default AppNavigation;
