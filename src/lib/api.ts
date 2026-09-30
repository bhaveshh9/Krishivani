/**
 * Krishivani — API layer.
 * Talks to the Flask backend (VITE_API_URL, default http://localhost:5000).
 * If the backend is unreachable, falls back to built-in Prototype / Demo Data so
 * the presentation still works, and the UI shows a visible "backend offline" badge.
 */
import { useSyncExternalStore } from "react";
import {
  ADVISORIES, ALERTS, BLOCK_FORECAST, MODEL_METRICS, PANCHAYATS, getFiveDayForecast,
  type Advisory, type DayForecast, type Panchayat, type RainStatus, type WeatherAlert,
} from "./demo-data";
import { OFFLINE_ROWS, offlineFiveDay, offlineScope, statusOf, type GeoPanchayat, type Scope } from "./offline-data";

export type { GeoPanchayat, Scope };
export const API_BASE: string = (import.meta.env?.VITE_API_URL as string | undefined) ?? "http://localhost:5000";

/* ---- backend status (drives the online/offline badge) ---- */
let online: boolean | null = null;
const listeners = new Set<() => void>();
const setOnline = (v: boolean) => {
  if (online !== v) {
    online = v;
    listeners.forEach((l) => l());
  }
};
export function useBackendStatus(): boolean | null {
  return useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => online, () => null);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    setOnline(false);
    throw new Error("Backend unavailable");
  }
  setOnline(true);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}
/** Backend first; built-in demo data only if the backend cannot be reached. */
async function withFallback<T>(live: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await live();
  } catch (e) {
    if (online === false) return fallback();
    throw e; // backend reachable but returned an error: surface it, never hide it
  }
}
const qs = (o: Record<string, string | undefined>) =>
  "?" + new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
export const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---- mapping ---- */
interface Row {
  id: string; name: string; block: string; district: string; state: string; lat: number; lng: number; elevation_m: number;
  block_rainfall_mm: number; rainfall_mm: number; temperature_c: number; humidity_pct: number; wind_kmh: number;
  rain_probability_pct: number; status: RainStatus; historical_mean_mm: number; anomaly: string;
}
const toGeo = (r: Row): GeoPanchayat => ({
  id: r.id, name: r.name, block: r.block, district: r.district, state: r.state, lat: r.lat, lng: r.lng, elevationM: r.elevation_m,
  rainfallMm: r.rainfall_mm, temperatureC: r.temperature_c, humidityPct: r.humidity_pct, windKmh: r.wind_kmh,
  rainProbabilityPct: r.rain_probability_pct, status: r.status, blockRainfallMm: r.block_rainfall_mm,
  historicalMeanMm: r.historical_mean_mm, anomaly: r.anomaly,
});

