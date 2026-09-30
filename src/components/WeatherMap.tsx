import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { PANCHAYATS, STATUS_META, type Panchayat } from "@/lib/demo-data";

export type MapLayer = "locations" | "rainfall" | "temperature" | "alerts" | "forecast-vs-actual";

/** Marker colour per layer. Forecast-vs-actual stays neutral: no real observations are connected. */
export function layerColor(p: Panchayat, layer: MapLayer): string {
  if (layer === "locations" || layer === "forecast-vs-actual") return layer === "locations" ? "#2f7d4f" : "#94a3b8";
  if (layer === "temperature") return p.temperatureC >= 30 ? "#d9731a" : p.temperatureC >= 27 ? "#c9a227" : "#3d9e57";
  if (layer === "alerts") return p.status === "heavy" || p.status === "severe" ? STATUS_META[p.status].hex : "#cbd5e1";
  return STATUS_META[p.status].hex;
}

function FitBounds({ points }: { points: Panchayat[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points.map((p) => [p.lat, p.lng] as [number, number]), { padding: [40, 40], maxZoom: 12 });
  }, [points, map]);
  return null;
}

/**
 * Interactive Panchayat weather map (Leaflet + OpenStreetMap).
 * Point locations only — no official boundaries are drawn (none are available in the prototype).
 * For hundreds of points, add clustering (e.g. react-leaflet-cluster) or viewport-based loading.
 * Values are prototype/demo data, not live government weather data.
 */
export default function WeatherMap({
  onSelect, selectedId, points = PANCHAYATS, layer = "rainfall",
}: {
  onSelect?: ((p: Panchayat) => void) | undefined;
  selectedId?: string | undefined;
  points?: Panchayat[];
  layer?: MapLayer;
}) {
  return (
    <MapContainer center={[18.17, 74.59]} zoom={11} className="agro-map" scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {points.map((p) => {
        const color = layerColor(p, layer);
        const isSelected = p.id === selectedId;
        const dim = layer === "alerts" && color === "#cbd5e1";
        return (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={isSelected ? 16 : dim ? 7 : 12}
            pathOptions={{ color: isSelected ? "#1d4ed8" : color, weight: isSelected ? 3 : 2, fillColor: color, fillOpacity: 0.6 }}
            eventHandlers={{ click: () => onSelect?.(p) }}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{p.name} Panchayat</strong><br />
                Rainfall: {p.rainfallMm} mm<br />
                Temperature: {p.temperatureC}°C<br />
                Humidity: {p.humidityPct}%<br />
                Rain Probability: {p.rainProbabilityPct}%<br />
                Risk: {STATUS_META[p.status].label}<br />
                <em style={{ fontSize: 11, color: "#777" }}>Prototype / Demo data</em>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
