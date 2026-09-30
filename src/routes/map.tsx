import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader, DemoTag, StatusBadge } from "@/components/ui-bits";
import { MapPanel } from "@/components/MapPanel";
import { PANCHAYATS, STATUS_META, type Panchayat, type RainStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Weather Map — Krishivani" },
      { name: "description", content: "Interactive Panchayat-level weather map for Baramati block, Pune district. Demo data." },
      { property: "og:title", content: "Weather Map — Krishivani" },
      { property: "og:description", content: "Interactive Panchayat weather status map (demo data)." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [selected, setSelected] = useState<Panchayat | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Weather Map"
        subtitle="Panchayat-level weather status across Baramati block. Click a marker for details."
        demo
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="h-[560px]">
            <MapPanel onSelect={setSelected} selectedId={selected?.id} />
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
        <Card title={selected ? `${selected.name} Panchayat` : "Select a Panchayat"} action={selected ? <StatusBadge status={selected.status} /> : <DemoTag />}>
          {selected ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Rainfall</dt><dd className="font-semibold">{selected.rainfallMm} mm</dd></div>
              <div><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="font-semibold">{selected.temperatureC}°C</dd></div>
              <div><dt className="text-xs text-muted-foreground">Humidity</dt><dd className="font-semibold">{selected.humidityPct}%</dd></div>
              <div><dt className="text-xs text-muted-foreground">Wind</dt><dd className="font-semibold">{selected.windKmh} km/h</dd></div>
              <div><dt className="text-xs text-muted-foreground">Rain Probability</dt><dd className="font-semibold">{selected.rainProbabilityPct}%</dd></div>
              <div><dt className="text-xs text-muted-foreground">Elevation</dt><dd className="font-semibold">{selected.elevationM} m</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click any Panchayat marker on the map to view its downscaled weather details. All
              values are prototype demo data, not live government weather data.
            </p>
          )}
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">All Panchayats</p>
            <ul className="space-y-1 text-sm">
              {PANCHAYATS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelected(p)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <span>{p.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[p.status].colorVar }} />
                      {p.rainfallMm} mm
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
