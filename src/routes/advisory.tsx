import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CloudRain, Droplets, Info, Wind } from "lucide-react";
import { AppLayout, useViewMode } from "@/components/AppLayout";
import { Card, PageHeader, DemoTag } from "@/components/ui-bits";
import { ADVISORIES, ADVISORY_DISCLAIMER, ALERTS } from "@/lib/demo-data";

export const Route = createFileRoute("/advisory")({
  head: () => ({
    meta: [
      { title: "Agro-Meteorological Advisory — Krishivani" },
      { name: "description", content: "Localized weather predictions converted into simple agricultural guidance for Panchayat-level decision support. Demo data." },
      { property: "og:title", content: "Agro-Meteorological Advisory — Krishivani" },
      { property: "og:description", content: "Weather-driven agricultural guidance at Panchayat level." },
    ],
  }),
  component: AdvisoryPage,
});

const ICONS = { "heavy-rain": CloudRain, "low-rain": Droplets, wind: Wind };

function AdvisoryPage() {
  const { mode } = useViewMode();

  return (
    <AppLayout>
      <PageHeader
        title="Agro-Meteorological Advisory"
        subtitle="Localized weather predictions translated into simple agricultural guidance."
        demo
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {ADVISORIES.map((a) => {
          const Icon = ICONS[a.type];
          return (
            <Card key={a.id}>
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-primary" />
                <h3 className="text-sm font-semibold">{a.title}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {mode === "farmer"
                  ? a.text.split(".")[0] + "."
                  : a.text}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.appliesTo.map((p) => (
                  <span key={p} className="rounded-sm bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {p}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{ADVISORY_DISCLAIMER}</p>
      </div>

      {/* Alerts */}
      <Card className="mt-4" title="Weather Alerts" action={<DemoTag />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Panchayat</th>
                <th className="py-2 pr-4 font-medium">Expected Condition</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Severity</th>
                <th className="py-2 font-medium">Recommended Monitoring Action</th>
              </tr>
            </thead>
            <tbody>
              {ALERTS.map((a) => (
                <tr key={a.id} className="border-b border-border/60 align-top">
                  <td className="py-2.5 pr-4 font-medium">{a.panchayat}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle
                        className={
                          a.severity === "high"
                            ? "size-3.5 text-status-severe"
                            : a.severity === "medium"
                              ? "size-3.5 text-status-heavy"
                              : "size-3.5 text-muted-foreground"
                        }
                      />
                      {a.condition}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{a.date}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={
                        a.severity === "high"
                          ? "rounded-sm bg-status-severe/10 px-2 py-0.5 text-xs font-medium text-status-severe"
                          : a.severity === "medium"
                            ? "rounded-sm bg-status-heavy/10 px-2 py-0.5 text-xs font-medium text-status-heavy"
                            : "rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {a.severity === "high" ? "High" : a.severity === "medium" ? "Medium" : "Info"}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
