import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Landmark,
  Wheat,
  CloudSun,
  Map as MapIcon,
  GitBranch,
  Sprout,
  Gauge,
  Database,
  Info,
  Bell,
  Menu,
  X,
  LogOut,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCATIONS } from "@/lib/demo-data";

/* Farmer / Expert view toggle */
type ViewMode = "expert" | "farmer";
const ViewModeContext = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({
  mode: "expert",
  setMode: () => {},
});
export const useViewMode = () => useContext(ViewModeContext);

const NAV = [
  { to: "/government-dashboard", label: "Government Dashboard", icon: Landmark },
  { to: "/farmer-dashboard", label: "Farmer Dashboard", icon: Wheat },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/forecast", label: "Panchayat Forecast", icon: CloudSun },
  { to: "/map", label: "Weather Map", icon: MapIcon },
  { to: "/downscaling", label: "Downscaling Analysis", icon: GitBranch },
  { to: "/advisory", label: "Agro Advisory", icon: Sprout },
  { to: "/performance", label: "Model Performance", icon: Gauge },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/about", label: "About Project", icon: Info },
] as const;

export function isLoggedIn() {
  return typeof window !== "undefined" && localStorage.getItem("agroscale_auth") === "1";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("expert");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login", replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) return null;

  const handleLogout = () => {
    localStorage.removeItem("agroscale_auth");
    localStorage.removeItem("agroscale_role");
    navigate({ to: "/login", replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <Sprout className="size-6 text-sidebar-primary" />
        <div>
          <p className="text-sm font-semibold">Krishivani</p>
          <p className="text-[10px] text-sidebar-foreground/60">SIH 2026 · PS 26074</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === to
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-2.5">
            <button
              className="rounded-md p-1.5 hover:bg-muted lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              {drawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Krishivani</span>
              <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                SIH 2026
              </span>
              <span className="hidden rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                PS 26074
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <MapPin className="size-3.5" />
                {LOCATIONS.block}, {LOCATIONS.district}, {LOCATIONS.state}
              </span>
              {/* Farmer / Expert toggle */}
              <div className="flex rounded-md border border-border text-xs">
                {(["expert", "farmer"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "px-2.5 py-1 capitalize",
                      mode === m
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {m} view
                  </button>
                ))}
              </div>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Notifications">
                <Bell className="size-4" />
              </button>
              <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="size-4" />
              </span>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>

          <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
            Krishivani — Smart India Hackathon 2026 · Problem Statement 26074 · Frontend prototype
            with demo data
          </footer>
        </div>
      </div>
    </ViewModeContext.Provider>
  );
}
