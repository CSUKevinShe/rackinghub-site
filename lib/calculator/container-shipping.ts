// Container shipping calculation
// FOB: ¥10,000 CNY per 40ft container (Shanghai Port)
export const CONTAINER_CONFIG = {
  maxWeightKg: 25000,          // 25 tons per 40ft container
  fobCostCNY: 10000,           // ¥10,000 CNY FOB per container (Shanghai Port)
};

export interface ShippingResult {
  containerCount: number;
  totalFOBCNY: number;         // FOB cost in CNY
  totalFOBDisplay: number;     // FOB cost converted to display currency
  totalWeightKg: number;
  weightPerContainer: number[];
}

export function calculateShipping(totalWeightKg: number, exchangeRate: number = 7.25): ShippingResult {
  const { maxWeightKg, fobCostCNY } = CONTAINER_CONFIG;
  const containerCount = Math.ceil(totalWeightKg / maxWeightKg);
  const totalFOBCNY = containerCount * fobCostCNY;
  const totalFOBDisplay = totalFOBCNY / exchangeRate;

  const weightPerContainer: number[] = [];
  let remaining = totalWeightKg;
  for (let i = 0; i < containerCount; i++) {
    const w = Math.round(Math.min(remaining, maxWeightKg) * 100) / 100;
    weightPerContainer.push(w);
    remaining -= w;
  }

  return {
    containerCount,
    totalFOBCNY: Math.round(totalFOBCNY),
    totalFOBDisplay: Math.round(totalFOBDisplay * 100) / 100,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    weightPerContainer,
  };
}
