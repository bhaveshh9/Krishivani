import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, CloudRain, Gauge, Loader2, MapPin, Droplets } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { BackendBadge, Card, DemoTag, PageHeader, StatCard, StatusBadge } from "@/components/ui-bits";
import { MapPanel } from "@/components/MapPanel";
import type { MapLayer } from "@/components/WeatherMap";
import {
  fetchAdvisory, fetchFarmerForecast, fetchLocations, fetchMetrics, fetchScopeAlerts, fetchWeatherMap, runDownscale, todayISO,
  type AdvisoryResult, type DownscaleResult, type FarmerDay, type GeoPanchayat, type ModelPerf,
} from "@/lib/api";
import { STATUS_META, type RainStatus } from "@/lib/demo-data";

export const Route = createFileRoute("/government-dashboard")({
  head: () => ({ meta: [{ title: "Weather Intelligence Dashboard — Krishivani" }, { name: "description", content: "Government / officer dashboard: State → District → Taluka → Panchayat weather intelligence with AI downscaling. Demo data." }] }),
  component: GovernmentDashboard,
});

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "locations", label: "Panchayat Locations" }, { id: "rainfall", label: "Rainfall" }, { id: "temperature", label: "Temperature" },
  { id: "alerts", label: "Weather Alerts" }, { id: "forecast-vs-actual", label: "Forecast vs Actual" },
];
const ANOMALY: Record<string, string> = { below_normal: "Below Normal", normal: "Normal", above_normal: "Above Normal", extreme: "Extreme" };
const STEPS = ["Loading weather data...", "Preparing spatial features...", "Running ML model...", "Generating Panchayat forecast...", "Preparing advisory..."];
const selectCls = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

