/*
 * 计算引擎
 * 对应 Notion《报价系统 HTML 重构》笔记第十二节归纳出的两种通用成本公式：
 *
 * 模板A（自制件）：
 *   单件成本 = 重量 × (材料单价×损耗系数 + 工费×1.13 + 喷塑单价 + 标准件换算单价) / 1.13
 *   行成本   = 单件成本 × 数量
 *
 * 模板B（采购件/标准件）：
 *   单件成本 = 采购含税单价×损耗系数/1.13(材料增值税13%) + 运费含税单价/1.06(运费增值税6%)
 *   行成本   = 单件成本 × 数量
 *
 * 复合产品 = 若干条 A/B 行相加，由模板的 lines 数组表达。
 */

const VAT_MATERIAL = 1.13; // 材料/工费增值税 13%
const VAT_FREIGHT = 1.06; // 运费增值税 6%

function calcLineA(f) {
  const weight = Number(f.weight) || 0;
  const materialPrice = Number(f.materialPrice) || 0;
  const buffer = Number(f.buffer) || 1;
  const laborPrice = Number(f.laborPrice) || 0;
  const coatingPrice = Number(f.coatingPrice) || 0;
  const standardPartPrice = Number(f.standardPartPrice) || 0;
  const qty = Number(f.qty) || 0;

  const unitCost =
    (weight * (materialPrice * buffer + laborPrice * VAT_MATERIAL + coatingPrice + standardPartPrice)) /
    VAT_MATERIAL;

  return {
    unitCost,
    unitWeight: weight,
    lineCost: unitCost * qty,
    lineWeight: weight * qty,
    qty,
  };
}

function calcLineB(f) {
  const unitPriceInclTax = Number(f.unitPriceInclTax) || 0;
  const buffer = Number(f.buffer) || 1;
  const freightPriceInclTax = Number(f.freightPriceInclTax) || 0;
  const qty = Number(f.qty) || 0;

  const unitCost = (unitPriceInclTax * buffer) / VAT_MATERIAL + freightPriceInclTax / VAT_FREIGHT;

  return {
    unitCost,
    unitWeight: 0,
    lineCost: unitCost * qty,
    lineWeight: 0,
    qty,
  };
}

function calcLine(formula, fields) {
  if (formula === "A") return calcLineA(fields);
  if (formula === "B") return calcLineB(fields);
  throw new Error(`未知公式类型: ${formula}`);
}

/**
 * 计算一个"产品条目"（模板实例）：把模板里的每一行(line)按填好的参数算出成本，求和。
 * entry = { templateId, category: "self-made"|"purchased", lines: [{ key, formula, fields }] }
 */
function calcEntry(entry) {
  const lineResults = entry.lines.map((line) => ({
    key: line.key,
    label: line.label,
    ...calcLine(line.formula, line.fields),
  }));

  const totalCost = lineResults.reduce((sum, r) => sum + r.lineCost, 0);
  const totalWeight = lineResults.reduce((sum, r) => sum + r.lineWeight, 0);

  return { lineResults, totalCost, totalWeight };
}

/**
 * 订单汇总：对四层管道里的第④层 —— 订单通用聚合。
 * entries: 已计算过的产品条目数组，每项需带 category ("self-made"|"purchased") 和 calc({totalCost, totalWeight})
 * settings: quote/data/settings.json 内容
 */
function calcOrder(entries, settings) {
  const summary = {
    totalWeight: 0,
    totalMaterialCost: 0, // 未加价的成本合计
    selfMadeCost: 0,
    purchasedCost: 0,
    saleAmount: 0, // 加价后的销售额（未含物流）
  };

  for (const e of entries) {
    summary.totalWeight += e.calc.totalWeight;
    summary.totalMaterialCost += e.calc.totalCost;
    if (e.category === "purchased") {
      summary.purchasedCost += e.calc.totalCost;
      summary.saleAmount += e.calc.totalCost * (settings.markup.purchased || 1);
    } else {
      summary.selfMadeCost += e.calc.totalCost;
      summary.saleAmount += e.calc.totalCost * (settings.markup.selfMade || 1);
    }
  }

  const capacityKg = settings.container.capacityKg || 1;
  const containerCount = summary.totalWeight > 0 ? Math.ceil(summary.totalWeight / capacityKg) : 0;

  const logi = settings.logisticsPerContainer || {};
  const logisticsCost =
    containerCount *
    ((Number(logi.packingFee) || 0) +
      (Number(logi.loadingFee) || 0) +
      (Number(logi.trailerFee) || 0) +
      (Number(logi.fobFee) || 0) +
      (Number(logi.seaFreight) || 0) +
      (Number(logi.otherFee) || 0));

  const totalCost = summary.totalMaterialCost + logisticsCost;
  const saleAmountWithLogistics = summary.saleAmount + logisticsCost;
  const profit = saleAmountWithLogistics - totalCost;
  const profitMargin = saleAmountWithLogistics > 0 ? profit / saleAmountWithLogistics : 0;

  return {
    ...summary,
    containerCount,
    logisticsCost,
    totalCost,
    saleAmount: saleAmountWithLogistics,
    profit,
    profitMargin,
  };
}

/**
 * 总额对账：把"各行加价后单价"四舍五入到 step 之后，分项合计与理论总额的尾差补到最后一行，
 * 防止打印后逐项相加 ≠ 总额。返回调整后的每行报价（含调整量）。
 */
function reconcileRounding(lineAmounts, step) {
  const rounded = lineAmounts.map((v) => Math.round(v / step) * step);
  const theoreticalTotal = lineAmounts.reduce((a, b) => a + b, 0);
  const roundedTotal = rounded.reduce((a, b) => a + b, 0);
  const diff = theoreticalTotal - roundedTotal;
  if (rounded.length > 0) {
    rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + diff) / step) * step;
  }
  return rounded;
}

if (typeof module !== "undefined") {
  module.exports = { calcLineA, calcLineB, calcLine, calcEntry, calcOrder, reconcileRounding };
}
