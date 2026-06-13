"use client";

import dynamic from "next/dynamic";
import type { MapCandidate, MapCompany } from "./leaflet-canvas";

// Leaflet touches `window` at module load, so the map must render client-only.
// A type-only import of the prop shapes is erased at build, so requiring this
// wrapper to be a client component is the only place ssr:false can live.
const LeafletCanvas = dynamic(() => import("./leaflet-canvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: "62vh", minHeight: 440 }}
      className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
    >
      Loading map…
    </div>
  ),
});

export function SourcingMap(props: {
  customers: MapCompany[];
  others: MapCompany[];
  candidates: MapCandidate[];
}) {
  return <LeafletCanvas {...props} />;
}