function GovernmentDashboard() {
  const [all, setAll] = useState<GeoPanchayat[]>([]);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [layer, setLayer] = useState<MapLayer>("rainfall");
  const [rows, setRows] = useState<GeoPanchayat[]>([]);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof fetchScopeAlerts>>>([]);
  const [selectedId, setSelectedId] = useState("");
  const [advisory, setAdvisory] = useState<AdvisoryResult | null>(null);
  const [trend, setTrend] = useState<FarmerDay[]>([]);
  const [metrics, setMetrics] = useState<ModelPerf | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ds, setDs] = useState<DownscaleResult | null>(null);
  const [step, setStep] = useState(-1);
  const [dsIn, setDsIn] = useState({ rain: "", temp: "", hum: "" });

  useEffect(() => {
    fetchLocations().then(setAll).catch((e: Error) => setError(e.message));
    fetchMetrics().then(setMetrics).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([fetchWeatherMap({ district, block }, date), fetchScopeAlerts({ district, block }, date)])
      .then(([r, a]) => {
        if (!r.length) setError("No Panchayat data for this selection.");
        setRows(r);
        setAlerts(a);
        setSelectedId((cur) => (panchayatId && r.some((x) => x.id === panchayatId) ? panchayatId : r.some((x) => x.id === cur) ? cur : (r[0]?.id ?? "")));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [district, block, panchayatId, date]);

  const selected = rows.find((r) => r.id === selectedId);
  useEffect(() => {
    if (!selected) return;
    fetchAdvisory(selected.status, selected.rainfallMm, selected.windKmh, "en").then(setAdvisory).catch(() => setAdvisory(null));
    fetchFarmerForecast(selected.id, date).then(setTrend).catch(() => setTrend([]));
  }, [selected?.id, selected?.rainfallMm, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const districts = useMemo(() => [...new Set(all.map((a) => a.district))], [all]);
  const blocks = useMemo(() => [...new Set(all.filter((a) => !district || a.district === district).map((a) => a.block))], [all, district]);
  const panchayats = all.filter((a) => (!district || a.district === district) && (!block || a.block === block));
  const level = block ? "Taluka / Block" : district ? "District" : "State";
  const avg = rows.length ? rows.reduce((s, r) => s + r.rainfallMm, 0) / rows.length : 0;
  const heavy = rows.filter((r) => r.status === "heavy" || r.status === "severe");
  const dist = (["normal", "moderate", "heavy", "severe"] as RainStatus[]).map((s) => ({ s, n: rows.filter((r) => r.status === s).length }));
  const anomalies = Object.entries(ANOMALY).map(([k, label]) => ({ label, n: rows.filter((r) => r.anomaly === k).length }));
  const dsDistrict = district || selected?.district || "";
  const dsBlock = block || selected?.block || "";

  const onRun = async () => {
    if (!dsBlock || !dsDistrict) return;
    setDs(null);
    setError("");
    try {
      const opt = (k: string, v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? {} : { [k]: Number(v) });
      const body = { ...opt("block_rainfall", dsIn.rain), ...opt("temperature", dsIn.temp), ...opt("humidity", dsIn.hum) };
      const req = runDownscale(dsDistrict, dsBlock, date, body);
      for (let i = 0; i < STEPS.length; i++) { setStep(i); await new Promise((r) => setTimeout(r, 450)); }
      setDs(await req);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStep(-1);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Krishivani — Weather Intelligence Dashboard" subtitle="State → District → Taluka → Panchayat" demo />
      <div className="mb-3 flex flex-wrap items-center gap-2"><BackendBadge /><DemoTag /></div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <label className="text-xs text-muted-foreground">State<select className={selectCls} disabled><option>Maharashtra</option></select></label>
          <label className="text-xs text-muted-foreground">District
            <select className={selectCls} value={district} onChange={(e) => { setDistrict(e.target.value); setBlock(""); setPanchayatId(""); }}>
              <option value="">All districts</option>{districts.map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Taluka / Block
            <select className={selectCls} value={block} onChange={(e) => { setBlock(e.target.value); setPanchayatId(""); }}>
              <option value="">All blocks</option>{blocks.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Panchayat
            <select className={selectCls} value={panchayatId} onChange={(e) => { setPanchayatId(e.target.value); setSelectedId(e.target.value); }}>
              <option value="">All Panchayats</option>{panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Date<input type="date" className={selectCls} value={date} onChange={(e) => setDate(e.target.value || todayISO())} /></label>
        </div>
      </Card>

      {error && <div role="alert" className="mb-4 rounded-md border border-status-severe/40 bg-status-severe/10 p-3 text-sm">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Panchayats Monitored" value={rows.length} icon={<MapPin className="size-4" />} hint="Demo locations" />
        <StatCard label="Heavy Rainfall Alerts" value={heavy.length} icon={<AlertTriangle className="size-4" />} hint="Demo forecast" />
        <StatCard label="Avg Forecast Rainfall" value={avg.toFixed(1)} unit="mm" icon={<CloudRain className="size-4" />} hint="Demo forecast" />
        <StatCard label="High Rain Probability" value={rows.filter((r) => r.rainProbabilityPct >= 70).length} icon={<Droplets className="size-4" />} hint="≥ 70%" />
        <StatCard label="Model MAE" value={metrics ? String(metrics.proposed.mae) : "—"} unit="mm" icon={<Gauge className="size-4" />} hint={metrics?.live ? "Synthetic demo data" : "Backend offline"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={`Weather map — ${level} view`} action={<span className="text-xs text-muted-foreground">{loading ? "Loading…" : `${rows.length} Panchayats`}</span>}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {LAYERS.map((l) => (
              <button key={l.id} onClick={() => setLayer(l.id)} className={`rounded-md border px-2.5 py-1 text-xs ${layer === l.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>{l.label}</button>
            ))}
          </div>
          <div className="h-[460px]"><MapPanel points={rows} layer={layer} selectedId={selectedId} onSelect={(p) => setSelectedId(p.id)} /></div>
          <p className="mt-2 text-xs text-muted-foreground">
            {layer === "forecast-vs-actual" ? "No observation data is connected yet, so actual values are not shown. Connect an authorized observation dataset to enable this layer." : "Point locations only; official Panchayat boundaries are not used."}
          </p>
        </Card>

        <Card title={selected ? `${selected.name} Panchayat` : "Selected area"} action={selected ? <StatusBadge status={selected.status} /> : undefined}>
          {selected ? (
            <>
              <p className="text-xs text-muted-foreground">{selected.district} › {selected.block} · {selected.elevationM} m ({selected.elevationLive ? "live elevation" : "estimated elevation"}) · {date}</p>
              <p className={`mt-0.5 text-[10px] font-medium ${selected.isLive ? "text-status-normal" : "text-muted-foreground"}`}>{selected.isLive ? "● Live weather (Open-Meteo)" : `○ Prototype demo value (${selected.inputSource})`}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Rainfall</dt><dd className="font-semibold">{selected.rainfallMm} mm</dd></div>
                <div><dt className="text-xs text-muted-foreground">Rain Probability</dt><dd className="font-semibold">{selected.rainProbabilityPct}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Temperature</dt><dd className="font-semibold">{selected.temperatureC}°C</dd></div>
                <div><dt className="text-xs text-muted-foreground">Humidity</dt><dd className="font-semibold">{selected.humidityPct}%</dd></div>
                <div><dt className="text-xs text-muted-foreground">Wind</dt><dd className="font-semibold">{selected.windKmh} km/h</dd></div>
                <div><dt className="text-xs text-muted-foreground">Anomaly</dt><dd className="font-semibold">{ANOMALY[selected.anomaly] ?? "—"}</dd></div>
              </dl>
              <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">AI Downscaling</p>
                <p>Block Forecast: <b>{selected.blockRainfallMm} mm</b></p>
                <p>AI Panchayat Estimate: <b>{selected.rainfallMm} mm</b></p>
              </div>
              {advisory && (
                <div className="mt-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">Advisory (decision support)</p>
                  {advisory.items.map((i) => <p key={i.key} className="mt-1">{i.text}</p>)}
                  <p className="mt-2 text-[11px] text-muted-foreground">{advisory.disclaimer}</p>
                </div>
              )}
            </>
          ) : <p className="text-sm text-muted-foreground">Click a Panchayat marker to see details.</p>}
        </Card>
      </div>

      <Card className="mt-4" title={`${level} summary`}>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>Districts: <b>{new Set(rows.map((r) => r.district)).size}</b></span>
          <span>Blocks: <b>{new Set(rows.map((r) => r.block)).size}</b></span>
          <span>Panchayats: <b>{rows.length}</b></span>
          <span>Avg rainfall: <b>{avg.toFixed(1)} mm</b></span>
          <span>Heavy rainfall zones: <b>{[...new Set(heavy.map((r) => r.block))].join(", ") || "None"}</b></span>
        </div>
      </Card>

      <Card className="mt-4" title="Block → Panchayat Downscaling" action={<DemoTag />}>
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <input className={selectCls} placeholder="Block rainfall mm (optional)" value={dsIn.rain} onChange={(e) => setDsIn({ ...dsIn, rain: e.target.value })} inputMode="decimal" />
          <input className={selectCls} placeholder="Temperature °C (optional)" value={dsIn.temp} onChange={(e) => setDsIn({ ...dsIn, temp: e.target.value })} inputMode="decimal" />
          <input className={selectCls} placeholder="Humidity % (optional)" value={dsIn.hum} onChange={(e) => setDsIn({ ...dsIn, hum: e.target.value })} inputMode="decimal" />
          <button onClick={onRun} disabled={step >= 0 || !dsBlock || !dsDistrict} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60">Run AI Downscaling</button>
        </div>
        {step >= 0 && (
          <ul className="mb-3 space-y-1 text-sm">
            {STEPS.map((s, i) => <li key={s} className={i <= step ? "text-foreground" : "text-muted-foreground/50"}>{i < step ? "✓" : i === step ? <Loader2 className="mr-1 inline size-3.5 animate-spin" /> : "○"} {s}</li>)}
          </ul>
        )}
        <div className="grid items-center gap-3 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-md bg-muted p-3 text-sm"><b>BLOCK FORECAST</b><br />{dsBlock ? `${dsBlock}, ${dsDistrict}` : "Select a block"}<br />{ds ? `${ds.blockForecast.rainfallMm} mm · ${ds.blockForecast.temperatureC}°C · ${ds.blockForecast.humidityPct}%` : "Run to load"}{ds && <div className={`mt-1 text-[10px] font-medium ${ds.blockForecast.isLive ? "text-status-normal" : "text-muted-foreground"}`}>{ds.blockForecast.isLive ? "● Live (Open-Meteo)" : "○ Prototype demo value (live forecast unavailable for this date/connection)"}</div>}</div>
          <ArrowDown className="mx-auto size-5 text-muted-foreground md:-rotate-90" />
          <div className="rounded-md bg-primary/10 p-3 text-sm"><b>AI DOWNSCALING ENGINE</b><br />Historical + spatial features<br /><span className="text-xs text-muted-foreground">{ds?.model ?? "model not run yet"}</span></div>
          <ArrowDown className="mx-auto size-5 text-muted-foreground md:-rotate-90" />
          <div className="rounded-md bg-muted p-3 text-sm"><b>PANCHAYAT FORECAST</b>{ds ? ds.outputs.map((o) => <div key={o.id}>{o.name} → <b>{o.rainfallMm} mm</b></div>) : <div className="text-muted-foreground">Run to generate</div>}</div>
        </div>
        {ds && <p className="mt-2 text-xs text-muted-foreground">Prediction time: {new Date(ds.timestamp).toLocaleString()}</p>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Panchayat rainfall comparison (mm)">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: r.name, rain: r.rainfallMm }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis /><Tooltip />
              {block && rows[0] && <ReferenceLine y={rows[0].blockRainfallMm} stroke="#64748b" strokeDasharray="4 4" label={{ value: "Block forecast", fontSize: 10 }} />}
              <Bar dataKey="rain" name="AI estimate">{rows.map((r) => <Cell key={r.id} fill={STATUS_META[r.status].hex} />)}</Bar></BarChart>
          </ResponsiveContainer></div>
        </Card>
        <Card title={`5-day forecast trend — ${selected?.name ?? ""}`}>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.map((d, i) => ({ day: `Day ${i + 1}`, rain: d.rainfallMm }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey="rain" name="Rainfall (mm)" stroke="#2f7d4f" strokeWidth={2} /></LineChart>
          </ResponsiveContainer></div>
        </Card>
        <Card title="Alert distribution">
          <div className="flex flex-wrap gap-2 text-sm">{dist.map((d) => <span key={d.s} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1"><span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_META[d.s].colorVar }} />{STATUS_META[d.s].label}: <b>{d.n}</b></span>)}</div>
        </Card>
        <Card title="Rainfall anomaly" action={<span className="text-[10px] font-medium uppercase text-status-moderate">Demo anomaly calculation</span>}>
          <div className="flex flex-wrap gap-2 text-sm">{anomalies.map((a) => <span key={a.label} className="rounded-md bg-muted px-2.5 py-1">{a.label}: <b>{a.n}</b></span>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Compared with a synthetic historical baseline, not an official climatology.</p>
        </Card>
      </div>

      <Card className="mt-4" title="⚠ Weather Alert Center">
        {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No heavy-rainfall alerts for this selection.</p> : (
          <ul className="space-y-2">{alerts.map((a) => (
            <li key={a.id} className={`rounded-md border-l-4 bg-muted p-3 text-sm ${a.severity === "high" ? "border-status-severe" : "border-status-heavy"}`}>
              <b>{a.condition}</b> — {a.panchayat}, {a.block}, {a.district}, {a.state} · {a.date}<br />
              Expected rainfall: {a.expected_rainfall_mm} mm · {a.action}
            </li>))}</ul>
        )}
      </Card>
    </AppLayout>
  );
}
