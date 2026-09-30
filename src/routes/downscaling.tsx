import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArrowDown, Cpu, Loader2, Play } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader, DemoTag } from "@/components/ui-bits";
import {
  BLOCK_FORECAST, MODEL_INPUTS, PIPELINE_STEPS, RAINFALL_COMPARISON, type Panchayat,
} from "@/lib/demo-data";
import { runDownscaling } from "@/lib/api";

export const Route = createFileRoute("/downscaling")({
  head: () => ({
    meta: [
      { title: "Downscaling Analysis — Krishivani" },
      { name: "description", content: "How one Block-level forecast becomes multiple Panchayat-level estimates through AI/ML spatial downscaling. Prototype visualization." },
      { property: "og:title", content: "Downscaling Analysis — Krishivani" },
      { property: "og:description", content: "Block-level forecast to Panchayat-level estimates via AI/ML downscaling." },
    ],
  }),
  component: DownscalingPage,
});

function DownscalingPage() {
  const [running, setRunning] = useState(false);
  const [outputs, setOutputs] = useState<Panchayat[] | null>(null);

  const run = async () => {
    setRunning(true);
    setOutputs(null);
    const res = await runDownscaling();
    setOutputs(res.outputs);
    setRunning(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="AI Weather Downscaling"
        subtitle="One coarse Block-level forecast is converted into multiple localized Panchayat-level estimates."
        demo
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Block input */}
        <Card title="Block-Level Forecast (Input)">
          <p className="mb-3 text-xs text-muted-foreground">
            {BLOCK_FORECAST.block} Block · {BLOCK_FORECAST.issuedFor}
          </p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Rainfall</dt><dd className="font-semibold">{BLOCK_FORECAST.rainfallMm} mm</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Temperature</dt><dd className="font-semibold">{BLOCK_FORECAST.temperatureC}°C</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Humidity</dt><dd className="font-semibold">{BLOCK_FORECAST.humidityPct}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Wind</dt><dd className="font-semibold">{BLOCK_FORECAST.windKmh} km/h</dd></div>
          </dl>
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
            <ArrowDown className="size-4 text-muted-foreground" />
            <div className="flex w-full items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Cpu className="size-4" /> AI/ML Downscaling Engine
            </div>
            <ArrowDown className="size-4 text-muted-foreground" />
            <button
              onClick={run}
              disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {running ? "Running model…" : "Run AI Downscaling"}
            </button>
            <p className="text-center text-[10px] text-muted-foreground">
              Simulated run — no ML model is executing. Mock service layer only.
            </p>
          </div>
        </Card>

        {/* Outputs */}
        <Card title="Panchayat-Level Output (Downscaled)" action={<DemoTag />}>
          {!outputs && !running && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Run the downscaling engine to generate Panchayat-level estimates from the Block forecast.
            </p>
          )}
          {running && (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Generating Panchayat-level estimates…
            </p>
          )}
          {outputs && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Panchayat</th>
                    <th className="py-2 pr-4 font-medium">Rainfall</th>
                    <th className="py-2 pr-4 font-medium">Temperature</th>
                    <th className="py-2 pr-4 font-medium">Rain Probability</th>
                    <th className="py-2 font-medium">Δ vs Block</th>
                  </tr>
                </thead>
                <tbody>
                  {outputs.map((p) => {
                    const delta = p.rainfallMm - BLOCK_FORECAST.rainfallMm;
                    return (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="py-2 pr-4 font-medium">{p.name}</td>
                        <td className="py-2 pr-4">{p.rainfallMm} mm</td>
                        <td className="py-2 pr-4">{p.temperatureC}°C</td>
                        <td className="py-2 pr-4">{p.rainProbabilityPct}%</td>
                        <td className={delta >= 0 ? "py-2 text-status-heavy" : "py-2 text-status-normal"}>
                          {delta >= 0 ? "+" : ""}{delta} mm
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Rainfall analysis */}
      <Card className="mt-4" title="Rainfall Analysis — Block vs Downscaled vs Observed" action={<DemoTag />}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={RAINFALL_COMPARISON}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} unit=" mm" />
              <Tooltip />
              <Legend />
              <ReferenceLine y={BLOCK_FORECAST.rainfallMm} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "Block forecast", fontSize: 11, position: "insideTopRight" }} />
              <Bar dataKey="blockForecast" name="Block Forecast" fill="var(--muted-foreground)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="downscaled" name="Downscaled Panchayat" fill="var(--primary)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="observed" name="Actual Observation" fill="var(--sky)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Prototype visualization — values shown are sample data.
        </p>
      </Card>

      {/* Model inputs */}
      <div className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Downscaling Engine — Input Features</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODEL_INPUTS.map((g) => (
            <Card key={g.title} title={g.title}>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {g.items.map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs font-medium">
          <span className="rounded-sm bg-secondary px-2 py-1">Input Features</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-sm bg-primary px-2 py-1 text-primary-foreground">ML Model</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-sm bg-secondary px-2 py-1">Panchayat Forecast</span>
          <span className="ml-auto text-muted-foreground">
            Not all features are currently connected to a backend — prototype components.
          </span>
        </div>
      </div>

      {/* Pipeline */}
      <Card className="mt-4" title="Model Pipeline">
        <div className="space-y-0">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step}>
              <div
                className={
                  i === 0
                    ? "rounded-md border border-border bg-muted px-4 py-2.5 text-sm"
                    : i === PIPELINE_STEPS.length - 1
                      ? "rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                      : "rounded-md border border-border bg-card px-4 py-2.5 text-sm"
                }
              >
                {step}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex h-6 items-center pl-5 text-muted-foreground">
                  <ArrowDown className="size-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
