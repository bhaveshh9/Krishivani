import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Project — Krishivani" },
      { name: "description", content: "Why Krishivani: bridging the gap between coarse Block-level weather forecasts and local Panchayat-level agricultural decisions. SIH 2026 PS 26074." },
      { property: "og:title", content: "About the Project — Krishivani" },
      { property: "og:description", content: "Bridging coarse weather forecasts and local agricultural decisions with AI downscaling." },
    ],
  }),
  component: AboutPage,
});

const PILLARS = [
  { title: "Problem", text: "Coarse spatial weather information" },
  { title: "Solution", text: "AI-based spatial downscaling" },
  { title: "Output", text: "Panchayat-level forecast" },
  { title: "Impact", text: "Better localized agricultural decision support" },
];

const RESOLUTION_FLOW = ["LOW RESOLUTION", "AI DOWNSCALING", "HIGHER RESOLUTION", "AGRICULTURAL ADVISORY"];

function AboutPage() {
  return (
    <AppLayout>
      <PageHeader title="Why Krishivani?" />

      <Card>
        <p className="max-w-3xl text-sm leading-relaxed text-foreground">
          Weather forecasts are often available at larger spatial scales, while agricultural
          decisions are made at much smaller local scales. Krishivani aims to bridge this gap by
          using AI/ML-based downscaling to transform existing Block-level forecast information into
          localized Panchayat-level weather insights and agro-meteorological advisories.
        </p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{p.title}</p>
            <p className="mt-2 text-sm text-foreground">{p.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Smart India Hackathon 2026">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Problem Statement ID</dt>
              <dd className="font-semibold">26074</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Problem Statement</dt>
              <dd className="leading-relaxed">
                “Downscaling of weather forecast from Block level to Panchayat level for
                agro-meteorological advisory services.”
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Project</dt>
              <dd className="font-semibold">Krishivani</dd>
            </div>
          </dl>
        </Card>

        <Card title="From Coarse to Local">
          <div className="space-y-0">
            {RESOLUTION_FLOW.map((step, i) => (
              <div key={step}>
                <div
                  className={
                    i === RESOLUTION_FLOW.length - 1
                      ? "rounded-md bg-primary px-4 py-2.5 text-sm font-medium tracking-wide text-primary-foreground"
                      : "rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium tracking-wide"
                  }
                >
                  {step}
                </div>
                {i < RESOLUTION_FLOW.length - 1 && (
                  <div className="flex h-6 items-center pl-5 text-muted-foreground">
                    <ArrowDown className="size-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Prototype Scope">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• This is a frontend prototype. No ML model is currently executing.</li>
          <li>• All weather values, metrics and alerts are demo/sample data, not live government data.</li>
          <li>• A mock service layer stands in for the future Flask/FastAPI backend and Python ML model.</li>
          <li>• Data source integrations are marked “Planned Integration”.</li>
        </ul>
      </Card>
    </AppLayout>
  );
}
