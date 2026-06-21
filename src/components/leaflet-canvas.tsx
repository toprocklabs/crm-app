"use client";

import "leaflet/dist/leaflet.css";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { Fragment, useEffect, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { approveSuggestion, dismissSuggestion, scanCustomerForReferrals } from "@/app/actions";

export type MapCompany = {
  id: number;
  name: string;
  stage: string;
  lat: number;
  lng: number;
  address: string | null;
};

export type MapCandidate = {
  id: number;
  name: string;
  category: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distanceMeters: number | null;
  nearCompanyName: string | null;
  // Referral scores (warmth × fit), computed in src/lib/referral-score.ts.
  combined: number;
  warmth: number;
  fit: number;
  tierLabel: string;
};

// Matches the sourcing radius in scripts/source-nearby.mjs.
const SOURCING_RADIUS_M = 250;

const COLOR_CUSTOMER = "#185FA5";
const COLOR_ACCOUNT = "#888780";

// Color a candidate pin by its combined referral score.
function candidateColor(combined: number) {
  if (combined >= 66) return "#1D9E75"; // strong
  if (combined >= 40) return "#BA7517"; // medium
  return "#888780"; // weak
}

// Fit the viewport to everything we plotted once, on mount.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

// Hand the live map instance back to the parent so marker clicks can fly to it.
function CaptureMap({ mapRef }: { mapRef: { current: LeafletMap | null } }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

// Zoom level a single-pin click flies to (street level).
const FOCUS_ZOOM = 17;

export default function LeafletCanvas({
  customers,
  others,
  candidates,
}: {
  customers: MapCompany[];
  others: MapCompany[];
  candidates: MapCandidate[];
}) {
  const points: [number, number][] = [
    ...customers.map((c) => [c.lat, c.lng] as [number, number]),
    ...others.map((c) => [c.lat, c.lng] as [number, number]),
    ...candidates.map((c) => [c.lat, c.lng] as [number, number]),
  ];
  const center: [number, number] = points[0] ?? [40.5223, -111.9531];

  const mapRef = useRef<LeafletMap | null>(null);
  // Click a pin → smoothly zoom in to it (at least street level) and open it,
  // so you don't have to scroll-zoom manually.
  const focusMarker = (lat: number, lng: number, e: LeafletMouseEvent) => {
    const map = mapRef.current;
    if (map) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
    }
    (e.target as { openPopup?: () => void }).openPopup?.();
  };

  return (
    // Own stacking context so Leaflet's high internal z-indexes stay scoped
    // and never paint over the app's sidebar / mobile drawer.
    <div style={{ position: "relative", zIndex: 0, isolation: "isolate" }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        style={{ height: "62vh", minHeight: 440, width: "100%", borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <CaptureMap mapRef={mapRef} />

        {customers.map((c) => (
          <Fragment key={`cust-${c.id}`}>
            <Circle
              center={[c.lat, c.lng]}
              radius={SOURCING_RADIUS_M}
              pathOptions={{ color: COLOR_CUSTOMER, weight: 1, fillColor: COLOR_CUSTOMER, fillOpacity: 0.06, dashArray: "5 4" }}
            />
            <CircleMarker
              center={[c.lat, c.lng]}
              radius={8}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: COLOR_CUSTOMER, fillOpacity: 1 }}
              eventHandlers={{
                // Reveal the "find more nearby" action on hover; it stays open
                // so you can click it (closes when you click elsewhere).
                mouseover: (e: LeafletMouseEvent) =>
                  (e.target as { openPopup?: () => void }).openPopup?.(),
                click: (e: LeafletMouseEvent) => focusMarker(c.lat, c.lng, e),
              }}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.name}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#475569" }}>
                    Customer{c.address ? ` • ${c.address}` : ""}
                  </p>
                  <form action={scanCustomerForReferrals}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <button
                      type="submit"
                      style={{ background: "#185FA5", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", width: "100%" }}
                    >
                      Find more businesses nearby
                    </button>
                  </form>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        ))}

        {others.map((c) => (
          <CircleMarker
            key={`acct-${c.id}`}
            center={[c.lat, c.lng]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: COLOR_ACCOUNT, fillOpacity: 1 }}
            eventHandlers={{ click: (e: LeafletMouseEvent) => focusMarker(c.lat, c.lng, e) }}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569", textTransform: "capitalize" }}>
                  {c.stage.replace(/_/g, " ")}
                  {c.address ? ` • ${c.address}` : ""}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {candidates.map((c) => (
          <CircleMarker
            key={`cand-${c.id}`}
            center={[c.lat, c.lng]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: candidateColor(c.combined), fillOpacity: 1 }}
            eventHandlers={{ click: (e: LeafletMouseEvent) => focusMarker(c.lat, c.lng, e) }}
          >
            <Popup>
              <div style={{ minWidth: 190 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.name}</p>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: candidateColor(c.combined) }}>{c.combined}</span>
                </div>
                {c.category ? (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569", textTransform: "capitalize" }}>{c.category}</p>
                ) : null}
                {c.address ? <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>{c.address}</p> : null}
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                  {c.tierLabel}
                  {c.distanceMeters != null ? ` · ${c.distanceMeters}m` : ""} from {c.nearCompanyName ?? "a customer"}
                </p>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  warmth {c.warmth} · fit {c.fit}
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <form action={approveSuggestion}>
                    <input type="hidden" name="suggestionId" value={c.id} />
                    <button
                      type="submit"
                      style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}
                    >
                      Add as lead
                    </button>
                  </form>
                  <form action={dismissSuggestion}>
                    <input type="hidden" name="suggestionId" value={c.id} />
                    <button
                      type="submit"
                      style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer" }}
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
