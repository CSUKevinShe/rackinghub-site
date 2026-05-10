/*
 * RackingHub Planner — layout-engine.js
 * Parameterized 2D warehouse layout engine with real-time Canvas rendering
 * Chinese comments, English UI text
 */

(function () {
    'use strict';

    // ===== Racking type presets =====
    var RACKING_PRESETS = {
        'selective-heavy': {
            name: 'Heavy-Duty Selective',
            aisleWidth: 3.2,
            rackDepth: 1.0,
            rackWidth: 2.7,
            color: '#1a365d',
            storageDensity: 0.35
        },
        'selective-medium': {
            name: 'Medium-Duty Selective',
            aisleWidth: 3.0,
            rackDepth: 0.9,
            rackWidth: 2.5,
            color: '#2c5282',
            storageDensity: 0.38
        },
        'drive-in': {
            name: 'Drive-In Racking',
            aisleWidth: 3.0,
            rackDepth: 1.0,
            rackWidth: 2.4,
            color: '#1e3a5f',
            storageDensity: 0.75
        },
        'radio-shuttle': {
            name: 'Radio Shuttle',
            aisleWidth: 3.0,
            rackDepth: 1.0,
            rackWidth: 2.7,
            color: '#1a365d',
            storageDensity: 0.70
        },
        'vna': {
            name: 'VNA Racking',
            aisleWidth: 1.8,
            rackDepth: 1.0,
            rackWidth: 2.4,
            color: '#163050',
            storageDensity: 0.55
        },
        'push-back': {
            name: 'Push-Back Racking',
            aisleWidth: 3.2,
            rackDepth: 1.0,
            rackWidth: 2.4,
            color: '#1a365d',
            storageDensity: 0.55
        }
    };

    // ===== Debounce helper =====
    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    // ===== Layout Engine =====
    var LayoutEngine = {

        // Current state
        params: {
            warehouseLength: 60,   // meters
            warehouseWidth: 40,    // meters
            rackingType: 'selective-heavy',
            aisleWidth: 3.2,       // meters (overridden by preset)
            levels: 4,             // number of levels
            palletsPerLevel: 3,    // pallets per bay
            entrancePosition: 'bottom-left' // entrance corner
        },

        // Cached results
        stats: {
            totalPositions: 0,
            spaceUtilization: 0,
            rackBlockCount: 0,
            aisleCount: 0,
            estimatedCostCNY: 0
        },

        // Computed layout rows (for rendering)
        rows: [],

        // ===== Update a parameter and trigger redraw =====
        setParam: function (key, value) {
            this.params[key] = value;

            // If racking type changed, apply preset defaults
            if (key === 'rackingType' && RACKING_PRESETS[value]) {
                var preset = RACKING_PRESETS[value];
                this.params.aisleWidth = preset.aisleWidth;
            }

            this.calculate();
        },

        // ===== Core calculation: compute rack positions and stats =====
        calculate: function () {
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var rackD = preset.rackDepth;
            var rackW = preset.rackWidth;

            // Double-sided rack block depth: two racks back-to-back + 0.8m gap
            var blockDepth = rackD * 2 + 0.8;

            // Unit width along the aisle: one bay width
            var bayWidth = rackW;

            // How many rack rows (horizontal strips) fit in warehouse width
            // Each row = blockDepth + aisleW, except last row only needs blockDepth
            // Leave 2m margin on each side for safety/walls
            var usableWidth = p.warehouseWidth - 4; // 2m each side
            var rowsNeeded = Math.floor((usableWidth + aisleW) / (blockDepth + aisleW));
            rowsNeeded = Math.max(1, Math.min(rowsNeeded, 12));

            // How many bays per row fit in warehouse length
            // Leave 3m at entrance end for loading zone
            var usableLength = p.warehouseLength - 5; // 3m entrance zone + 2m end
            var baysPerRow = Math.floor(usableLength / bayWidth);
            baysPerRow = Math.max(1, Math.min(baysPerRow, 30));

            // Calculate pallet positions per bay
            // Each bay = palletsPerLevel (horizontal) * levels (vertical)
            var positionsPerBay = p.palletsPerLevel * p.levels;

            // Total positions: rows * 2 (double-sided) * baysPerRow * positionsPerBay
            var totalPositions = rowsNeeded * 2 * baysPerRow * positionsPerBay;

            // Space utilization: rack area / total warehouse area
            var rackArea = rowsNeeded * 2 * baysPerRow * rackD * bayWidth;
            var totalArea = p.warehouseLength * p.warehouseWidth;
            var utilization = Math.round((rackArea / totalArea) * 100);
            utilization = Math.min(utilization, 80);

            // Estimated cost (rough CNY per position)
            var pricePerPosition = {
                'selective-heavy': 120,
                'selective-medium': 85,
                'drive-in': 150,
                'radio-shuttle': 200,
                'vna': 280,
                'push-back': 220
            };
            var costPerPos = pricePerPosition[p.rackingType] || 120;
            var estimatedCost = totalPositions * costPerPos;

            // Build row data for rendering
            this.rows = [];
            var offsetY = 2; // 2m margin from top wall
            for (var i = 0; i < rowsNeeded; i++) {
                this.rows.push({
                    index: i,
                    y: offsetY,
                    blockDepth: blockDepth,
                    baysPerRow: baysPerRow,
                    aisleAfter: i < rowsNeeded - 1 // aisle after this row (except last)
                });
                offsetY += blockDepth;
                if (i < rowsNeeded - 1) {
                    offsetY += aisleW;
                }
            }

            // Cache stats
            this.stats = {
                totalPositions: totalPositions,
                spaceUtilization: utilization,
                rackBlockCount: rowsNeeded,
                aisleCount: Math.max(0, rowsNeeded - 1),
                estimatedCostCNY: estimatedCost,
                baysPerRow: baysPerRow,
                positionsPerBay: positionsPerBay,
                rowsNeeded: rowsNeeded
            };
        },

        // ===== Draw 2D top-down view on Canvas =====
        draw: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;

            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

            // Responsive sizing
            var container = canvas.parentElement;
            var maxW = container ? container.clientWidth - 10 : 800;
            maxW = Math.min(900, Math.max(300, maxW));

            var aspect = p.warehouseLength / p.warehouseWidth;
            var w = maxW;
            var h = Math.round(w / aspect);
            h = Math.max(300, Math.min(600, h));

            // Handle retina display
            var dpr = window.devicePixelRatio || 1;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 45;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;
            var scale = drawW / p.warehouseLength;

            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            // Grid lines (every 10m)
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
            ctx.lineWidth = 0.5;
            for (var gx = 0; gx <= p.warehouseLength; gx += 10) {
                var gxPx = pad + gx * scale;
                ctx.beginPath();
                ctx.moveTo(gxPx, pad);
                ctx.lineTo(gxPx, pad + drawH);
                ctx.stroke();
            }
            for (var gy = 0; gy <= p.warehouseWidth; gy += 10) {
                var gyPx = pad + gy * scale;
                ctx.beginPath();
                ctx.moveTo(pad, gyPx);
                ctx.lineTo(pad + drawW, gyPx);
                ctx.stroke();
            }

            // Warehouse outline
            ctx.strokeStyle = '#1a365d';
            ctx.lineWidth = 2;
            ctx.strokeRect(pad, pad, drawW, drawH);

            // Dimension labels
            ctx.fillStyle = '#1a365d';
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.warehouseLength + 'm', pad + drawW / 2, pad - 10);
            ctx.save();
            ctx.translate(pad - 12, pad + drawH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(p.warehouseWidth + 'm', 0, 0);
            ctx.restore();

            // Draw each rack row
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var blockDepth = preset.rackDepth * 2 + 0.8;
            var bayWidth = preset.rackWidth;

            for (var i = 0; i < this.rows.length; i++) {
                var row = this.rows[i];
                var rowYPx = pad + row.y * scale;
                var blockDepthPx = row.blockDepth * scale;

                // Aisle area (before this row) — light yellow
                if (i > 0) {
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
                    var aisleStartPx = pad + (this.rows[i - 1].y + this.rows[i - 1].blockDepth) * scale;
                    ctx.fillRect(pad, aisleStartPx, drawW, rowYPx - aisleStartPx);

                    // Aisle label
                    ctx.fillStyle = '#b45309';
                    ctx.font = '9px -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Aisle ' + i + ' (' + aisleW + 'm)', pad + drawW / 2, aisleStartPx + (rowYPx - aisleStartPx) / 2 + 3);
                }

                // Rack block
                ctx.fillStyle = preset.color + 'cc';
                ctx.fillRect(pad + 10, rowYPx, drawW - 20, blockDepthPx);

                // Rack block border
                ctx.strokeStyle = preset.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(pad + 10, rowYPx, drawW - 20, blockDepthPx);

                // Center line (double-sided divider)
                var centerY = rowYPx + blockDepthPx / 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(pad + 10, centerY);
                ctx.lineTo(pad + drawW - 10, centerY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Bay dividers (vertical lines)
                var bayPx = bayWidth * scale;
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 0.5;
                for (var b = 1; b < row.baysPerRow; b++) {
                    var bx = pad + 10 + b * bayPx;
                    if (bx > pad + drawW - 10) break;
                    ctx.beginPath();
                    ctx.moveTo(bx, rowYPx);
                    ctx.lineTo(bx, rowYPx + blockDepthPx);
                    ctx.stroke();
                }

                // Upright markers (small dots at bay corners)
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                for (var b = 0; b <= row.baysPerRow; b++) {
                    var ux = pad + 10 + b * bayPx;
                    if (ux > pad + drawW - 10) break;
                    ctx.beginPath();
                    ctx.arc(ux, rowYPx + 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(ux, rowYPx + blockDepthPx - 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Row label
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = '9px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('Row ' + (i + 1), pad + 14, rowYPx + blockDepthPx / 2 + 3);

                // Pallet count label on right side
                ctx.textAlign = 'right';
                var bayPositions = p.palletsPerLevel * p.levels;
                ctx.fillText(row.baysPerRow * 2 * bayPositions + ' pos', pad + drawW - 14, rowYPx + blockDepthPx / 2 + 3);
            }

            // Entrance zone
            var entranceSize = 3; // 3m entrance zone
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(pad, pad + drawH - entranceSize * scale, drawW, entranceSize * scale);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚪 Loading Zone (' + entranceSize + 'm)', pad + drawW / 2, pad + drawH - entranceSize * scale / 2 + 3);

            // Scale bar
            var scaleBarM = this.getScaleBarM(p.warehouseLength);
            var scaleBarPx = scaleBarM * scale;
            var sbX = pad;
            var sbY = h - 12;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sbX, sbY);
            ctx.lineTo(sbX + scaleBarPx, sbY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sbX, sbY - 4);
            ctx.lineTo(sbX, sbY + 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sbX + scaleBarPx, sbY - 4);
            ctx.lineTo(sbX + scaleBarPx, sbY + 4);
            ctx.stroke();
            ctx.fillStyle = '#333';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scaleBarM + 'm', sbX + scaleBarPx / 2, sbY - 6);

            // Bottom label
            ctx.fillStyle = '#718096';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' — ' + this.rows.length + ' row(s), ' + this.stats.totalPositions.toLocaleString() + ' positions', pad + drawW / 2, h - 3);
        },

        // ===== Scale bar helper =====
        getScaleBarM: function (length) {
            if (length < 30) return 5;
            if (length < 60) return 10;
            if (length < 120) return 20;
            return 50;
        },

        // ===== Initialize interactive mode on the specs page =====
        initInteractive: function () {
            var engine = this;

            // Ensure params are calculated
            engine.calculate();

            // Bind slider inputs
            var sliderMap = {
                'interactive-length': 'warehouseLength',
                'interactive-width': 'warehouseWidth',
                'interactive-aisle': 'aisleWidth',
                'interactive-levels': 'levels',
                'interactive-pallets': 'palletsPerLevel'
            };

            var debouncedDraw = debounce(function () {
                engine.calculate();
                engine.draw('layout-canvas');
                engine.updateStats();
                engine.updateRecommendation();
            }, 150);

            Object.keys(sliderMap).forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', function () {
                    var key = sliderMap[id];
                    var val = parseFloat(this.value) || 0;
                    engine.params[key] = val;

                    // Update display value
                    var display = document.getElementById(id + '-value');
                    if (display) {
                        if (key === 'warehouseLength' || key === 'warehouseWidth') {
                            display.textContent = val + 'm';
                            // Sync to specs form
                            var formId = key === 'warehouseLength' ? 'spec-length' : 'spec-width';
                            var formEl = document.getElementById(formId);
                            if (formEl) formEl.value = val;
                        } else if (key === 'aisleWidth') {
                            display.textContent = val.toFixed(1) + 'm';
                        } else if (key === 'levels') {
                            display.textContent = val;
                        } else if (key === 'palletsPerLevel') {
                            display.textContent = val;
                        }
                    }
                    debouncedDraw();
                });
            });

            // Racking type selector
            var rackingSelect = document.getElementById('interactive-racking');
            if (rackingSelect) {
                rackingSelect.addEventListener('change', function () {
                    engine.setParam('rackingType', this.value);
                    debouncedDraw();
                });
            }

            // Initial draw
            engine.calculate();
            setTimeout(function () {
                engine.draw('layout-canvas');
                engine.updateStats();
                engine.updateRecommendation();
            }, 100);
        },

        // ===== Update the stats panel =====
        updateStats: function () {
            var s = this.stats;
            var s1 = document.getElementById('stat-positions');
            if (s1) s1.textContent = s.totalPositions.toLocaleString();
            var s2 = document.getElementById('stat-utilization');
            if (s2) s2.textContent = s.spaceUtilization + '%';
            var s3 = document.getElementById('stat-rows');
            if (s3) s3.textContent = s.rackBlockCount;
            var s4 = document.getElementById('stat-cost');
            if (s4) s4.textContent = '¥' + (s.estimatedCostCNY / 10000).toFixed(0) + 'K';
        },

        // ===== Update mini recommendation =====
        updateRecommendation: function () {
            var el = document.getElementById('stat-recommendation');
            if (!el) return;

            var p = this.params;
            var rec = '';

            // Simple heuristic recommendations
            if (p.levels >= 8) {
                rec = 'VNA Racking — tall warehouse benefits from narrow aisles';
            } else if (p.warehouseWidth < 25) {
                rec = 'Drive-In Racking — narrow warehouse suits high-density';
            } else if (p.levels <= 3) {
                rec = 'Medium-Duty Selective — low height suits lighter racking';
            } else if (p.warehouseLength * p.warehouseWidth > 3000) {
                rec = 'Radio Shuttle — large warehouse benefits from semi-automation';
            } else {
                rec = 'Heavy-Duty Selective — versatile choice for most warehouses';
            }

            el.textContent = rec;
        }
    };

    // Export to global
    window.LayoutEngine = LayoutEngine;

})();
