import {
  House,
  Bot,
  BarChart2,
  Upload,
  History,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    name: "Home",
    icon: House,
    path: "/home",
  },
  {
    name: "AI Bot",
    icon: Bot,
    path: "/assistant",
  },
  {
    name: "Metrics",
    icon: BarChart2,
    path: "/dashboard",
  },
  {
    name: "Upload",
    icon: Upload,
    path: "/upload",
  },
  {
    name: "History",
    icon: History,
    path: "/history",
  },
  {
    name: "Profile",
    icon: User,
    path: "/profile",
  },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[94%] max-w-lg -translate-x-1/2">
      <div className="flex justify-around items-center rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md px-1.5 py-2 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center rounded-xl py-1.5 px-1 transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-md font-bold"
                    : "text-slate-400 hover:bg-slate-800 hover:text-emerald-400 font-medium"
                }`
              }
            >
              <Icon size={18} />
              <span className="mt-1 text-[10px] leading-none">
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}