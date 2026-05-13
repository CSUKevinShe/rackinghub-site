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

            // 1. Uprights (立柱) — 每排两端各1组柱片, back-to-back算2列
            var uprightProfile = p.uprightProfile || '100*70(2.5)'; // default
            var uprightLength = p.warehouseHeight || 6; // meters total height
            var uprightWeightPerM = BOMEngine._getProfileWeight(uprightProfile);
            var uprightsPerFrame = 2; // each frame has 2 uprights (left+right)
            // Each bay needs 2 uprights on left/right, shared between adjacent bays
            // Total uprights = (baysPerRow + 1) * 2 sides * rows * (backToBack ? 2 : 1)
            var uprightSets = (rows.baysPerRow + 1) * 2 * rows.totalRows;
            totals.uprightCount = uprightSets;
            var uprightTotalLen = uprightSets * uprightLength; // meters
            var uprightTotalWeight = uprightTotalLen * uprightWeightPerM;

            items.push({
                category: 'Upright (立柱)',
                profile: uprightProfile,
                unit: 'piece',
                unitLength: uprightLength + 'm',
                quantity: uprightSets,
                weightPerUnit: (uprightLength * uprightWeightPerM).toFixed(2) + ' kg',
                totalWeight: uprightTotalWeight.toFixed(1)
            });
            totals.totalWeightKg += uprightTotalWeight;

            // 2. Base plates (脚底板) — 每根立柱底部1个
            totals.basePlateCount = uprightSets;
            items.push({
                category: 'Base Plate (脚底板)',
                profile: 'Standard',
                unit: 'piece',
                quantity: uprightSets,
                weightPerUnit: '~1.5 kg',
                totalWeight: (uprightSets * 1.5).toFixed(1)
            });
            totals.totalWeightKg += uprightSets * 1.5;

            // 3. Beams (横梁) — 每层每bay需要2根横梁(前后), back-to-back共享中间
            var beamProfile = p.beamProfile || 'B120*50'; // default
            var beamSpan = BOMEngine._calcBeamSpan(p); // mm
            var beamWeightPerM = BOMEngine._getProfileWeight(beamProfile);
            // Each bay per level needs 2 beams (front+back for single rack)
            // For back-to-back: each bay needs 3 beams (front+middle+back)
            var beamsPerBay = rows.isBackToBack ? 3 : 2;
            var totalBeams = rows.totalRows * rows.baysPerRow * p.levels * beamsPerBay;
            totals.beamCount = totalBeams;
            var beamLenM = beamSpan / 1000;
            var beamTotalWeight = totalBeams * beamLenM * beamWeightPerM;

            items.push({
                category: 'Beam (横梁)',
                profile: beamProfile,
                unit: 'piece',
                unitSpan: beamSpan + 'mm',
                quantity: totalBeams,
                weightPerUnit: (beamLenM * beamWeightPerM).toFixed(2) + ' kg',
                totalWeight: beamTotalWeight.toFixed(1)
            });
            totals.totalWeightKg += beamTotalWeight;

            // 4. Braces (横斜撑) — 每个柱片面需要
            var braceProfile = p.braceProfile || '40*20(1.5)';
            var braceWeightPerM = BOMEngine._getProfileWeight(braceProfile);
            // Each frame face has braces: (levels + 1) horizontal + levels diagonal
            // Total brace length per face ≈ rackWidth * (levels * 2 + 1)
            var braceLenPerFace = (p.warehouseHeight || 6) * 1.5; // approximate
            var frameFaces = uprightSets; // each upright position has a face
            var totalBraceLen = frameFaces * braceLenPerFace;
            var totalBraceWeight = totalBraceLen * braceWeightPerM;
            // Estimate number of brace pieces (assume ~1m each)
            var bracePieces = Math.ceil(totalBraceLen / 1.0);
            totals.braceCount = bracePieces;

            items.push({
                category: 'Brace (横斜撑)',
                profile: braceProfile,
                unit: 'piece (~1m)',
                quantity: bracePieces,
                weightPerUnit: '~' + braceWeightPerM.toFixed(2) + ' kg',
                totalWeight: totalBraceWeight.toFixed(1)
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
