import { createFileRoute } from "@tanstack/react-router";
import { Database, Satellite, Mountain, MapPinned, CloudSun } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader } from "@/components/ui-bits";
import { DATA_SOURCES } from "@/lib/demo-data";

export const Route = createFileRoute("/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — Krishivani" },
      { name: "description", content: "Planned data source integrations for Krishivani: forecast datasets, historical weather, GIS boundaries, terrain and satellite data." },
      { property: "og:title", content: "Data Sources — Krishivani" },
      { property: "og:description", content: "Planned data integrations for Panchayat-level weather downscaling." },
    ],
  }),
  component: DataSourcesPage,
});

const ICONS = [CloudSun, Database, MapPinned, Mountain, Satellite];

const API_PLACEHOLDERS = [
  "GET /api/block-forecast",
  "GET /api/panchayat-forecast",
  "GET /api/downscale",
  "GET /api/advisory",
  "GET /api/model-performance",
];

function DataSourcesPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Data Sources"
        subtitle="Datasets intended to feed the downscaling model. No external APIs are connected in this prototype."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DATA_SOURCES.map((s, i) => {
          const Icon = ICONS[i % ICONS.length]!;
          return (
            <Card key={s.title}>
              <div className="flex items-start justify-between">
                <Icon className="size-5 text-primary" />
                <span className="rounded-sm border border-status-moderate/40 bg-status-moderate/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-status-moderate">
                  {s.status}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4" title="Planned Backend Architecture">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-sm bg-secondary px-2.5 py-1.5">Frontend (React + TypeScript)</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-sm bg-secondary px-2.5 py-1.5">Flask / FastAPI Backend</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-sm bg-primary px-2.5 py-1.5 text-primary-foreground">Python ML Model</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-sm bg-secondary px-2.5 py-1.5">Weather / GIS Database</span>
        </div>
        <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">API placeholders (mock service layer today)</p>
        <ul className="space-y-1">
          {API_PLACEHOLDERS.map((a) => (
            <li key={a} className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground">
              {a}
            </li>
          ))}
        </ul>
      </Card>
    </AppLayout>
  );
}
