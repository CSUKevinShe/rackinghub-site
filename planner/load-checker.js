/*
 * RackingHub Planner — load-checker.js
 * Structural load verification engine using real Excel capacity data.
 * 
 * Dependencies: window.FRAME_CAPACITY (frame-capacity.js), window.BEAM_CAPACITY (beam-capacity.js)
 * Exposes: window.LoadChecker.check(params) -> { frameOK, beamOK, warnings: [], details: {} }
 * 
 * Rules:
 * - Q355 capacity = Q235 capacity × 1.25 (already pre-calculated in frame-capacity.js)
 * - SF/Z braces: +6% stability bonus vs D-type
 * - Beam deflection limit: L/200 or ≤ 15mm (whichever is stricter)
 * - E = 210,000 MPa (steel)
 */

(function () {
    'use strict';

    var LoadChecker = {

        E_MODULUS: 210000, // MPa
        DEFLECTION_LIMIT_RATIO: 200, // L/200
        DEFLECTION_ABSOLUTE_MAX: 15, // mm

        /**
         * Check structural loads against capacity data.
         * @param {Object} params - Layout params + selected profiles
         *   - uprightProfile: e.g. '100*70(2.5)'
         *   - beamProfile: e.g. 'B120*50'
         *   - material: 'Q235' | 'Q355'
         *   - firstBeamHeight: first level beam height in meters (e.g. 2.5)
         *   - palletWeight: max pallet load in kg (per position)
         *   - palletsPerLevel: pallets per bay per level
         *   - levels: number of levels
         *   - warehouseHeight: total warehouse height in meters
         * @returns {Object} { frameOK, beamOK, warnings, details }
         */
        check: function (params) {
            var result = {
                frameOK: true,
                beamOK: true,
                warnings: [],
                details: {}
            };

            var uprightProfile = params.uprightProfile || '100*70(2.5)';
            var beamProfile = params.beamProfile || 'B120*50';
            var material = params.material || 'Q235';
            var firstBeamHeight = params.firstBeamHeight || 2.5;
            var palletWeight = params.palletWeight || 1000; // kg per pallet position
            var palletsPerLevel = params.palletsPerLevel || 2;
            var levels = params.levels || 4;
            var warehouseHeight = params.warehouseHeight || 6;

            // ===== 1. Frame (upright) capacity check =====
            var frameCheck = LoadChecker._checkFrameCapacity(
                uprightProfile, material, firstBeamHeight, palletWeight, palletsPerLevel, levels, warehouseHeight
            );
            result.details.frame = frameCheck;

            if (!frameCheck.ok) {
                result.frameOK = false;
                result.warnings.push('⚠️ 立柱承重不足: 最大承载 ' + LoadChecker._formatKg(frameCheck.maxCapacity) +
                    '，实际需求 ' + LoadChecker._formatKg(frameCheck.demand) + '（超载 ' +
                    Math.round((frameCheck.demand - frameCheck.maxCapacity) / frameCheck.demand * 100) + '%）');
            }

            // ===== 2. Beam deflection check =====
            var beamSpan = LoadChecker._calcBeamSpan();
            var beamCheck = LoadChecker._checkBeamDeflection(beamProfile, beamSpan, palletWeight, palletsPerLevel);
            result.details.beam = beamCheck;

            if (!beamCheck.ok) {
                result.beamOK = false;
                result.warnings.push('⚠️ 横梁挠度超标: 实际 ' + beamCheck.deflection.toFixed(1) +
                    'mm，允许 ' + beamCheck.limit.toFixed(1) + 'mm');
            } else if (beamCheck.utilization > 0.8) {
                result.warnings.push('⚡ 横梁挠度接近限值 (' + Math.round(beamCheck.utilization * 100) +
                    '%)，建议升级横梁规格');
            }

            // ===== 3. Beam capacity check =====
            var beamCapCheck = LoadChecker._checkBeamCapacity(beamProfile, beamSpan, palletWeight, palletsPerLevel);
            result.details.beamCapacity = beamCapCheck;

            if (!beamCapCheck.ok) {
                result.beamOK = false;
                result.warnings.push('⚠️ 横梁承重不足: 允许 ' + LoadChecker._formatKg(beamCapCheck.capacity) +
                    '，实际 ' + LoadChecker._formatKg(beamCapCheck.demand));
            }

            return result;
        },

        // ===== Private: Frame capacity check =====
        _checkFrameCapacity: function (profileName, material, firstBeamHeight, palletWeight, palletsPerLevel, levels, warehouseHeight) {
            if (typeof window === 'undefined' || !window.FRAME_CAPACITY) {
                return { ok: true, note: 'Frame capacity data not loaded' };
            }

            var fc = window.FRAME_CAPACITY;
            if (!fc[material]) {
                return { ok: true, note: 'Material ' + material + ' not found' };
            }

            // Find closest height in the data
            var firstHeightMM = Math.round(firstBeamHeight * 1000);
            var heights = Object.keys(fc[material]).map(Number).sort(function (a, b) { return a - b; });
            if (heights.length === 0) return { ok: true, note: 'No height data' };

            // Find nearest height
            var nearestHeight = heights[0];
            for (var i = 0; i < heights.length; i++) {
                if (Math.abs(heights[i] - firstHeightMM) < Math.abs(nearestHeight - firstHeightMM)) {
                    nearestHeight = heights[i];
                }
            }

            var heightData = fc[material][String(nearestHeight)];
            if (!heightData || !heightData[profileName]) {
                // Try partial match
                var found = null;
                for (var key in heightData) {
                    if (key.indexOf(profileName) >= 0) { found = key; break; }
                }
                if (!found) {
                    return { ok: true, note: 'Profile ' + profileName + ' not found at ' + nearestHeight + 'mm' };
                }
                profileName = found;
            }

            var profileData = heightData[profileName];
            var capacityPerPair = profileData.capacity; // kg per pair of uprights
            var ctype = profileData.ctype; // 'D', 'SF', etc.

            // SF/Z type gets +6% stability bonus
            if (ctype === 'SF' || ctype === 'Z') {
                capacityPerPair = Math.round(capacityPerPair * 1.06);
            }

            // Calculate total demand on the frame
            // Each bay has palletsPerLevel pallets per level
            // Total pallet weight per bay level = palletWeight × palletsPerLevel
            // Total load on one frame = sum of all levels above
            // Worst case: bottom level carries all above
            var totalDemand = 0;
            for (var lvl = 0; lvl < levels; lvl++) {
                totalDemand += palletWeight * palletsPerLevel;
            }

            // Add self-weight of beams and structure (rough estimate ~10%)
            totalDemand = Math.round(totalDemand * 1.15);

            // Capacity is per PAIR of uprights (one frame side)
            // Each bay has 2 sides (left + right frame), each side is a pair
            // So total capacity per bay = capacityPerPair × 2
            var maxCapacity = capacityPerPair * 2;

            return {
                ok: totalDemand <= maxCapacity,
                profile: profileName,
                ctype: ctype,
                material: material,
                firstHeight: nearestHeight + 'mm',
                maxCapacity: maxCapacity,
                demand: totalDemand,
                utilization: Math.round(totalDemand / maxCapacity * 100) / 100
            };
        },

        // ===== Private: Beam deflection check =====
        _checkBeamDeflection: function (beamModel, spanMM, palletWeight, palletsPerLevel) {
            if (typeof window === 'undefined' || !window.BEAM_CAPACITY) {
                return { ok: true, note: 'Beam capacity data not loaded' };
            }

            var bc = window.BEAM_CAPACITY;
            var beam = bc[beamModel];
            if (!beam) {
                // Try partial match
                for (var key in bc) {
                    if (key.indexOf(beamModel) >= 0) { beam = bc[key]; beamModel = key; break; }
                }
            }
            if (!beam || !beam.I_cm4) {
                return { ok: true, note: 'Beam ' + beamModel + ' I_cm4 not available' };
            }

            // UDL equivalent load per beam
            // Each beam carries palletWeight × palletsPerLevel / 2 (two beams per bay)
            var loadPerBeam = palletWeight * palletsPerLevel / 2; // kg
            var P = loadPerBeam * 9.81; // N
            var L = spanMM; // mm
            var E = LoadChecker.E_MODULUS; // MPa (N/mm²)
            var I = beam.I_cm4 * 10000; // cm4 -> mm4

            if (I <= 0) {
                return { ok: true, note: 'Beam ' + beamModel + ' has I_cm4 = 0, skipping deflection' };
            }

            // UDL deflection: δ = 5PL³ / (384EI)
            var deflection = (5 * P * L * L * L) / (384 * E * I);
            var limitRatio = L / LoadChecker.DEFLECTION_LIMIT_RATIO; // L/200
            var limit = Math.min(limitRatio, LoadChecker.DEFLECTION_ABSOLUTE_MAX);

            return {
                ok: deflection <= limit,
                model: beamModel,
                I_cm4: beam.I_cm4,
                span: spanMM,
                loadPerBeam: loadPerBeam,
                deflection: deflection,
                limit: limit,
                utilization: Math.round(deflection / limit * 100) / 100
            };
        },

        // ===== Private: Beam capacity check =====
        _checkBeamCapacity: function (beamModel, spanMM, palletWeight, palletsPerLevel) {
            if (typeof window === 'undefined' || !window.BEAM_CAPACITY) {
                return { ok: true, note: 'Beam capacity data not loaded' };
            }

            var bc = window.BEAM_CAPACITY;
            var beam = bc[beamModel];
            if (!beam) {
                for (var key in bc) {
                    if (key.indexOf(beamModel) >= 0) { beam = bc[key]; beamModel = key; break; }
                }
            }
            if (!beam || !beam.spans) {
                return { ok: true, note: 'No span data for ' + beamModel };
            }

            var loadPerBeam = palletWeight * palletsPerLevel / 2; // kg per beam

            // Find closest span in data
            var spans = Object.keys(beam.spans).map(Number).sort(function (a, b) { return a - b; });
            var closestSpan = spans[0];
            for (var i = 0; i < spans.length; i++) {
                if (Math.abs(spans[i] - spanMM) < Math.abs(closestSpan - spanMM)) {
                    closestSpan = spans[i];
                }
            }

            var capacity = beam.spans[String(closestSpan)];
            if (!capacity) {
                // Linear interpolation between adjacent spans
                capacity = LoadChecker._interpolateBeamCapacity(beam.spans, spanMM);
                if (capacity === null) {
                    return { ok: true, note: 'Cannot determine capacity for span ' + spanMM };
                }
            }

            return {
                ok: loadPerBeam <= capacity,
                model: beamModel,
                span: closestSpan,
                demand: loadPerBeam,
                capacity: capacity,
                utilization: Math.round(loadPerBeam / capacity * 100) / 100
            };
        },

        // ===== Private: Linear interpolation for beam capacity =====
        _interpolateBeamCapacity: function (spansObj, targetSpan) {
            var spans = Object.keys(spansObj).map(Number).sort(function (a, b) { return a - b; });
            if (targetSpan <= spans[0]) return spansObj[String(spans[0])];
            if (targetSpan >= spans[spans.length - 1]) return spansObj[String(spans[spans.length - 1])];

            for (var i = 0; i < spans.length - 1; i++) {
                if (spans[i] <= targetSpan && spans[i + 1] >= targetSpan) {
                    var s1 = spans[i], s2 = spans[i + 1];
                    var c1 = spansObj[String(s1)], c2 = spansObj[String(s2)];
                    return c1 + (c2 - c1) * (targetSpan - s1) / (s2 - s1);
                }
            }
            return null;
        },

        // ===== Private: Calculate beam span from layout =====
        _calcBeamSpan: function () {
            if (typeof LayoutEngine !== 'undefined' && LayoutEngine.params) {
                var RACKING_PRESETS = {
                    'selective-heavy': { rackWidth: 2.7 },
                    'selective-medium': { rackWidth: 2.5 },
                    'drive-in': { rackWidth: 2.4 },
                    'radio-shuttle': { rackWidth: 2.7 },
                    'vna': { rackWidth: 2.4 },
                    'push-back': { rackWidth: 2.4 }
                };
                var ps = RACKING_PRESETS[LayoutEngine.params.rackingType];
                if (ps) return Math.round(ps.rackWidth * 1000);
            }
            return 2700; // default 2.7m
        },

        // ===== Private: Format kg =====
        _formatKg: function (kg) {
            if (kg >= 1000) return (kg / 1000).toFixed(1) + ' 吨';
            return kg + ' kg';
        }
    };

    window.LoadChecker = LoadChecker;
})();
