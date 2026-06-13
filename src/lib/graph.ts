import { getDb } from "@/lib/db";
import { companies, contacts, relationships } from "@/lib/schema";
import type { EdgeType, EntityType } from "@/lib/schema";

// A node in the trust graph is a company or a contact, addressed as "type:id".
export type NodeKey = `${EntityType}:${number}`;

export function nodeKey(type: EntityType, id: number): NodeKey {
  return `${type}:${id}`;
}

export function parseNodeKey(key: NodeKey): { type: EntityType; id: number } {
  const [type, id] = key.split(":");
  return { type: type as EntityType, id: Number(id) };
}

type NodeMeta = {
  key: NodeKey;
  type: EntityType;
  id: number;
  label: string;
  // Only set for companies — used to find "anchor" customers and prospects.
  stage?: string;
  // For contacts, the company they belong to (so a contact inherits trust).
  companyId?: number | null;
};

type Adjacency = Map<
  NodeKey,
  Array<{ to: NodeKey; strength: number; edgeType: EdgeType; evidence: string | null }>
>;

export type LoadedGraph = {
  nodes: Map<NodeKey, NodeMeta>;
  adjacency: Adjacency;
};

type Db = NonNullable<ReturnType<typeof getDb>>;

// Load the entire graph into memory. The dataset is small (single-tenant CRM),
// so one pass beats N round-trips during traversal.
export async function loadGraph(db: Db): Promise<LoadedGraph> {
  const [companyRows, contactRows, edgeRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name, stage: companies.stage }).from(companies),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        companyId: contacts.companyId,
      })
      .from(contacts),
    db.select().from(relationships),
  ]);

  const nodes = new Map<NodeKey, NodeMeta>();

  for (const row of companyRows) {
    const key = nodeKey("company", row.id);
    nodes.set(key, { key, type: "company", id: row.id, label: row.name, stage: row.stage });
  }

  for (const row of contactRows) {
    const key = nodeKey("contact", row.id);
    nodes.set(key, {
      key,
      type: "contact",
      id: row.id,
      label: `${row.firstName} ${row.lastName}`.trim(),
      companyId: row.companyId,
    });
  }

  const adjacency: Adjacency = new Map();
  const addEdge = (
    from: NodeKey,
    to: NodeKey,
    strength: number,
    edgeType: EdgeType,
    evidence: string | null,
  ) => {
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from)!.push({ to, strength, edgeType, evidence });
  };

  for (const edge of edgeRows) {
    const from = nodeKey(edge.fromType, edge.fromId);
    const to = nodeKey(edge.toType, edge.toId);
    // Trust is mutual for traversal: walk the edge in both directions.
    addEdge(from, to, edge.strength, edge.edgeType, edge.evidence);
    addEdge(to, from, edge.strength, edge.edgeType, edge.evidence);

    // A contact belonging to a company implicitly bridges to that company,
    // so a relationship to a person also warms the company they work at.
  }

  // Wire each contact to its company with a strong implicit edge.
  for (const row of contactRows) {
    if (!row.companyId) {
      continue;
    }
    const personKey = nodeKey("contact", row.id);
    const companyKey = nodeKey("company", row.companyId);
    if (!nodes.has(companyKey)) {
      continue;
    }
    addEdge(personKey, companyKey, 80, "knows", "works at");
    addEdge(companyKey, personKey, 80, "knows", "works at");
  }

  return { nodes, adjacency };
}

export type WarmPathStep = {
  from: NodeKey;
  to: NodeKey;
  edgeType: EdgeType;
  strength: number;
  evidence: string | null;
};

export type WarmPath = {
  anchorKey: NodeKey;
  anchorLabel: string;
  targetKey: NodeKey;
  targetLabel: string;
  hops: number;
  // Weakest link along the chain (a path is only as warm as its coldest edge).
  minStrength: number;
  warmth: "high" | "medium" | "low";
  pathLabels: string[];
  steps: WarmPathStep[];
  suggestedAsk: string;
};

// Dijkstra cost: prefer stronger edges and fewer hops. Strength 100 -> cost 1,
// strength 0 -> cost 101. Every hop adds a fixed penalty so short warm chains win.
const HOP_PENALTY = 25;
function edgeCost(strength: number) {
  return 101 - Math.max(0, Math.min(100, strength)) + HOP_PENALTY;
}

function warmthTier(hops: number, minStrength: number): WarmPath["warmth"] {
  if (hops <= 1 && minStrength >= 60) return "high";
  if (hops <= 2 && minStrength >= 40) return "medium";
  return "low";
}

function buildAsk(anchorLabel: string, targetLabel: string, firstStepFromAnchor: WarmPathStep | null) {
  const edge = firstStepFromAnchor?.edgeType;
  if (edge === "colocated_with") {
    return `${anchorLabel} shares a location with ${targetLabel}. Ask your contact at ${anchorLabel} to walk you over or make a neighbor intro.`;
  }
  if (edge === "referred_by" || edge === "introduced_by") {
    return `${anchorLabel} already bridged you to ${targetLabel} once. Ask them to make a warm intro.`;
  }
  if (edge === "vendor_of" || edge === "customer_of" || edge === "partner_of") {
    return `${anchorLabel} does business with ${targetLabel}. Ask for an intro on the back of that working relationship.`;
  }
  return `Ask ${anchorLabel} to introduce you to ${targetLabel} — you already have their trust.`;
}

