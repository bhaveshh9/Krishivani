/**
 * Krishivani — DEMO / PROTOTYPE DATA
 * ------------------------------------
 * All values in this file are sample data for the SIH 2026 prototype.
 * They are NOT live government weather data and NOT real measurements.
 * Keep all demo values here, clearly separated from any future production data.
 */

export type RainStatus = "normal" | "moderate" | "heavy" | "severe";

export interface Panchayat {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
  rainfallMm: number;
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  rainProbabilityPct: number;
  status: RainStatus;
}

export const STATUS_META: Record<
  RainStatus,
  { label: string; colorVar: string; hex: string }
> = {
  normal: { label: "Normal", colorVar: "var(--status-normal)", hex: "#3d9e57" },
  moderate: { label: "Moderate", colorVar: "var(--status-moderate)", hex: "#c9a227" },
  heavy: { label: "Heavy Rain Expected", colorVar: "var(--status-heavy)", hex: "#d9731a" },
  severe: { label: "Very Heavy / High Risk", colorVar: "var(--status-severe)", hex: "#c73e2e" },
};

/* Location hierarchy (Maharashtra demo) */
export const LOCATIONS = {
  state: "Maharashtra",
  district: "Pune",
  block: "Baramati",
  panchayats: [
    "Kanheri",
    "Jalochi",
    "Medad",
    "Nimbut",
    "Songaon",
    "Gunawadi",
    "Pandare",
    "Korhale",
  ],
};

/* Demo Panchayats around Baramati block, Pune district, Maharashtra */
export const PANCHAYATS: Panchayat[] = [
  { id: "kanheri", name: "Kanheri", lat: 18.19, lng: 74.56, elevationM: 548, rainfallMm: 52, temperatureC: 28, humidityPct: 81, windKmh: 14, rainProbabilityPct: 82, status: "heavy" },
  { id: "jalochi", name: "Jalochi", lat: 18.16, lng: 74.61, elevationM: 556, rainfallMm: 36, temperatureC: 29, humidityPct: 76, windKmh: 12, rainProbabilityPct: 64, status: "moderate" },
  { id: "medad", name: "Medad", lat: 18.13, lng: 74.55, elevationM: 572, rainfallMm: 18, temperatureC: 31, humidityPct: 68, windKmh: 11, rainProbabilityPct: 35, status: "normal" },
  { id: "nimbut", name: "Nimbut", lat: 18.21, lng: 74.63, elevationM: 541, rainfallMm: 61, temperatureC: 27, humidityPct: 84, windKmh: 16, rainProbabilityPct: 88, status: "severe" },
  { id: "songaon", name: "Songaon", lat: 18.11, lng: 74.6, elevationM: 563, rainfallMm: 31, temperatureC: 30, humidityPct: 72, windKmh: 10, rainProbabilityPct: 58, status: "moderate" },
  { id: "gunawadi", name: "Gunawadi", lat: 18.17, lng: 74.5, elevationM: 589, rainfallMm: 12, temperatureC: 32, humidityPct: 63, windKmh: 9, rainProbabilityPct: 26, status: "normal" },
  { id: "pandare", name: "Pandare", lat: 18.23, lng: 74.58, elevationM: 552, rainfallMm: 47, temperatureC: 28, humidityPct: 79, windKmh: 15, rainProbabilityPct: 77, status: "heavy" },
  { id: "korhale", name: "Korhale", lat: 18.14, lng: 74.66, elevationM: 545, rainfallMm: 41, temperatureC: 29, humidityPct: 75, windKmh: 13, rainProbabilityPct: 69, status: "moderate" },
];

/* Existing Block-level forecast (input to downscaling) */
export const BLOCK_FORECAST = {
  block: "Baramati",
  district: "Pune",
  rainfallMm: 40,
  temperatureC: 29,
  humidityPct: 76,
  windKmh: 12,
  rainProbabilityPct: 60,
  issuedFor: "28 Sep 2026",
};

/* Dashboard KPIs (demo) */
export const DASHBOARD_KPIS = {
  panchayatsMonitored: 42,
  activeAlerts: 7,
  avgRainfallMm: 38.6,
  modelAccuracyPct: 89.4,
};

