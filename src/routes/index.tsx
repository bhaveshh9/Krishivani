import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, CloudRain, Gauge, AlertTriangle, ArrowRight } from "lucide-react";
import { AppLayout, useViewMode } from "@/components/AppLayout";
import { StatCard, Card, PageHeader, DemoTag, StatusBadge } from "@/components/ui-bits";
import { MapPanel } from "@/components/MapPanel";
import { fetchMetrics, type ModelPerf } from "@/lib/api";
import {
  ALERTS,
  BLOCK_FORECAST,
  DASHBOARD_KPIS,
  PANCHAYATS,
  STATUS_META,
  type Panchayat,
  type RainStatus,
} from "@/lib/demo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Krishivani — Panchayat Weather Intelligence" },
      { name: "description", content: "AI-based downscaling of Block-level weather forecasts to Panchayat-level agro-meteorological advisories. SIH 2026 prototype (PS 26074)." },
      { property: "og:title", content: "Krishivani — Panchayat Weather Intelligence" },
      { property: "og:description", content: "From Block-level forecast to Panchayat-level weather intelligence. SIH 2026 prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [selected, setSelected] = useState<Panchayat>(PANCHAYATS[0]!);
  const { mode } = useViewMode();
  const [perf, setPerf] = useState<ModelPerf | null>(null);
  useEffect(() => { fetchMetrics().then(setPerf).catch(() => setPerf(null)); }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Panchayat Weather Intelligence"
        subtitle="Converting coarse Block-level forecasts into localized Panchayat-level insights."
        demo
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Panchayats Monitored" value={DASHBOARD_KPIS.panchayatsMonitored} icon={<MapPin className="size-4" />} hint="Demo value" />
        <StatCard label="Active Weather Alerts" value={String(DASHBOARD_KPIS.activeAlerts).padStart(2, "0")} icon={<AlertTriangle className="size-4" />} hint="Demo value" />
        <StatCard label="Avg Rainfall Forecast" value={DASHBOARD_KPIS.avgRainfallMm} unit="mm" icon={<CloudRain className="size-4" />} hint="Demo value" />
        <StatCard label="Model MAE" value={perf?.live ? String(perf.proposed.mae) : "—"} unit="mm" icon={<Gauge className="size-4" />} hint={perf?.live ? "Measured on synthetic demo data" : "Start backend to measure"} />
      </div>

      {/* Concept strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs font-medium text-foreground">
        <span className="rounded-sm bg-secondary px-2 py-1">Block Forecast ({BLOCK_FORECAST.rainfallMm} mm)</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="rounded-sm bg-primary px-2 py-1 text-primary-foreground">AI Downscaling</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="rounded-sm bg-secondary px-2 py-1">Panchayat Forecast</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="rounded-sm bg-secondary px-2 py-1">Agro Advisory</span>
        <span className="ml-auto"><DemoTag /></span>
      </div>

      {/* Map + detail panel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Panchayat Weather Map — Baramati Block (Demo)" className="lg:col-span-2">
          <div className="h-[420px]">
            <MapPanel onSelect={setSelected} selectedId={selected.id} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {(Object.keys(STATUS_META) as RainStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_META[s].colorVar }} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title={`${selected.name} Panchayat`} action={<StatusBadge status={selected.status} />}>
            {mode === "farmer" ? (
              <div className="space-y-2.5 text-sm">
                <p>🌧 Rain: <strong>{selected.rainProbabilityPct >= 70 ? "High" : selected.rainProbabilityPct >= 40 ? "Moderate" : "Low"}</strong></p>
                <p>🌡 Temperature: <strong>{selected.temperatureC}°C</strong></p>
                <p>⚠ Weather Risk: <strong>{STATUS_META[selected.status].label}</strong></p>
                <p>🌱 Advisory: Monitor drainage and plan farm activities according to local conditions.</p>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Rainfall</dt><dd className="font-semibold">{selected.rainfallMm} mm</dd></div>
                <div><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="font-semibold">{selected.temperatureC}°C</dd></div>
                <div><dt className="text-xs text-muted-foreground">Humidity</dt><dd className="font-semibold">{selected.humidityPct}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Wind</dt><dd className="font-semibold">{selected.windKmh} km/h</dd></div>
                <div><dt className="text-xs text-muted-foreground">Rain Probability</dt><dd className="font-semibold">{selected.rainProbabilityPct}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Elevation</dt><dd className="font-semibold">{selected.elevationM} m</dd></div>
              </dl>
            )}
            <Link
              to="/forecast"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View full forecast <ArrowRight className="size-3" />
            </Link>
          </Card>

          <Card title="Weather Alerts" action={<DemoTag />}>
            <ul className="space-y-2.5">
              {ALERTS.slice(0, 3).map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className={a.severity === "high" ? "size-3.5 text-status-severe" : "size-3.5 text-status-moderate"} />
                    {a.condition}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {a.panchayat} · {a.date}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
