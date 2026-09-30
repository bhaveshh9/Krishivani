import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { Panchayat } from "@/lib/demo-data";
import type { MapLayer } from "./WeatherMap";

const WeatherMap = lazy(() => import("./WeatherMap"));

/** SSR-safe wrapper: Leaflet only renders in the browser. */
export function MapPanel({
  onSelect,
  selectedId,
  points,
  layer,
}: {
  onSelect?: ((p: Panchayat) => void) | undefined;
  selectedId?: string | undefined;
  points?: Panchayat[] | undefined;
  layer?: MapLayer | undefined;
}) {
  return (
    <ClientOnly
      fallback={
        <div className="flex h-[420px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-[420px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
            Loading map…
          </div>
        }
      >
        <WeatherMap onSelect={onSelect} selectedId={selectedId} {...(points ? { points } : {})} {...(layer ? { layer } : {})} />
      </Suspense>
    </ClientOnly>
  );
}
