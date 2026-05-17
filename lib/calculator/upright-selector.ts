// Select cheapest adequate upright from BOTH Q235 and Q355 capacity tables
import { FRAME_CAPACITY } from './data/frame-capacity';
import { UPRIGHT_WEIGHTS } from './data/profiles';
import { SPACING, SAFETY_FACTOR, COST_REFERENCE, UPRIGHT_THICKNESS_THRESHOLD_KG, UPRIGHT_MIN_THICKNESS_HEAVY } from './config';
import { selectBracingType } from './bracing-calculator';
import type { UprightSelection } from './types';

export function selectUpright(params: {
  palletsPerLevel: number;
  beamLevels: number;
  loadPerPallet: number;
  palletDepth: number;
  palletHeight: number;
  firstBeamHeightMm: number;
  beamHeightMm: number;
  hasGroundLevel: boolean;
}): UprightSelection | null {
  const { palletsPerLevel, beamLevels, loadPerPallet, palletHeight, firstBeamHeightMm, beamHeightMm, hasGroundLevel } = params;

  // Total load per frame pair — includes ground level pallets
  const totalLevels = beamLevels + (hasGroundLevel ? 1 : 0);
  const totalLoadKg = palletsPerLevel * totalLevels * loadPerPallet * SAFETY_FACTOR;

  // Frame height
  const frameHeight = calculateFrameHeight(palletHeight, beamLevels, firstBeamHeightMm, beamHeightMm, hasGroundLevel);

  // 3. Beam load per level → thickness constraint
  const beamLoadPerLevel = palletsPerLevel * loadPerPallet * SAFETY_FACTOR;
  const requireMinThickness = beamLoadPerLevel > UPRIGHT_THICKNESS_THRESHOLD_KG;
  const minThickness = requireMinThickness ? UPRIGHT_MIN_THICKNESS_HEAVY : 0;

  // 4. Search BOTH Q235 and Q355
  const materials: ('Q235' | 'Q355')[] = ['Q235', 'Q355'];
  let best: {
    code: string;
    material: 'Q235' | 'Q355';
    info: { ctype: string; capacity: number };
    bracing: { type: 'D' | 'Z'; count: { horizontal: number; diagonal: number } };
    thickness: number;
    weightPerMeter: number;
    totalPriceCNY: number;
  } | null = null;

  for (const material of materials) {
    const gradeData = FRAME_CAPACITY[material];
    if (!gradeData) continue;

    const availableLevels = Object.keys(gradeData).map(Number).sort((a, b) => a - b);
    const heightKey = findCeilingLevel(availableLevels, frameHeight);

    // Frame capacity table doesn't use exact frameHeight — it uses "layer spacing" (层高)
    // which is the distance between beam levels.
    // For selective racking: levelSpacing = palletHeight + topClearance
    const levelSpacing = palletHeight + SPACING.topClearance;
    const spacingKey = findCeilingLevel(availableLevels, levelSpacing);

    const heightProfiles = gradeData[String(spacingKey) as keyof typeof gradeData];
    if (!heightProfiles) continue;

    // Filter to HD uprights (exclude 80×58 and Excel aliases)
    const hdProfiles = Object.entries(heightProfiles)
      .filter(([code]) => !code.includes('80*58') && !code.startsWith('='));

    for (const [code, info] of hdProfiles) {
      if (info.capacity < totalLoadKg) continue;

      // Look up profile weight
      const weightInfo = UPRIGHT_WEIGHTS[code];
      if (!weightInfo) continue;

      // Thickness constraint
      if (minThickness > 0 && weightInfo.thickness <= minThickness) continue;

      const frameWeight = weightInfo.weight * frameHeight / 1000;
      const bracing = selectBracingType(frameHeight, firstBeamHeightMm);
      // Bracing weight: diagonal ~ DE90/100/120 C-channel, horizontal same
      // Approximate: 1.0 kg/m for bracing, each piece ~0.8m average
      const bracingWeight = (bracing.count.diagonal + bracing.count.horizontal) * 0.8 * 1.0;
      const totalWeight = frameWeight + bracingWeight;

      const pricePerKg = material === 'Q235'
        ? COST_REFERENCE.q235PricePerKg
        : COST_REFERENCE.q355PricePerKg;
      const totalPriceCNY = totalWeight * pricePerKg;

      if (best === null || totalPriceCNY < best.totalPriceCNY) {
        best = {
          code,
          material,
          info,
          bracing,
          thickness: weightInfo.thickness,
          weightPerMeter: weightInfo.weight,
          totalPriceCNY,
        };
      }
    }
  }

  if (!best) return null;

  return {
    profileCode: best.code,
    material: best.material,
    ctype: best.info.ctype as 'D' | 'SF' | 'ZX',
    thicknessMm: best.thickness,
    weightPerMeter: best.weightPerMeter,
    frameHeightMm: frameHeight,
    requiredCapacityKg: totalLoadKg,
    tableCapacityKg: best.info.capacity,
    bracingType: best.bracing.type,
    bracingCount: best.bracing.count,
  };
}

/**
 * Calculate upright frame height.
 * With ground level: first beam at pallet.height, then beamLevels - 1 more levels above
 * Without ground level: first beam at firstBeamHeight, then levels - 1 more levels above
 * Top of frame = last beam bottom + beamHeight + topClearance
 */
function calculateFrameHeight(
  palletHeight: number,
  beamLevels: number,
  firstBeamHeightMm: number,
  beamHeightMm: number,
  hasGroundLevel: boolean
): number {
  if (beamLevels === 0) {
    // Only ground level — frame height = pallet height + top clearance
    return palletHeight + SPACING.topClearance;
  }

  let lastLevelBeamBottom: number;
  if (hasGroundLevel) {
    // With ground level: first beam at pallet.height
    lastLevelBeamBottom = palletHeight + (beamLevels - 1) * (palletHeight + SPACING.topClearance);
  } else {
    lastLevelBeamBottom = firstBeamHeightMm + (beamLevels - 1) * (palletHeight + SPACING.topClearance);
  }
  return lastLevelBeamBottom + beamHeightMm + SPACING.topClearance;
}

/**
 * Find smallest available level >= target (ceiling for safety).
 * If no level >= target exists, return the largest available.
 */
function findCeilingLevel(levels: number[], target: number): number {
  for (const level of levels) {
    if (level >= target) return level;
  }
  return levels[levels.length - 1];
}
