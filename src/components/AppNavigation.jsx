import React from "react";
import { Home, FileText, ShieldCheck, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { path: "/app/dashboard", icon: Home, label: "Home" },
  { path: "/app/entries", icon: FileText, label: "Entries" },
  { path: "/app/check-pay", icon: ShieldCheck, label: "Check Pay" },
  { path: "/app/stats", icon: BarChart3, label: "Insights" },
];

const AppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#20283a] bg-[#090d15]/95 backdrop-blur-xl safe-area-inset-bottom">
      <div className="mx-auto flex max-w-2xl items-center px-3 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname.startsWith(path) || (path === "/app/dashboard" && location.pathname === "/app");
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition active:scale-95 ${active ? "text-[#7567ff]" : "text-[#7f8ba3]"}`}>
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
              {active && <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#7567ff]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
export default AppNavigation;
