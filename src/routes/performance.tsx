import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchMetrics, type ModelPerf } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Line, ComposedChart,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Card, PageHeader, DemoTag, StatCard } from "@/components/ui-bits";
import {
  ERROR_DISTRIBUTION, MODEL_METRICS, PREDICTED_VS_ACTUAL, RAIN_EVENT_DETECTION,
} from "@/lib/demo-data";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Model Performance — Krishivani" },
      { name: "description", content: "Evaluation of the AI downscaling model against the Block-level baseline: MAE, RMSE, bias, correlation and event detection. Demo metrics." },
      { property: "og:title", content: "Model Performance — Krishivani" },
      { property: "og:description", content: "Baseline Block forecast vs AI-downscaled Panchayat forecast metrics." },
    ],
  }),
  component: PerformancePage,
});

const METRIC_ROWS = [
  { key: "mae", label: "MAE (mm)", better: "lower" },
  { key: "rmse", label: "RMSE (mm)", better: "lower" },
  { key: "bias", label: "Bias (mm)", better: "lower" },
  { key: "correlation", label: "Correlation", better: "higher" },
  { key: "f1", label: "F1 Score", better: "higher" },
  { key: "csi", label: "CSI", better: "higher" },
] as const;

function PerformancePage() {
  const [perf, setPerf] = useState<ModelPerf | null>(null);
  useEffect(() => { fetchMetrics().then(setPerf).catch(() => setPerf(null)); }, []);
  const proposed = { ...MODEL_METRICS.proposed, ...(perf?.proposed ?? {}) };
  const baseline = { ...MODEL_METRICS.baseline, ...(perf?.baseline ?? {}) };

  return (
    <AppLayout>
      <PageHeader
        title="Model Performance"
        subtitle="AI-downscaled Panchayat forecast compared against the Block-level baseline."
        demo
      />

      <div className="mb-3 rounded-lg border border-status-moderate/40 bg-status-moderate/10 p-3 text-xs text-foreground">
        {perf?.note ?? "Loading metrics…"} Charts further below still use static placeholder values until wired to the backend. Replace with validated results on real data.
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="MAE" value={proposed.mae} unit="mm" hint={`Baseline ${baseline.mae} mm`} />
        <StatCard label="RMSE" value={proposed.rmse} unit="mm" hint={`Baseline ${baseline.rmse} mm`} />
        <StatCard label="Correlation" value={proposed.correlation} hint={`Baseline ${baseline.correlation}`} />
        <StatCard label="Bias" value={proposed.bias} unit="mm" hint={`Baseline ${baseline.bias} mm`} />
      </div>

      <Card className="mt-4" title="Baseline vs Proposed" action={<DemoTag />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Metric</th>
                <th className="py-2 pr-4 font-medium">Baseline (Block-level forecast)</th>
                <th className="py-2 pr-4 font-medium">Proposed (AI-downscaled)</th>
                <th className="py-2 font-medium">Improvement</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((m) => {
                const b = baseline[m.key];
                const p = proposed[m.key];
                const improved = m.better === "lower" ? Math.abs(p) < Math.abs(b) : p > b;
                return (
                  <tr key={m.key} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{m.label}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{b}</td>
                    <td className="py-2 pr-4 font-semibold">{p}</td>
                    <td className={improved ? "py-2 text-status-normal" : "py-2 text-status-severe"}>
                      {improved ? "Improved" : "No gain"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Predicted vs Actual Rainfall" action={<DemoTag />}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="actual" name="Actual" unit=" mm" fontSize={12} label={{ value: "Actual (mm)", position: "insideBottom", offset: -10, fontSize: 11 }} />
                <YAxis type="number" dataKey="predicted" name="Predicted" unit=" mm" fontSize={12} />
                <ZAxis range={[80, 80]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter name="Panchayats" data={PREDICTED_VS_ACTUAL} fill="var(--primary)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Error Distribution" action={<DemoTag />}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ERROR_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="range" fontSize={10} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="Cases" fill="var(--sky)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Rainfall Event Detection" action={<DemoTag />}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={RAIN_EVENT_DETECTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="event" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="correct" name="Correctly detected" fill="var(--status-normal)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="missed" name="Missed" fill="var(--status-severe)" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="correct" stroke="var(--primary)" strokeWidth={1.5} dot={false} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AppLayout>
  );
}
