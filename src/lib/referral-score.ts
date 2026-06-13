// The referral-prospecting scorer (planning/001-referral-prospecting-engine).
//
// Pure, deterministic, glass-box: given a prospect's features and a targeting
// profile, return a warmth score, a fit score, their product, and a per-signal
// breakdown explaining the number. The LLM never produces the score — it only
// narrates and drafts (later phases). Keeping ranking in plain code makes it
// cheap, testable, and inspectable.
//
// Phase 1 scope: proximity-based warmth + category-based fit, against a static
// default profile. Later phases add affiliation/declared-tie warmth signals,
// true ICP look-alike fit, and a *learned* profile that replaces the defaults.

export type ProximityTier = "plaza" | "block" | "corridor" | "town" | "none";

export type ProspectFeatures = {
  proximityTier: ProximityTier;
  distanceMeters: number | null;
  category: string | null;
  // Non-geographic warmth signals (declared ties, shared affiliations). Empty in P1.
  affiliations: string[];
};

export type TargetingProfile = {
  version: number;
  icpDescription: string;
  // Warmth weight per proximity tier (0..1).
  proximityWeights: Record<ProximityTier, number>;
  // Fit weight per OSM category (0..1). Missing categories fall back to default.
  categoryFit: Record<string, number>;
  defaultCategoryFit: number;
};

export type ScoreBreakdownItem = { signal: string; detail: string; contribution: number };

export type ProspectScore = {
  warmth: number; // 0..100 — does the customer likely know them
  fit: number; // 0..100 — are they a good customer
  combined: number; // 0..100 — warmth × fit
  tier: ProximityTier;
  breakdown: ScoreBreakdownItem[];
};

// The seed profile. Encodes Toprock's current book: owner-operated local
// service & retail. Phase 5's learning loop overwrites these from outcomes.
export const DEFAULT_TARGETING_PROFILE: TargetingProfile = {
  version: 0,
  icpDescription:
    "Owner-operated local service & retail businesses like the current book — fitness/recreation, health & wellness, specialty retail, and trades. Avoid chains, franchises, banks, and offices.",
  proximityWeights: { plaza: 1, block: 0.8, corridor: 0.55, town: 0.35, none: 0.15 },
  categoryFit: {
    // Strong fit — owner-run recreation / wellness / specialty retail / trades
    scuba_diving: 0.95,
    dive: 0.95,
    massage: 0.9,
    chiropractor: 0.9,
    fitness_centre: 0.9,
    gym: 0.9,
    sports: 0.85,
    health: 0.85,
    beauty: 0.85,
    hairdresser: 0.85,
    boutique: 0.8,
    musical_instrument: 0.8,
    clothes: 0.75,
    gift: 0.75,
    bakery: 0.7,
    hardware: 0.7,
    florist: 0.7,
    cafe: 0.6,
    coffee: 0.6,
    restaurant: 0.5,
    car_repair: 0.5,
    // Weak fit / avoid — chains, transactional, not our buyer
    hairdresser_supply: 0.45,
    fast_food: 0.2,
    fuel: 0.15,
    bank: 0.1,
    pharmacy: 0.3,
    government: 0.05,
    office: 0.25,
  },
  defaultCategoryFit: 0.5,
};

// Map a straight-line distance to a tier. plaza ≈ same unit/strip, block ≈ next
// door, corridor ≈ same commercial drag, town ≈ same area.
export function tierFromDistance(distanceMeters: number | null): ProximityTier {
  if (distanceMeters == null) return "none";
  if (distanceMeters <= 40) return "plaza";
  if (distanceMeters <= 150) return "block";
  if (distanceMeters <= 400) return "corridor";
  if (distanceMeters <= 2000) return "town";
  return "none";
}

const TIER_LABEL: Record<ProximityTier, string> = {
  plaza: "Same plaza",
  block: "Same block",
  corridor: "Same corridor",
  town: "Same area",
  none: "Nearby",
};

export function tierLabel(tier: ProximityTier): string {
  return TIER_LABEL[tier];
}

export function scoreProspect(
  features: ProspectFeatures,
  profile: TargetingProfile = DEFAULT_TARGETING_PROFILE,
): ProspectScore {
  const warmthFrac = profile.proximityWeights[features.proximityTier] ?? profile.proximityWeights.none;
  const categoryKey = (features.category ?? "").toLowerCase();
  const fitFrac = profile.categoryFit[categoryKey] ?? profile.defaultCategoryFit;

  const warmth = Math.round(warmthFrac * 100);
  const fit = Math.round(fitFrac * 100);
  const combined = Math.round(warmthFrac * fitFrac * 100);

  const breakdown: ScoreBreakdownItem[] = [
    {
      signal: "Proximity",
      detail: tierLabel(features.proximityTier) + (features.distanceMeters != null ? ` · ${features.distanceMeters}m` : ""),
      contribution: warmth,
    },
    {
      signal: "Business fit",
      detail: features.category ?? "unknown type",
      contribution: fit,
    },
  ];

  return { warmth, fit, combined, tier: features.proximityTier, breakdown };
}

// Convenience: derive features + score straight from a stored suggestion payload.
export function scoreFromPayload(
  payload: { category?: string | null; distanceMeters?: number | null },
  profile: TargetingProfile = DEFAULT_TARGETING_PROFILE,
): ProspectScore {
  const distanceMeters = payload.distanceMeters ?? null;
  return scoreProspect(
    {
      proximityTier: tierFromDistance(distanceMeters),
      distanceMeters,
      category: payload.category ?? null,
      affiliations: [],
    },
    profile,
  );
}