/* 5-day forecast generator (deterministic demo values) */
export interface DayForecast {
  day: string;
  rainfallMm: number;
  temperatureC: number;
  rainProbabilityPct: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function getFiveDayForecast(p: Panchayat): DayForecast[] {
  const seed = p.id.length + p.name.length;
  return DAYS.map((day, i) => ({
    day,
    rainfallMm: Math.max(2, Math.round(p.rainfallMm * (1 - i * 0.16) + ((seed * (i + 3)) % 7))),
    temperatureC: Math.round(p.temperatureC + ((seed + i) % 3) - 1),
    rainProbabilityPct: Math.min(95, Math.max(10, p.rainProbabilityPct - i * 9 + ((seed * i) % 6))),
  }));
}

/* Weather alerts (demo) */
export interface WeatherAlert {
  id: string;
  panchayat: string;
  condition: string;
  date: string;
  severity: "high" | "medium" | "info";
  action: string;
}

export const ALERTS: WeatherAlert[] = [
  { id: "a1", panchayat: "Nimbut", condition: "Very Heavy Rainfall Expected", date: "28 Sep 2026", severity: "high", action: "Monitor field drainage; avoid waterlogging-sensitive operations." },
  { id: "a2", panchayat: "Kanheri", condition: "Heavy Rainfall Expected", date: "28 Sep 2026", severity: "high", action: "Check drainage channels; postpone spraying operations." },
  { id: "a3", panchayat: "Pandare", condition: "High Rain Probability", date: "28 Sep 2026", severity: "medium", action: "Plan weather-sensitive activities with caution." },
  { id: "a4", panchayat: "Jalochi", condition: "Moderate Weather", date: "28 Sep 2026", severity: "info", action: "Routine monitoring recommended." },
  { id: "a5", panchayat: "Korhale", condition: "Moderate Rain Expected", date: "29 Sep 2026", severity: "info", action: "Review irrigation schedule." },
];

/* Agro-meteorological advisories (demo, generalized) */
export interface Advisory {
  id: string;
  type: "heavy-rain" | "low-rain" | "wind";
  title: string;
  text: string;
  appliesTo: string[];
}

export const ADVISORIES: Advisory[] = [
  {
    id: "adv1",
    type: "heavy-rain",
    title: "Heavy Rainfall Advisory",
    text: "Higher rainfall is expected in this Panchayat. Farmers should monitor field drainage and plan weather-sensitive agricultural operations accordingly.",
    appliesTo: ["Nimbut", "Kanheri", "Pandare"],
  },
  {
    id: "adv2",
    type: "low-rain",
    title: "Low Rainfall Advisory",
    text: "Lower rainfall is expected. Farmers may review irrigation requirements based on crop stage, soil condition and available water.",
    appliesTo: ["Gunawadi", "Medad"],
  },
  {
    id: "adv3",
    type: "wind",
    title: "Strong Wind Advisory",
    text: "Strong winds are possible. Farmers should monitor vulnerable crops and farm structures.",
    appliesTo: ["Nimbut"],
  },
];

export const ADVISORY_DISCLAIMER =
  "Advisory generated from forecast conditions and should be considered along with local agricultural guidance.";

/* Rainfall analysis: block vs downscaled vs observed (demo) */
export const RAINFALL_COMPARISON = PANCHAYATS.slice(0, 4).map((p) => ({
  name: p.name,
  blockForecast: BLOCK_FORECAST.rainfallMm,
  downscaled: p.rainfallMm,
  observed: Math.max(4, p.rainfallMm + ((p.id.length % 5) - 2) * 3),
}));

/* Model performance metrics (demo) */
export const MODEL_METRICS = {
  proposed: { mae: 4.2, rmse: 6.1, bias: -0.8, correlation: 0.91, f1: 0.86, csi: 0.74 },
  baseline: { mae: 9.7, rmse: 13.4, bias: -3.6, correlation: 0.68, f1: 0.61, csi: 0.45 },
};

export const PREDICTED_VS_ACTUAL = PANCHAYATS.map((p) => ({
  name: p.name,
  predicted: p.rainfallMm,
  actual: Math.max(4, p.rainfallMm + ((p.id.length % 5) - 2) * 3),
}));

export const ERROR_DISTRIBUTION = [
  { range: "-10 to -6 mm", count: 2 },
  { range: "-6 to -2 mm", count: 7 },
  { range: "-2 to 2 mm", count: 18 },
  { range: "2 to 6 mm", count: 11 },
  { range: "6 to 10 mm", count: 4 },
];

export const RAIN_EVENT_DETECTION = [
  { event: "No rain (<2.5mm)", correct: 34, missed: 3 },
  { event: "Light (2.5-15mm)", correct: 26, missed: 6 },
  { event: "Moderate (15-64mm)", correct: 19, missed: 4 },
  { event: "Heavy (>64mm)", correct: 6, missed: 2 },
];

/* Downscaling engine input feature groups */
export const MODEL_INPUTS = [
  {
    title: "Weather Forecast Data",
    items: ["Rainfall", "Temperature", "Humidity", "Wind"],
  },
  {
    title: "Historical Weather",
    items: ["Previous rainfall", "Temperature history", "Seasonal patterns"],
  },
  {
    title: "Geospatial Features",
    items: ["Latitude", "Longitude", "Elevation", "Terrain"],
  },
  {
    title: "Agricultural Context",
    items: ["Crop information", "Crop season", "Local conditions"],
  },
];

export const PIPELINE_STEPS = [
  "Historical Weather Data + Existing Forecast + Panchayat GIS Data + Terrain / Elevation + Spatial Features",
  "Data Preprocessing",
  "Feature Engineering",
  "ML Downscaling Model",
  "Panchayat-level Forecast",
  "Advisory Engine",
  "Dashboard",
];

export const DATA_SOURCES = [
  { title: "Weather / Forecast Data", description: "Existing weather forecast datasets", status: "Planned Integration" },
  { title: "Historical Weather", description: "Historical observations", status: "Planned Integration" },
  { title: "GIS", description: "Panchayat boundaries and geographic information", status: "Planned Integration" },
  { title: "Terrain", description: "Elevation / Digital Elevation Model", status: "Planned Integration" },
  { title: "Satellite / Spatial Data", description: "Satellite-derived environmental information where available", status: "Planned Integration" },
];