/**
 * Find the warmest trust paths from a target node back to "anchor" customers
 * (companies you've already won). Returns ranked paths, best first.
 */
export async function findWarmPaths(
  db: Db,
  targetType: EntityType,
  targetId: number,
  opts: { limit?: number } = {},
): Promise<WarmPath[]> {
  const limit = opts.limit ?? 3;
  const { nodes, adjacency } = await loadGraph(db);
  const start = nodeKey(targetType, targetId);
  const startMeta = nodes.get(start);
  if (!startMeta) {
    return [];
  }

  // Anchors = won customers other than the target itself.
  const anchorKeys = new Set<NodeKey>();
  for (const meta of nodes.values()) {
    if (meta.type === "company" && meta.stage === "customer" && meta.key !== start) {
      anchorKeys.add(meta.key);
    }
  }
  if (anchorKeys.size === 0) {
    return [];
  }

  // Dijkstra from the target across the whole graph.
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, WarmPathStep>();
  dist.set(start, 0);
  const visited = new Set<NodeKey>();

  // Small graph -> linear-scan priority selection is fine.
  while (visited.size < nodes.size) {
    let current: NodeKey | null = null;
    let currentDist = Infinity;
    for (const [key, d] of dist) {
      if (!visited.has(key) && d < currentDist) {
        current = key;
        currentDist = d;
      }
    }
    if (current === null) {
      break;
    }
    visited.add(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) {
        continue;
      }
      const next = currentDist + edgeCost(edge.strength);
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, {
          from: current,
          to: edge.to,
          edgeType: edge.edgeType,
          strength: edge.strength,
          evidence: edge.evidence,
        });
      }
    }
  }

  const results: WarmPath[] = [];
  for (const anchorKey of anchorKeys) {
    if (!dist.has(anchorKey)) {
      continue; // unreachable
    }
    // Reconstruct the path target -> anchor by walking prev links from anchor.
    const steps: WarmPathStep[] = [];
    let cursor: NodeKey | undefined = anchorKey;
    while (cursor && cursor !== start) {
      const step = prev.get(cursor);
      if (!step) {
        break;
      }
      steps.push(step);
      cursor = step.from;
    }
    if (cursor !== start) {
      continue; // broken chain
    }
    // steps currently go anchor -> ... -> target; reverse to target -> anchor.
    steps.reverse();
    const hops = steps.length;
    const minStrength = steps.reduce((min, s) => Math.min(min, s.strength), 100);
    const pathKeys = [start, ...steps.map((s) => s.to)];
    const pathLabels = pathKeys.map((k) => nodes.get(k)?.label ?? k);
    // The step touching the anchor is the last one (its `to` is the anchor).
    const firstStepFromAnchor = steps[steps.length - 1] ?? null;

    results.push({
      anchorKey,
      anchorLabel: nodes.get(anchorKey)?.label ?? anchorKey,
      targetKey: start,
      targetLabel: startMeta.label,
      hops,
      minStrength,
      warmth: warmthTier(hops, minStrength),
      pathLabels,
      steps,
      suggestedAsk: buildAsk(
        nodes.get(anchorKey)?.label ?? "your customer",
        startMeta.label,
        firstStepFromAnchor,
      ),
    });
  }

  results.sort((a, b) => a.hops - b.hops || b.minStrength - a.minStrength);
  return results.slice(0, limit);
}

// ---- Proximity (the "plaza neighbors" play) ----

export type ProximityNeighbor = {
  id: number;
  name: string;
  stage: string;
  distanceMeters: number | null;
  sharedPlaza: boolean;
};

const EARTH_RADIUS_M = 6_371_000;
function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Find companies physically near a given company: same plaza key, or within a
 * radius (default 150m) when both have coordinates. This surfaces "you own a
 * beachhead here, here are the neighbors you haven't contacted."
 */
export async function findProximityNeighbors(
  db: Db,
  companyId: number,
  opts: { radiusMeters?: number } = {},
): Promise<ProximityNeighbor[]> {
  const radius = opts.radiusMeters ?? 150;
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      stage: companies.stage,
      lat: companies.lat,
      lng: companies.lng,
      plazaKey: companies.plazaKey,
    })
    .from(companies);

  const self = rows.find((r) => r.id === companyId);
  if (!self) {
    return [];
  }

  const neighbors: ProximityNeighbor[] = [];
  for (const row of rows) {
    if (row.id === companyId) {
      continue;
    }
    const sharedPlaza = Boolean(self.plazaKey && row.plazaKey && self.plazaKey === row.plazaKey);
    let distance: number | null = null;
    if (self.lat != null && self.lng != null && row.lat != null && row.lng != null) {
      distance = haversineMeters(self.lat, self.lng, row.lat, row.lng);
    }
    const withinRadius = distance != null && distance <= radius;
    if (sharedPlaza || withinRadius) {
      neighbors.push({
        id: row.id,
        name: row.name,
        stage: row.stage,
        distanceMeters: distance,
        sharedPlaza,
      });
    }
  }

  neighbors.sort((a, b) => {
    if (a.sharedPlaza !== b.sharedPlaza) {
      return a.sharedPlaza ? -1 : 1;
    }
    return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
  });
  return neighbors;
}
