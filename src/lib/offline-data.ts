/**
 * Built-in fallback used ONLY when the Flask backend is unreachable (Demo Mode).
 * Prototype / Demo Data — approximate sample values, not real observations.
 */
import { PANCHAYATS, getFiveDayForecast, type Panchayat, type RainStatus } from "./demo-data";

export interface GeoPanchayat extends Panchayat {
  block: string;
  district: string;
  state: string;
  blockRainfallMm: number;
  historicalMeanMm: number;
  anomaly: string;
  isLive: boolean;
  inputSource: string;
  elevationLive: boolean;
}
export interface Scope {
  state?: string | undefined;
  district?: string | undefined;
  block?: string | undefined;
}

export const statusOf = (mm: number): RainStatus =>
  mm < 25 ? "normal" : mm < 45 ? "moderate" : mm < 60 ? "heavy" : "severe";

const geo = (p: Panchayat, block: string, district: string, blockRain: number): GeoPanchayat => ({
  ...p, block, district, state: "Maharashtra", blockRainfallMm: blockRain, historicalMeanMm: 20, anomaly: "normal",
  isLive: false, inputSource: "offline-fallback", elevationLive: false,
});
// id, name, block, district, lat, lng, elev, rain, temp, hum, wind, prob
const EXTRA: [string, string, string, string, number, number, number, number, number, number, number, number][] = [
  ["lasalgaon", "Lasalgaon", "Niphad", "Nashik", 20.14, 74.24, 590, 33, 27, 74, 12, 62],
  ["pimpalgaon", "Pimpalgaon Baswant", "Niphad", "Nashik", 20.17, 73.98, 620, 48, 26, 80, 15, 79],
  ["vinchur", "Vinchur", "Niphad", "Nashik", 20.05, 74.27, 575, 22, 28, 70, 10, 44],
  ["ozar", "Ozar", "Niphad", "Nashik", 20.09, 73.94, 640, 55, 25, 83, 17, 85],
  ["shendurni", "Shendurni", "Jamner", "Jalgaon", 20.7, 75.8, 340, 14, 31, 64, 9, 30],
  ["pahur", "Pahur", "Jamner", "Jalgaon", 20.77, 75.63, 385, 27, 30, 69, 11, 52],
  ["neri", "Neri", "Jamner", "Jalgaon", 20.71, 75.75, 360, 19, 31, 66, 10, 38],
  ["lohara", "Lohara", "Jamner", "Jalgaon", 20.9, 75.84, 310, 9, 32, 60, 8, 24],
];

export const OFFLINE_ROWS: GeoPanchayat[] = [
  ...PANCHAYATS.map((p) => geo(p, "Baramati", "Pune", 40)),
  ...EXTRA.map(([id, name, block, district, lat, lng, elevationM, rainfallMm, temperatureC, humidityPct, windKmh, rainProbabilityPct]) =>
    geo({ id, name, lat, lng, elevationM, rainfallMm, temperatureC, humidityPct, windKmh, rainProbabilityPct, status: statusOf(rainfallMm) }, block, district, 32),
  ),
];

export const offlineScope = (s: Scope) =>
  OFFLINE_ROWS.filter((r) => (!s.district || r.district === s.district) && (!s.block || r.block === s.block));

export const offlineFiveDay = (id: string) => getFiveDayForecast(OFFLINE_ROWS.find((r) => r.id === id) ?? OFFLINE_ROWS[0]!);
