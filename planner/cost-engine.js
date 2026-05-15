/*
 * RackingHub Planner — cost-engine.js
 * 钢材重量 × 材质单价 → 闭环报价引擎
 * 
 * 依赖：window.BOMEngine（BOM 输出）、window.formatCurrency（货币格式化）
 * 暴露：window.CostEngine.calc(bomResult, options) -> { breakdown, totalCNY, formatted }
 * 
 * 定价逻辑：
 * - 基准钢价：Q235B 热轧型钢 ~¥5.2/kg（含加工费）
 * - Q355B = Q235 × 1.15（材质溢价）
 * - 不同组件加工难度系数不同（立柱/横梁/斜撑加工成本递增）
 * - 表面处理：喷塑 +¥1.2/kg，镀锌 +¥2.5/kg
 * - 含 13% 增值税
 */

(function () {
    'use strict';

    var CostEngine = {

        // ===== 基础钢价（Q235B 热轧型钢，元/kg）=====
        BASE_STEEL_PRICE_Q235: 5.2,

        // ===== 材质溢价系数 =====
        MATERIAL_MULTIPLIERS: {
            'Q235': 1.0,
            'Q235B': 1.0,
            'Q355': 1.15,
            'Q355B': 1.15
        },

        // ===== 组件加工难度系数（反映不同部件的加工复杂度）=====
        PROCESSING_COEFFICIENTS: {
            'upright': 1.0,     // 立柱：标准冲孔+冷弯
            'beam': 1.15,       // 横梁：端头焊接+柱卡
            'brace': 1.35,      // 斜撑/横撑：切割+焊接量最大
            'basePlate': 0.85,  // 脚底板：简单冲压
            'accessory': 1.5    // 配件：小件加工费高
        },

        // ===== 表面处理单价（元/kg）=====
        SURFACE_TREATMENTS: {
            'none': 0,
            'powder': 1.2,     // 静电喷塑（默认）
            'galvanized': 2.5   // 热镀锌（防腐要求高）
        },

        // ===== 税率 =====
        VAT_RATE: 0.13,

        /**
         * 计算成本
         * @param {Object} bom - BOMEngine.calc() 返回的 { items, totals }
         * @param {Object} options - 可选参数
         *   material: 'Q235' | 'Q355' (默认 'Q235')
         *   surface: 'none' | 'powder' | 'galvanized' (默认 'powder')
         *   margin: 利润率 0.0-0.5 (默认 0.15，即 15%)
         *   freight: 运费估算系数 0.0-0.2 (默认 0.08)
         * @returns {Object} { breakdown, totalCNY, taxIncluded, formatted }
         */
        calc: function (bom, options) {
            options = options || {};
            var material = (options.material || 'Q235').toUpperCase();
            var surface = options.surface || 'powder';
            var margin = options.margin !== undefined ? options.margin : 0.15;
            var freightRate = options.freight !== undefined ? options.freight : 0.08;

            var materialMult = this.MATERIAL_MULTIPLIERS[material] || 1.0;
            var surfaceCost = this.SURFACE_TREATMENTS[surface] || 0;
            var basePrice = this.BASE_STEEL_PRICE_Q235 * materialMult;

            var breakdown = [];
            var subtotalCNY = 0;

            // 逐项计算 BOM 成本
            for (var i = 0; i < bom.items.length; i++) {
                var item = bom.items[i];
                var weight = parseFloat(item.totalWeight) || 0;
                if (weight <= 0) continue;

                // 识别组件类型
                var componentType = this._classifyComponent(item.category);
                var processingCoeff = this.PROCESSING_COEFFICIENTS[componentType] || 1.0;

                // 单项成本 = 重量 × (基准钢价 × 材质系数 × 加工系数 + 表面处理)
                var unitPricePerKg = basePrice * processingCoeff + surfaceCost;
                var itemCost = weight * unitPricePerKg;

                breakdown.push({
                    category: item.category,
                    profile: item.profile,
                    weightKg: weight,
                    unitPricePerKg: unitPricePerKg.toFixed(2),
                    costCNY: Math.round(itemCost * 100) / 100,
                    componentType: componentType
                });

                subtotalCNY += itemCost;
            }

            // 运费估算（按重量比例）
            var freightCost = subtotalCNY * freightRate;

            // 税前合计
            var preTaxTotal = subtotalCNY + freightCost;

            // 利润
            var profit = preTaxTotal * margin;

            // 含税总价
            var taxIncluded = (preTaxTotal + profit) * (1 + this.VAT_RATE);

            return {
                breakdown: breakdown,
                material: material,
                surface: surface,
                subtotalCNY: Math.round(subtotalCNY * 100) / 100,
                freightCNY: Math.round(freightCost * 100) / 100,
                profitCNY: Math.round(profit * 100) / 100,
                taxCNY: Math.round((preTaxTotal + profit) * this.VAT_RATE * 100) / 100,
                totalCNY: Math.round(taxIncluded),
                formatted: '',
                weightPerCNY: bom.totals.totalWeightKg > 0
                    ? (taxIncluded / bom.totals.totalWeightKg).toFixed(2)
                    : '0.00'
            };
        },

        /**
         * 格式化并更新 UI 显示
         * @param {Object} costResult - calc() 返回值
         */
        displayCost: function (costResult) {
            if (typeof window.formatCurrency === 'function') {
                costResult.formatted = window.formatCurrency(costResult.totalCNY);
            }

            // 更新 stats 面板中的成本显示
            this._updateStatsDisplay(costResult);

            return costResult;
        },

        /**
         * 从 BOM 参数直接计算并显示（便捷方法）
         */
        calcAndDisplay: function (bomResult, options) {
            var costResult = this.calc(bomResult, options);
            return this.displayCost(costResult);
        },

        // ===== 私有方法 =====

        _classifyComponent: function (category) {
            var cat = category.toLowerCase();
            if (cat.indexOf('upright') >= 0 || cat.indexOf('frame') >= 0) return 'upright';
            if (cat.indexOf('beam') >= 0 || cat.indexOf('step') >= 0) return 'beam';
            if (cat.indexOf('brace') >= 0 || cat.indexOf('arm') >= 0) return 'brace';
            if (cat.indexOf('base') >= 0 || cat.indexOf('plate') >= 0) return 'basePlate';
            return 'accessory';
        },

        _updateStatsDisplay: function (costResult) {
            // 更新 stats-panel 中的成本
            var costEl = document.getElementById('stats-estimated-cost');
            if (costEl) {
                costEl.textContent = costResult.formatted || window.formatCurrency(costResult.totalCNY);
            }

            // 如果有 BOM 明细区域，追加成本明细
            this._updateBOMCostSection(costResult);
        },

        _updateBOMCostSection: function (costResult) {
            var bomSection = document.getElementById('bom-load-check-section');
            if (!bomSection) return;

            // 移除旧的成本卡片（如果存在）
            var oldCard = document.getElementById('cost-summary-card');
            if (oldCard) oldCard.remove();

            // 插入成本卡片到 BOM 区域底部
            var html = '';
            html += '<div id="cost-summary-card" style="background:linear-gradient(135deg,#667eea22,#764ba222);border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;margin-top:1rem;">';
            html += '<h3 style="margin:0 0 0.75rem;font-size:1.1rem;color:#1a202c;">💰 Estimated Cost Breakdown</h3>';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;">';

            // 总价大字显示
            html += '<div style="grid-column:1/-1;text-align:center;padding:0.5rem 0;">';
            html += '<div style="font-size:0.85rem;color:#718096;">Total Estimated Price</div>';
            html += '<div style="font-size:2rem;font-weight:700;color:#667eea;">' + costResult.formatted + '</div>';
            html += '<div style="font-size:0.75rem;color:#a0aec0;">' + costResult.material + ' / ' +
                (costResult.surface === 'powder' ? 'Powder Coated' : costResult.surface === 'galvanized' ? 'Hot-dip Galvanized' : 'Raw') +
                ' / Incl. 13% VAT</div>';
            html += '</div>';

            // 分项明细
            var rows = [
                { label: 'Materials Cost', value: window.formatCurrency(costResult.subtotalCNY), detail: costResult.breakdown.length + ' components' },
                { label: 'Freight Est.', value: window.formatCurrency(costResult.freightCNY), detail: '~8% of materials' },
                { label: 'Margin', value: window.formatCurrency(costResult.profitCNY), detail: '15%' },
                { label: 'VAT (13%)', value: window.formatCurrency(costResult.taxCNY), detail: '' }
            ];

            for (var i = 0; i < rows.length; i++) {
                var r = rows[i];
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid #f0f0f0;">';
                html += '<span style="color:#718096;font-size:0.85rem;">' + r.label + '</span>';
                html += '<div style="text-align:right;"><strong style="font-size:0.95rem;">' + r.value + '</strong>';
                if (r.detail) {
                    html += '<br><span style="font-size:0.7rem;color:#a0aec0;">' + r.detail + '</span>';
                }
                html += '</div></div>';
            }

            // 单位成本
            html += '<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid #e2e8f0;text-align:center;">';
            html += '<span style="font-size:0.8rem;color:#718096;">Cost per kg: ¥' + costResult.weightPerCNY + '</span>';
            html += '</div>';

            html += '</div></div>';

            bomSection.insertAdjacentHTML('beforeend', html);
        }
    };

    window.CostEngine = CostEngine;
})();
