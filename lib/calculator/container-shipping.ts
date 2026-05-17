// Container shipping calculation
export const CONTAINER_CONFIG = {
  maxWeightKg: 25000,  // 25 tons per 40ft container
  fobCostUSD: 1500,    // $1500 FOB per container
};

export interface ShippingResult {
  containerCount: number;
  totalFOBUSD: number;
  totalWeightKg: number;
  weightPerContainer: number[];
}

export function calculateShipping(totalWeightKg: number): ShippingResult {
  const { maxWeightKg, fobCostUSD } = CONTAINER_CONFIG;
  const containerCount = Math.ceil(totalWeightKg / maxWeightKg);
  const totalFOBUSD = containerCount * fobCostUSD;

  const weightPerContainer: number[] = [];
  let remaining = totalWeightKg;
  for (let i = 0; i < containerCount; i++) {
    const w = Math.round(Math.min(remaining, maxWeightKg) * 100) / 100;
    weightPerContainer.push(w);
    remaining -= w;
  }

  return {
    containerCount,
    totalFOBUSD,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    weightPerContainer,
  };
}
