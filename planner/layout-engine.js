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
            entrancePosition: 'bottom-left', // entrance corner
            // Advanced params
            palletWidth: 800,      // mm
            palletDepth: 1200,     // mm
            palletHeight: 1000,    // mm
            beamHeight: 120,       // mm
            uprightDepth: 1050,    // mm
            interPalletGap: 100,   // mm
            // Building structure params
            columnSpacingX: 15,    // meters
            columnSpacingY: 12,    // meters
            columnSize: 400        // mm
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

        // ===== Draw CAD-style dimension line =====
        drawDimensionLine: function (ctx, opts) {
            // opts: startX, startY, endX, endY, label, color, fontSize, isHorizontal
            var color = opts.color || '#334155';
            var fontSize = opts.fontSize || 10;
            var tickLen = 6;
            var tickWidth = 2;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1;
            ctx.font = 'bold ' + fontSize + 'px monospace';

            if (opts.isHorizontal !== false) {
                // Horizontal dimension line
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();

                // End ticks
                ctx.lineWidth = tickWidth;
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY - tickLen / 2);
                ctx.lineTo(opts.startX, opts.startY + tickLen / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(opts.endX, opts.endY - tickLen / 2);
                ctx.lineTo(opts.endX, opts.endY + tickLen / 2);
                ctx.stroke();

                // Label centered
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(opts.label, (opts.startX + opts.endX) / 2, opts.startY - 3);
            } else {
                // Vertical dimension line
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();

                // End ticks
                ctx.lineWidth = tickWidth;
                ctx.beginPath();
                ctx.moveTo(opts.startX - tickLen / 2, opts.startY);
                ctx.lineTo(opts.startX + tickLen / 2, opts.startY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(opts.endX - tickLen / 2, opts.endY);
                ctx.lineTo(opts.endX + tickLen / 2, opts.endY);
                ctx.stroke();

                // Label centered, rotated
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.translate(opts.startX - 8, (opts.startY + opts.endY) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(opts.label, 0, 0);
                ctx.restore();
            }
        },

        // Format meters to mm with thousands separator
        formatDimension: function (meters) {
            var mm = Math.round(meters * 1000);
            return mm.toLocaleString('en-US');
        },

        // ===== Draw building columns in top view =====
        drawBuildingColumns: function (ctx, pad, drawW, drawH, scale) {
            var p = this.params;
            var spacingX = p.columnSpacingX;
            var spacingY = p.columnSpacingY;
            var colSizeMm = p.columnSize; // mm
            var colSizeM = colSizeMm / 1000; // convert to meters
            var colSizePx = Math.max(4, colSizeM * scale);

            ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
            ctx.lineWidth = 0.5;

            for (var x = spacingX; x < p.warehouseLength; x += spacingX) {
                for (var y = spacingY; y < p.warehouseWidth; y += spacingY) {
                    var cx = pad + x * scale - colSizePx / 2;
                    var cy = pad + y * scale - colSizePx / 2;
                    ctx.fillRect(cx, cy, colSizePx, colSizePx);
                    ctx.strokeRect(cx, cy, colSizePx, colSizePx);
                }
            }

            // Legend
            if (colSizePx > 6) {
                ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
                ctx.font = '8px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('Building Columns', pad + 5, pad + drawH - 5);
            }
        },

        // ===== Draw top-down view (Plan) =====
        drawTopView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;

            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

            // Responsive sizing
            var container = canvas.parentElement;
            var maxW = container ? container.clientWidth - 16 : 600;
            maxW = Math.min(900, Math.max(300, maxW));

            var aspect = p.warehouseLength / p.warehouseWidth;
            var w = maxW;
            var h = Math.round(w / aspect);
            h = Math.max(200, Math.min(400, h));

            // Handle retina display
            var dpr = window.devicePixelRatio || 1;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 40;
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

            // Dimension labels (legacy simple labels — kept for backward compat)
            // Building columns (behind racks)
            this.drawBuildingColumns(ctx, pad, drawW, drawH, scale);

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

                // Upright markers
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
            var entranceSize = 3;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(pad, pad + drawH - entranceSize * scale, drawW, entranceSize * scale);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Loading Zone (' + entranceSize + 'm)', pad + drawW / 2, pad + drawH - entranceSize * scale / 2 + 3);

            // ===== CAD-style dimension lines =====
            // Top: warehouse total length
            var dimOffset = 18;
            this.drawDimensionLine(ctx, {
                startX: pad, startY: pad - dimOffset,
                endX: pad + drawW, endY: pad - dimOffset,
                label: this.formatDimension(p.warehouseLength),
                isHorizontal: true
            });

            // Left: warehouse total width
            this.drawDimensionLine(ctx, {
                startX: pad - dimOffset, startY: pad,
                endX: pad - dimOffset, endY: pad + drawH,
                label: this.formatDimension(p.warehouseWidth),
                isHorizontal: false
            });

            // Between rack rows: row spacing labels
            for (var di = 0; di < this.rows.length - 1; di++) {
                var r1 = this.rows[di];
                var r2 = this.rows[di + 1];
                var aisleStartY = pad + (r1.y + r1.blockDepth) * scale;
                var aisleEndY = pad + r2.y * scale;
                var aisleSpacingM = r2.y - (r1.y + r1.blockDepth);
                var aisleLabelX = pad + drawW + 8;
                var aisleMidY = (aisleStartY + aisleEndY) / 2;

                ctx.fillStyle = '#b45309';
                ctx.font = '8px monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(aisleSpacingM.toFixed(1) + 'm', aisleLabelX, aisleMidY);

                // Dashed line across aisle
                ctx.strokeStyle = 'rgba(180, 83, 9, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(pad, aisleMidY);
                ctx.lineTo(pad + drawW, aisleMidY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Bottom: loading zone dimension
            var loadingTopY = pad + drawH - entranceSize * scale;
            this.drawDimensionLine(ctx, {
                startX: pad + drawW - 80, startY: loadingTopY,
                endX: pad + drawW - 80, endY: pad + drawH,
                label: this.formatDimension(entranceSize),
                isHorizontal: false
            });

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

        // ===== Draw front elevation view =====
        drawFrontView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;

            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

            var dpr = window.devicePixelRatio || 1;
            var container = canvas.parentElement;
            var w = container ? container.clientWidth - 16 : 400;
            w = Math.min(600, Math.max(250, w));
            var h = 200;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 45;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;

            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            var levels = p.levels;
            var palletsPerBay = p.palletsPerLevel;
            var bayWidth = preset.rackWidth;
            var warehouseHeight = levels * 2.0; // approximate height per level

            // Compute scale: fit the bay width * palletsPerBay horizontally, and warehouseHeight vertically
            var totalBayW = bayWidth * palletsPerBay;
            var scaleX = drawW / totalBayW;
            var scaleY = drawH / warehouseHeight;
            var sc = Math.min(scaleX, scaleY);

            var rackW = totalBayW * sc;
            var rackH = warehouseHeight * sc;
            var offsetX = pad + (drawW - rackW) / 2;
            var offsetY = pad + (drawH - rackH); // bottom-aligned

            // Ground line
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pad - 10, pad + drawH);
            ctx.lineTo(pad + drawW + 10, pad + drawH);
            ctx.stroke();

            // Ground hatch pattern
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
            ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 8) {
                ctx.beginPath();
                ctx.moveTo(gx, pad + drawH);
                ctx.lineTo(gx - 6, pad + drawH + 6);
                ctx.stroke();
            }

            // Draw upright frames (vertical columns) — blue
            var uprightWidth = 0.08; // meters (visual width)
            var uprightPxW = uprightWidth * sc;
            var numUprights = palletsPerBay + 1;

            ctx.fillStyle = '#1e40af';
            for (var u = 0; u < numUprights; u++) {
                var ux = offsetX + u * bayWidth * sc - uprightPxW / 2;
                ctx.fillRect(ux, offsetY, uprightPxW, rackH);
            }

            // Draw beams (horizontal) — orange
            var beamH = 0.06; // visual height
            var beamPxH = beamH * sc;
            var levelHeight = warehouseHeight / levels;

            ctx.fillStyle = '#f59e0b';
            for (var lv = 0; lv < levels; lv++) {
                var ly = offsetY + rackH - (lv + 1) * levelHeight * sc - beamPxH / 2;
                ctx.fillRect(offsetX, ly, rackW, beamPxH);

                // Pallet on this level — gray
                var palletH = levelHeight * 0.6;
                var palletPxH = palletH * sc;
                var palletGap = 0.15; // gap between pallets
                var palletPxGap = palletGap * sc;

                ctx.fillStyle = '#94a3b8';
                for (var pl = 0; pl < palletsPerBay; pl++) {
                    var px = offsetX + pl * bayWidth * sc + palletPxGap;
                    var pw = bayWidth * sc - palletPxGap * 2;
                    var py = ly - palletPxH;
                    ctx.fillRect(px, py, pw, palletPxH);

                    // Pallet outline
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, py, pw, palletPxH);
                }
                ctx.fillStyle = '#f59e0b';
            }

            // Dimension annotations
            // Total height on left
            var dimX = offsetX - 18;
            var warehouseHeightM = levels * 2.0;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY,
                endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeightM),
                isHorizontal: false
            });

            // Level height annotations on right
            ctx.font = '8px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#64748b';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + rackW + 5, levelY + 3);
            }

            // Per-level height annotation on right side
            var rightDimX = offsetX + rackW + 18;
            if (levels > 0) {
                var levelHM = warehouseHeight / levels;
                for (var ld = 0; ld < levels; ld++) {
                    var lyTop = offsetY + rackH - (ld + 1) * levelHeight * sc;
                    var lyBot = offsetY + rackH - ld * levelHeight * sc;
                    this.drawDimensionLine(ctx, {
                        startX: rightDimX, startY: lyTop,
                        endX: rightDimX, endY: lyBot,
                        label: levelHM.toFixed(1) + 'm',
                        isHorizontal: false
                    });
                }
            }

            // Bottom: bay width dimension line
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: pad + drawH + 18,
                endX: offsetX + rackW, endY: pad + drawH + 18,
                label: bayWidth.toFixed(1) + 'm',
                isHorizontal: true
            });

            // Top label
            ctx.fillStyle = '#1e40af';
            ctx.font = 'bold 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' — Elevation', w / 2, pad - 10);
        },

        // ===== Draw side section view =====
        drawSideView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;

            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

            var dpr = window.devicePixelRatio || 1;
            var container = canvas.parentElement;
            var w = container ? container.clientWidth - 16 : 400;
            w = Math.min(600, Math.max(250, w));
            var h = 200;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 45;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;

            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            var levels = p.levels;
            var rackDepth = preset.rackDepth; // single side depth
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var warehouseHeight = levels * 2.0;

            // Scale: fit rackDepth + aisleWidth horizontally, warehouseHeight vertically
            var totalW = rackDepth + aisleW;
            var scaleX = drawW / totalW;
            var scaleY = drawH / warehouseHeight;
            var sc = Math.min(scaleX, scaleY);

            var rackW = rackDepth * sc;
            var aisleW_Px = aisleW * sc;
            var rackH = warehouseHeight * sc;
            var offsetX = pad + (drawW - rackW - aisleW_Px) / 2;
            var offsetY = pad + (drawH - rackH);

            // Ground line
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pad - 10, pad + drawH);
            ctx.lineTo(pad + drawW + 10, pad + drawH);
            ctx.stroke();

            // Ground hatch
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
            ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 8) {
                ctx.beginPath();
                ctx.moveTo(gx, pad + drawH);
                ctx.lineTo(gx - 6, pad + drawH + 6);
                ctx.stroke();
            }

            // Rack block (side profile) — blue
            ctx.fillStyle = '#1e40af';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(offsetX, offsetY, rackW, rackH);
            ctx.globalAlpha = 1.0;

            // Rack outline
            ctx.strokeStyle = '#1e40af';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(offsetX, offsetY, rackW, rackH);

            // Level dividers
            var levelHeight = warehouseHeight / levels;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            for (var lv = 1; lv < levels; lv++) {
                var ly = offsetY + lv * levelHeight * sc;
                ctx.beginPath();
                ctx.moveTo(offsetX, ly);
                ctx.lineTo(offsetX + rackW, ly);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Level labels inside rack
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '8px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY2 = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + 3, levelY2 + 3);
            }

            // Aisle zone — dashed rectangle
            var aisleX = offsetX + rackW;
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(aisleX, offsetY, aisleW_Px, rackH);
            ctx.setLineDash([]);

            // Aisle label
            ctx.fillStyle = '#b45309';
            ctx.font = '9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Aisle', aisleX + aisleW_Px / 2, offsetY + rackH / 2 - 5);
            ctx.fillText('(' + aisleW.toFixed(1) + 'm)', aisleX + aisleW_Px / 2, offsetY + rackH / 2 + 8);

            // Forklift icon (simplified)
            var forkX = aisleX + aisleW_Px / 2;
            var forkY = offsetY + rackH - 15;
            ctx.fillStyle = '#f59e0b';
            // Body
            ctx.fillRect(forkX - 12, forkY - 8, 24, 10);
            // Wheels
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(forkX - 8, forkY + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(forkX + 8, forkY + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            // Mast
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(forkX - 10, forkY - 8);
            ctx.lineTo(forkX - 10, forkY - 20);
            ctx.stroke();
            // Forks
            ctx.beginPath();
            ctx.moveTo(forkX - 10, forkY - 18);
            ctx.lineTo(forkX - 4, forkY - 18);
            ctx.stroke();

            // Dimension annotations
            // Rack depth on top
            var dimTopY = offsetY - 18;
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: dimTopY,
                endX: offsetX + rackW, endY: dimTopY,
                label: 'Rack ' + rackDepth.toFixed(1) + 'm',
                isHorizontal: true
            });

            // Aisle width on top
            var aisleDimTopY = offsetY - 18;
            this.drawDimensionLine(ctx, {
                startX: aisleX, startY: aisleDimTopY,
                endX: aisleX + aisleW_Px, endY: aisleDimTopY,
                label: 'Aisle ' + aisleW.toFixed(1) + 'm',
                isHorizontal: true
            });

            // Total height on left
            var dimX = offsetX - 18;
            var warehouseHeightM = levels * 2.0;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY,
                endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeightM),
                isHorizontal: false
            });

            // Per-level height annotation on right
            var rightDimX = offsetX + rackW + aisleW_Px + 18;
            var levelHM = warehouseHeight / levels;
            for (var ld = 0; ld < levels; ld++) {
                var lyTop = offsetY + rackH - (ld + 1) * levelHeight * sc;
                var lyBot = offsetY + rackH - ld * levelHeight * sc;
                this.drawDimensionLine(ctx, {
                    startX: rightDimX, startY: lyTop,
                    endX: rightDimX, endY: lyBot,
                    label: levelHM.toFixed(1) + 'm',
                    isHorizontal: false
                });
            }

            // Top label
            ctx.fillStyle = '#1e40af';
            ctx.font = 'bold 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' — Section', w / 2, pad - 10);
        },

        // ===== Draw all three views =====
        drawAll: function () {
            this.drawTopView('canvas-top');
            this.drawFrontView('canvas-front');
            this.drawSideView('canvas-side');
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
                'interactive-pallets': 'palletsPerLevel',
                // Advanced params
                'pallet-width': 'palletWidth',
                'pallet-depth': 'palletDepth',
                'pallet-height': 'palletHeight',
                'beam-height': 'beamHeight',
                'upright-depth': 'uprightDepth',
                'pallet-gap': 'interPalletGap',
                // Building structure params
                'column-spacing-x': 'columnSpacingX',
                'column-spacing-y': 'columnSpacingY',
                'column-size': 'columnSize'
            };

            var debouncedDraw = debounce(function () {
                engine.calculate();
                engine.drawAll();
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
                            display.textContent = val;
                        } else if (key === 'aisleWidth') {
                            display.textContent = val.toFixed(1);
                        } else if (key === 'levels' || key === 'palletsPerLevel') {
                            display.textContent = val;
                        } else if (key === 'columnSpacingX' || key === 'columnSpacingY') {
                            display.textContent = val;
                        } else {
                            // mm values: pallet, beam, upright, gap
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
                engine.drawAll();
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
