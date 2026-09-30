import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sprout, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Krishivani" },
      { name: "description", content: "Sign in to Krishivani — AI-based Panchayat-level weather downscaling and agro-meteorological advisory prototype for SIH 2026 (PS 26074)." },
      { property: "og:title", content: "Sign in — Krishivani" },
      { property: "og:description", content: "AI-based Panchayat-level weather downscaling and agro-meteorological advisory." },
    ],
  }),
  component: LoginPage,
});

const FLOW = ["Block Forecast", "AI Downscaling", "Panchayat Forecast", "Farmer Advisory"];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"government" | "farmer">("government");
  const home = (r: string | null) => (r === "farmer" ? "/farmer-dashboard" : "/government-dashboard");

  useEffect(() => {
    if (localStorage.getItem("agroscale_auth") === "1") {
      navigate({ to: home(localStorage.getItem("agroscale_role")), replace: true });
    }
  }, [navigate]);

  const doLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Prototype login — no real authentication. Demo credentials accepted.
    if (!email || !password) {
      setError("Enter email and password (demo: demo@sih26074.in / demo123)");
      return;
    }
    localStorage.setItem("agroscale_auth", "1");
    localStorage.setItem("agroscale_role", role);
    navigate({ to: home(role), replace: true });
  };

  const fillDemo = () => {
    setEmail("demo@sih26074.in");
    setPassword("demo123");
    setError("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: concept */}
      <div className="hidden flex-1 flex-col justify-center bg-sidebar px-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Sprout className="size-9 text-sidebar-primary" />
          <h1 className="text-3xl font-semibold">Krishivani</h1>
        </div>
        <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
          AI-based Panchayat-Level Weather Downscaling &amp; Agro-Meteorological Advisory
        </p>
        <div className="mt-10 space-y-0">
          {FLOW.map((step, i) => (
            <div key={step}>
              <div className="inline-flex items-center rounded-md border border-sidebar-border bg-sidebar-accent px-4 py-2.5 text-sm font-medium">
                {step}
              </div>
              {i < FLOW.length - 1 && (
                <div className="flex h-7 items-center pl-6 text-sidebar-foreground/50">
                  <ArrowDown className="size-4" />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-sidebar-foreground/50">
          Smart India Hackathon 2026 · Problem Statement ID 26074
        </p>
      </div>

      {/* Right: login card */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Sprout className="size-6 text-primary" />
            <span className="text-lg font-semibold">Krishivani</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Prototype login — no real authentication is performed.
          </p>
          <form onSubmit={doLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Login as</label>
              <div className="grid grid-cols-2 gap-2">
                {([["government", "Government / Officer"], ["farmer", "Farmer"]] as const).map(([r, label]) => (
                  <button type="button" key={r} onClick={() => setRole(r)}
                    className={`rounded-md border px-3 py-2 text-sm ${role === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Email / User ID</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@sih26074.in"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-primary"
                />
                Remember me
              </label>
              <button type="button" className="text-primary hover:underline">
                Forgot password
              </button>
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Login
            </button>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Use demo credentials
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
