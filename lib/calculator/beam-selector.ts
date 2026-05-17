// Select cheapest adequate beam from capacity table
import { BEAM_CAPACITY } from './data/beam-capacity';
import { PROFILES } from './data/profiles';
import { SPACING, SAFETY_FACTOR, COST_REFERENCE } from './config';
import type { BeamSelection } from './types';

export function selectBeam(params: {
  palletsPerLevel: number;
  palletWidth: number;
  loadPerPallet: number;
}): BeamSelection | null {
  const { palletsPerLevel, palletWidth, loadPerPallet } = params;

  // 1. Effective span
  const effectiveSpan =
    palletsPerLevel * palletWidth +
    (palletsPerLevel - 1) * SPACING.palletToPallet +
    2 * SPACING.palletToUpright;

  // 2. Required capacity per level
  const requiredKg = palletsPerLevel * loadPerPallet * SAFETY_FACTOR;

  // 3. Sort by I_cm4 ascending (smallest first, cheapest)
  const profileOrder = Object.entries(BEAM_CAPACITY)
    .sort((a, b) => a[1].I_cm4 - b[1].I_cm4);

  let best: {
    code: string;
    data: typeof BEAM_CAPACITY[string];
    capacityKg: number;
    profileWeightPerMeter: number;
    priceCNY: number;
  } | null = null;

  for (const [code, data] of profileOrder) {
    const capacityKg = getCapacityAtSpan(data.spans, effectiveSpan);
    if (capacityKg === null || capacityKg < requiredKg) continue;

    const profile = findProfileMatch(code);
    if (!profile?.weight) continue;

    const beamWeight = profile.weight * effectiveSpan / 1000;
    const priceCNY = beamWeight * COST_REFERENCE.q235PricePerKg;

    if (best === null || priceCNY < best.priceCNY) {
      best = { code, data, capacityKg, profileWeightPerMeter: profile.weight, priceCNY };
    }
  }

  if (!best) return null;

  return {
    profileCode: best.code,
    heightMm: best.data.height_mm,
    thicknessMm: best.data.thickness_mm,
    effectiveSpanMm: effectiveSpan,
    requiredCapacityKg: requiredKg,
    tableCapacityKg: best.capacityKg,
    weightPerMeter: best.profileWeightPerMeter,
  };
}

/** Interpolate or lookup capacity at given span */
function getCapacityAtSpan(
  spans: Record<string, number>,
  targetSpan: number
): number | null {
  const entries = Object.entries(spans)
    .map(([k, v]) => ({ span: parseInt(k), load: v }))
    .sort((a, b) => a.span - b.span);

  // Exact match
  const exact = entries.find(e => e.span === targetSpan);
  if (exact) return exact.load;

  // Interpolate
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].span < targetSpan && entries[i + 1].span > targetSpan) {
      const s1 = entries[i].span, l1 = entries[i].load;
      const s2 = entries[i + 1].span, l2 = entries[i + 1].load;
      return l1 + (l2 - l1) * (targetSpan - s1) / (s2 - s1);
    }
  }

  // Beyond range — return last value (conservative for shorter spans)
  // or null for longer spans
  if (targetSpan <= entries[0].span) return entries[0].load;
  // Beyond max span — extrapolate with L^3 relationship (conservative: use min)
  return null;
}

/** Map beam capacity code to profile weight */
function findProfileMatch(beamCode: string): { weight: number } | null {
  // Extract dimensions: "B160*50_t1.8" or "T80*40_t2.0" or "B150*50_t1.5"
  const match = beamCode.match(/[BT]?(\d+)\*?(\d+)_t([\d.]+)/);
  if (!match) return null;

  const height = parseInt(match[1]);
  const width = parseInt(match[2]);

  // Search PROFILES for matching Step Beam profile
  const key = `${height}x${width}`;
  const profile = PROFILES[key];
  if (profile && ['Box Beam', 'Step Beam', 'HS Beam'].includes(profile.category) && profile.weight !== undefined) {
    return { weight: profile.weight };
  }

  return null;
}
