// D-type and Z-type bracing algorithms

/**
 * D-type bracing: start at 300mm, alternate h→d every 600mm.
 * Add horizontal at top if remaining > 200mm.
 */
export function calculateDBracing(frameHeightMm: number): { horizontal: number; diagonal: number } {
  const nDiagonal = Math.floor((frameHeightMm - 300) / 600);
  const hTop = 300 + 600 * nDiagonal;
  const hRemain = frameHeightMm - hTop;
  const nHorizontal = 1 + (hRemain > 0 ? 1 : 0) + (hRemain > 200 ? 1 : 0);
  return { horizontal: nHorizontal, diagonal: nDiagonal };
}

/**
 * Z-type bracing: below first beam, start at 300, last diagonal crosses beam.
 * Above first beam: D-type from where diagonal lands.
 */
export function calculateZBracing(
  frameHeightMm: number,
  firstBeamHeightMm: number
): { horizontal: number; diagonal: number } {
  const nDiagBelow = Math.floor((firstBeamHeightMm - 300) / 600) + 1;
  const hCross = 300 + 600 * nDiagBelow;

  const hAbove = frameHeightMm - hCross;
  const nDiagAbove = Math.floor(hAbove / 600);
  const hTopAbove = hCross + 600 * nDiagAbove;
  const hRemainAbove = frameHeightMm - hTopAbove;
  const nHorizAbove = 1 + (hRemainAbove > 0 ? 1 : 0) + (hRemainAbove > 200 ? 1 : 0);

  const nHorizBelow = nDiagBelow + 1;

  return {
    horizontal: nHorizBelow + nHorizAbove,
    diagonal: nDiagBelow + nDiagAbove,
  };
}

/** Auto-decide D vs Z based on first beam height */
export function selectBracingType(
  frameHeightMm: number,
  firstBeamHeightMm: number
): { type: 'D' | 'Z'; count: { horizontal: number; diagonal: number } } {
  if (firstBeamHeightMm <= 300) {
    return { type: 'D', count: calculateDBracing(frameHeightMm) };
  }
  return { type: 'Z', count: calculateZBracing(frameHeightMm, firstBeamHeightMm) };
}