/* ---- locations + weather ---- */
export async function fetchLocations(): Promise<GeoPanchayat[]> {
  return withFallback(async () => (await call<{ panchayats: Row[] }>(`/api/weather-map${qs({ date: todayISO() })}`)).panchayats.map(toGeo), () => OFFLINE_ROWS);
}
export async function fetchWeatherMap(scope: Scope, date: string): Promise<GeoPanchayat[]> {
  return withFallback(
    async () => (await call<{ panchayats: Row[] }>(`/api/weather-map${qs({ ...scope, date })}`)).panchayats.map(toGeo),
    () => offlineScope(scope),
  );
}
export async function fetchScopeAlerts(scope: Scope, date: string) {
  interface A { id: string; panchayat: string; block: string; district: string; state: string; date: string; condition: string; severity: "high" | "medium"; expected_rainfall_mm: number; action: string }
  return withFallback(
    async () => (await call<{ alerts: A[] }>(`/api/weather-alerts${qs({ ...scope, date })}`)).alerts,
    () => offlineScope(scope).filter((r) => r.status === "heavy" || r.status === "severe").map((r): A => ({
      id: r.id, panchayat: r.name, block: r.block, district: r.district, state: r.state, date, condition: r.status === "severe" ? "Very Heavy Rainfall Expected" : "Heavy Rainfall Expected",
      severity: "high", expected_rainfall_mm: r.rainfallMm, action: "Monitor field drainage and plan weather-sensitive activities accordingly." })),
  );
}
export interface FarmerDay extends DayForecast { date: string; humidityPct: number; windKmh: number; status: RainStatus; isLive: boolean; source: string }
export async function fetchFarmerForecast(id: string, date: string): Promise<FarmerDay[]> {
  interface D { date: string; rainfall_mm: number; temperature_c: number; humidity_pct: number; wind_kmh: number; rain_probability_pct: number; status: RainStatus; input_source?: string; input_is_live?: boolean }
  return withFallback(
    async () => (await call<{ days: D[] }>(`/api/farmer/forecast${qs({ id, date })}`)).days.map((d): FarmerDay => ({
      day: d.date.slice(5), date: d.date, rainfallMm: d.rainfall_mm, temperatureC: d.temperature_c, rainProbabilityPct: d.rain_probability_pct,
      humidityPct: d.humidity_pct, windKmh: d.wind_kmh, status: d.status, isLive: d.input_is_live ?? false, source: d.input_source ?? "unknown" })),
    () => { const p = OFFLINE_ROWS.find((r) => r.id === id) ?? OFFLINE_ROWS[0]!;
      return offlineFiveDay(id).map((d, i): FarmerDay => ({ ...d, date, humidityPct: p.humidityPct, windKmh: p.windKmh, status: statusOf(d.rainfallMm), day: `+${i}d`, isLive: false, source: "offline-fallback" })); },
  );
}
export interface AdvisoryResult { items: { key: string; title: string; text: string }[]; disclaimer: string; cropNote: string | null; offline?: boolean }
export async function fetchAdvisory(status: RainStatus, rainfallMm: number, windKmh: number, language: string, crop?: string): Promise<AdvisoryResult> {
  return withFallback(
    async () => {
      const r = await call<{ items: AdvisoryResult["items"]; disclaimer: string; crop_note: string | null }>("/api/advisory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rainfall_mm: rainfallMm, wind_kmh: windKmh, language, crop }) });
      return { items: r.items, disclaimer: r.disclaimer, cropNote: r.crop_note };
    },
    () => ({ items: [{ key: status, title: "Offline demo advisory", text: (status === "heavy" || status === "severe" ? ADVISORIES[0] : ADVISORIES[1])!.text }],
      disclaimer: "Weather-based advisory. Consider local agricultural guidance before taking farm decisions.", cropNote: null, offline: true }),
  );
}

/* ---- downscaling ---- */
export interface DownscaleResult { blockForecast: { block: string; rainfallMm: number; temperatureC: number; humidityPct: number; windKmh: number }; outputs: GeoPanchayat[]; model: string; timestamp: string }
export async function runDownscale(block: string, date: string, overrides: { block_rainfall?: number; temperature?: number; humidity?: number } = {}): Promise<DownscaleResult> {
  return withFallback(
    async () => {
      const r = await call<{ block_forecast: { rainfall_mm: number; temperature_c: number; humidity_pct: number; wind_kmh: number }; panchayat_predictions: Row[]; model: string; prediction_timestamp: string }>(
        "/api/downscale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block, date, ...overrides }) });
      const b = r.block_forecast;
      return { blockForecast: { block, rainfallMm: b.rainfall_mm, temperatureC: b.temperature_c, humidityPct: b.humidity_pct, windKmh: b.wind_kmh },
        outputs: r.panchayat_predictions.map(toGeo), model: r.model, timestamp: r.prediction_timestamp };
    },
    () => ({ blockForecast: { block, rainfallMm: 40, temperatureC: 29, humidityPct: 76, windKmh: 12 }, outputs: offlineScope({ block }), model: "offline-demo (no ML model)", timestamp: new Date().toISOString() }),
  );
}

export interface ModelPerf { proposed: Record<string, number>; baseline: Record<string, number>; note: string; live: boolean }
export async function fetchMetrics(): Promise<ModelPerf> {
  return withFallback(
    async () => {
      const m = await call<{ test: { proposed: Record<string, number>; baseline: Record<string, number> }; meta: { label: string; split: { test: string[] } } }>("/api/model-performance");
      return { ...m.test, note: `${m.meta.label} Test period: ${m.meta.split.test.join(" to ")}.`, live: true };
    },
    () => ({ ...MODEL_METRICS, note: "Static placeholder values (backend offline). Not measured.", live: false }),
  );
}

/* ---- legacy exports used by existing pages (kept working) ---- */
const BLOCK = BLOCK_FORECAST.block;
export async function fetchBlockForecast() {
  return withFallback(async () => {
    const b = await call<{ rainfall_mm: number; temperature_c: number; humidity_pct: number; wind_kmh: number; date: string }>(`/api/forecast/block${qs({ block: BLOCK, date: todayISO() })}`);
    const rows = await fetchWeatherMap({ block: BLOCK }, todayISO());
    const prob = Math.round(rows.reduce((a, r) => a + r.rainProbabilityPct, 0) / Math.max(rows.length, 1));
    return { ...BLOCK_FORECAST, rainfallMm: b.rainfall_mm, temperatureC: b.temperature_c, humidityPct: b.humidity_pct, windKmh: b.wind_kmh, rainProbabilityPct: prob, issuedFor: b.date };
  }, () => BLOCK_FORECAST);
}
export async function fetchPanchayatForecasts(): Promise<Panchayat[]> {
  return fetchWeatherMap({ block: BLOCK }, todayISO()).catch(() => PANCHAYATS);
}
export async function fetchPanchayatById(id: string): Promise<Panchayat | undefined> {
  return (await fetchPanchayatForecasts()).find((p) => p.id === id);
}
export async function fetchFiveDayForecast(id: string): Promise<DayForecast[]> {
  return fetchFarmerForecast(id, todayISO()).catch(() => getFiveDayForecast(PANCHAYATS.find((x) => x.id === id) ?? PANCHAYATS[0]!));
}
export async function runDownscaling() {
  const t0 = performance.now();
  const r = await runDownscale(BLOCK_DISTRICT, BLOCK, todayISO(), { block_rainfall: BLOCK_FORECAST.rainfallMm, temperature: BLOCK_FORECAST.temperatureC, humidity: BLOCK_FORECAST.humidityPct });
  return { input: { ...BLOCK_FORECAST, rainfallMm: r.blockForecast.rainfallMm, temperatureC: r.blockForecast.temperatureC, humidityPct: r.blockForecast.humidityPct, issuedFor: todayISO() },
    outputs: r.outputs as Panchayat[], runtimeMs: Math.round(performance.now() - t0) };
}
export async function fetchAdvisories(): Promise<Advisory[]> {
  interface G { id: string; type: Advisory["type"]; title: string; text: string; applies_to: string[] }
  return withFallback(async () => (await call<{ advisories: G[] }>(`/api/advisories${qs({ block: BLOCK, date: todayISO() })}`)).advisories.map((g) => ({ id: g.id, type: g.type, title: g.title, text: g.text, appliesTo: g.applies_to })), () => ADVISORIES);
}
export async function fetchAlerts(): Promise<WeatherAlert[]> {
  return withFallback(async () => (await fetchScopeAlerts({ block: BLOCK }, todayISO())).map((a): WeatherAlert => ({ id: a.id, panchayat: a.panchayat, condition: a.condition, date: a.date, severity: a.severity, action: a.action })), () => ALERTS);
}
export const fetchModelPerformance = fetchMetrics;
