import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardHeader() {
  const { user } = useAuth();
  const userName = user?.name || user?.full_name || user?.username || (user?.email ? user.email.split("@")[0] : "User");

  return (
    <header className="bg-emerald-800 px-5 pb-8 pt-10 text-white rounded-b-[32px] shadow-md">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <p className="text-sm opacity-80">
            Welcome Back 👋
          </p>

          <h1 className="mt-1 font-serif text-3xl font-bold capitalize">
            {userName}
          </h1>

          <p className="mt-2 text-sm opacity-80">
            Healthcare made simpler.
          </p>
        </div>

        <button className="rounded-full bg-white/20 p-3 hover:bg-white/30 transition-colors">
          <Bell size={22} />
        </button>
      </div>
    </header>
  );
}