/*
 * RackingHub Planner — bom-engine.js
 * Bill of Materials calculator using real steel profiles from Excel data.
 * 
 * Dependencies: window.PROFILES (profiles.js), LayoutEngine (layout-engine.js)
 * Exposes: window.BOMEngine.calc(params) -> { items, totals }
 */

(function () {
    'use strict';

    var BOMEngine = {

        /**
         * Calculate BOM from layout parameters.
         * @param {Object} params - LayoutEngine.params
         * @returns {Object} { items: [], totals: { uprightCount, beamCount, braceCount, basePlateCount, totalWeightKg, totalCostCNY } }
         */
        calc: function (params) {
            var p = params;
            var rows = BOMEngine._calcRackGeometry(p);
            var items = [];
            var totals = {
                uprightCount: 0, beamCount: 0, braceCount: 0,
                basePlateCount: 0, totalWeightKg: 0, totalCostCNY: 0
            };

            // ===== 损耗系数（生产备料冗余） =====
            var COEFFICIENTS = {
                upright: 1.03,   // 立柱 3% 余量（切割损耗+备件）
                beam:    1.02,   // 横梁 2% 余量（标准件为主）
                brace:   1.05,   // 横斜撑 5% 余量（切割最多，zigzag结构）
                basePlate: 1.02  // 脚底板 2% 余量
            };

            // 1. Uprights (立柱)
            var uprightSetsRaw = (rows.baysPerRow + 1) * 2 * rows.totalRows;
            var uprightSets = Math.ceil(uprightSetsRaw * COEFFICIENTS.upright);
            totals.uprightCount = uprightSets;
            var uprightTotalLen = uprightSets * uprightLength;
            var uprightTotalWeight = uprightTotalLen * uprightWeightPerM;

            items.push({
                category: 'Upright (立柱)',
                profile: uprightProfile,
                unit: 'piece',
                unitLength: uprightLength + 'm',
                quantity: uprightSets,
                quantityRaw: uprightSetsRaw,
                coefficient: COEFFICIENTS.upright,
                weightPerUnit: (uprightLength * uprightWeightPerM).toFixed(2) + ' kg',
                totalWeight: uprightTotalWeight.toFixed(1)
            });
            totals.totalWeightKg += uprightTotalWeight;

            // 2. Base plates (脚底板)
            var basePlatesRaw = uprightSetsRaw;
            var basePlates = Math.ceil(basePlatesRaw * COEFFICIENTS.basePlate);
            totals.basePlateCount = basePlates;
            items.push({
                category: 'Base Plate (脚底板)',
                profile: 'Standard',
                unit: 'piece',
                quantity: basePlates,
                quantityRaw: basePlatesRaw,
                coefficient: COEFFICIENTS.basePlate,
                weightPerUnit: '~1.5 kg',
                totalWeight: (basePlates * 1.5).toFixed(1)
            });
            totals.totalWeightKg += basePlates * 1.5;

            // 3. Beams (横梁)
            var beamProfile = p.beamProfile || 'B120*50';
            var beamSpan = BOMEngine._calcBeamSpan(p);
            var beamWeightPerM = BOMEngine._getProfileWeight(beamProfile);
            var beamsPerBay = rows.isBackToBack ? 3 : 2;
            var totalBeamsRaw = rows.totalRows * rows.baysPerRow * p.levels * beamsPerBay;
            var totalBeams = Math.ceil(totalBeamsRaw * COEFFICIENTS.beam);
            totals.beamCount = totalBeams;
            var beamLenM = beamSpan / 1000;
            var beamTotalWeight = totalBeams * beamLenM * beamWeightPerM;

            items.push({
                category: 'Beam (横梁)',
                profile: beamProfile,
                unit: 'piece',
                unitSpan: beamSpan + 'mm',
                quantity: totalBeams,
                quantityRaw: totalBeamsRaw,
                coefficient: COEFFICIENTS.beam,
                weightPerUnit: (beamLenM * beamWeightPerM).toFixed(2) + ' kg',
                totalWeight: beamTotalWeight.toFixed(1)
            });
            // 4. Braces (横斜撑) — Z型斜撑结构
            //    从底部到首层横梁上方，每300mm一根横撑，之间zigzag斜撑连接
            var braceProfile = p.braceProfile || '40*20(1.5)';
            var braceWeightPerM = BOMEngine._getProfileWeight(braceProfile);
            var rackDepthM = (p.rackDepth || 1.0); // 货架深度（米）
            var firstBeamHeightM = (p.firstBeamHeight || 2.5); // 首层横梁高度（米）
            var braceVerticalSpacing = 0.3; // 横撑间距 300mm
            var braceLenM = Math.sqrt(rackDepthM * rackDepthM + braceVerticalSpacing * braceVerticalSpacing);
            var horizontalBracesPerFace = Math.ceil(firstBeamHeightM / braceVerticalSpacing) + 1; // 含底+横梁位
            var diagonalBracesPerFace = horizontalBracesPerFace - 1; // zigzag连接
            var braceTotalLenPerFace = horizontalBracesPerFace * rackDepthM + diagonalBracesPerFace * braceLenM;
            // 柱片面数
            var frameFaces = (rows.baysPerRow + 1) * rows.totalRows * (rows.isBackToBack ? 2 : 1);
            var totalBraceLen = frameFaces * braceTotalLenPerFace;
            var totalBraceWeight = totalBraceLen * braceWeightPerM;
            // 斜撑出厂标准长度一般2.5-3m，按2.5m/根估算
            var braceStandardLen = 2.5;
            var bracePiecesRaw = Math.ceil(totalBraceLen / braceStandardLen);
            var bracePieces = Math.ceil(bracePiecesRaw * COEFFICIENTS.brace);
            totals.braceCount = bracePieces;

            items.push({
                category: 'Brace (横斜撑)',
                profile: braceProfile,
                unit: 'piece (~' + braceStandardLen + 'm)',
                quantity: bracePieces,
                quantityRaw: bracePiecesRaw,
                coefficient: COEFFICIENTS.brace,
                weightPerUnit: '~' + (braceStandardLen * braceWeightPerM).toFixed(2) + ' kg',
                totalWeight: totalBraceWeight.toFixed(1),
                _detail: '横撑' + horizontalBracesPerFace + '+斜撑' + diagonalBracesPerFace + '/面 × ' + frameFaces + '面 (300mm间距, 斜撑' + braceLenM.toFixed(2) + 'm)'
            });
            totals.totalWeightKg += totalBraceWeight;

            // 5. Pallet supports / K-beams (K梁/P梁) — optional, for wire mesh decking
            // Skip for now, add when user configures

            // Summary
            totals.totalWeightKg = Math.round(totals.totalWeightKg * 10) / 10;

            return { items: items, totals: totals, geometry: rows };
        },

        // ===== Private helpers =====

        _calcRackGeometry: function (p) {
            var preset = { rackWidth: 2.7, rackDepth: 1.0 };
            if (typeof LayoutEngine !== 'undefined' && LayoutEngine.params) {
                var lp = LayoutEngine.params;
                var RACKING_PRESETS = {
                    'selective-heavy': { rackDepth: 1.0, rackWidth: 2.7 },
                    'drive-in': { rackDepth: 1.0, rackWidth: 2.4 },
                    'radio-shuttle': { rackDepth: 1.0, rackWidth: 2.7 }
                };
                var ps = RACKING_PRESETS[lp.rackingType] || RACKING_PRESETS['selective-heavy'];
                preset.rackDepth = ps.rackDepth;
                preset.rackWidth = ps.rackWidth;
            }

            var clearL = p.clearanceLeft || 0.5;
            var clearR = p.clearanceRight || 0.5;
            var clearF = p.clearanceFront || 0.5;
            var clearB = p.clearanceBack || 0.5;
            var usableWidth = (p.warehouseWidth || 40) - clearF - clearB - 4;
            var usableLength = (p.warehouseLength || 60) - clearL - clearR - 5;
            var aisleW = p.aisleWidth || 3.2;
            var backToBackGap = (p.backToBackGap || 200) / 1000;
            var blockDepth = preset.rackDepth * 2 + backToBackGap;

            var totalRows = Math.floor((usableWidth + aisleW) / (blockDepth + aisleW));
            totalRows = Math.max(1, Math.min(totalRows, 12));
            var baysPerRow = Math.floor(usableLength / preset.rackWidth);
            baysPerRow = Math.max(1, Math.min(baysPerRow, 30));

            return {
                totalRows: totalRows,
                baysPerRow: baysPerRow,
                isBackToBack: true,
                blockDepth: blockDepth,
                aisleWidth: aisleW
            };
        },

        _getProfileWeight: function (profileName) {
            if (typeof window !== 'undefined' && window.PROFILES && window.PROFILES[profileName]) {
                return window.PROFILES[profileName].weight || 0;
            }
            // Fallback defaults by category
            var defaults = {
                '立柱': 8.0, 'K梁（横梁）': 5.0, '横斜撑': 1.5,
                '脚底板': 1.5, '方管': 3.0, '矩管': 4.0,
                'P梁': 4.5, '悬臂底座': 6.0, '悬臂立柱': 7.0,
                '中型柱卡': 2.5, '重型柱卡': 3.0, '垫板': 0.5, 'F90H4CB': 2.0
            };
            // Try to match by category substring
            if (typeof window !== 'undefined' && window.PROFILES) {
                for (var name in window.PROFILES) {
                    if (name.indexOf(profileName) >= 0) {
                        return window.PROFILES[name].weight || 0;
                    }
                }
            }
            return defaults[profileName] || 5.0;
        },

        _calcBeamSpan: function (p) {
            // Beam span = bay width (rack width) in mm
            var bayWidth = 2.7; // default meters
            if (typeof LayoutEngine !== 'undefined' && LayoutEngine.params) {
                var RACKING_PRESETS = {
                    'selective-heavy': { rackWidth: 2.7 },
                    'drive-in': { rackWidth: 2.4 },
                    'radio-shuttle': { rackWidth: 2.7 }
                };
                var ps = RACKING_PRESETS[LayoutEngine.params.rackingType];
                if (ps) bayWidth = ps.rackWidth;
            }
            return Math.round(bayWidth * 1000); // mm
        }
    };

    window.BOMEngine = BOMEngine;
})();
