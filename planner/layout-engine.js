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
            var color = opts.color || '#374151';
            var fontSize = opts.fontSize || 10;
            var tickLen = 5;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 0.8;

            if (opts.isHorizontal !== false) {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY - tickLen);
                ctx.lineTo(opts.startX, opts.startY + tickLen);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(opts.endX, opts.endY - tickLen);
                ctx.lineTo(opts.endX, opts.endY + tickLen);
                ctx.stroke();
                ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(opts.label, (opts.startX + opts.endX) / 2, opts.startY - 2);
            } else {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(opts.startX - tickLen, opts.startY);
                ctx.lineTo(opts.startX + tickLen, opts.startY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(opts.endX - tickLen, opts.endY);
                ctx.lineTo(opts.endX + tickLen, opts.endY);
                ctx.stroke();
                ctx.save();
                ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.translate(opts.startX - 6, (opts.startY + opts.endY) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(opts.label, 0, 0);
                ctx.restore();
            }
        },

        // Format meters with explicit unit suffix
        formatDimension: function (meters) {
            return meters.toFixed(1) + ' m';
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
                ctx.font = 'bold 10px -apple-system, sans-serif';
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

            var pad = 50;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;
            var scale = drawW / p.warehouseLength;

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            // CAD grid lines (every 5m, subtle)
            ctx.strokeStyle = '#e8ecf0';
            ctx.lineWidth = 0.5;
            for (var gx = 0; gx <= p.warehouseLength; gx += 5) {
                var gxPx = pad + gx * scale;
                ctx.beginPath();
                ctx.moveTo(gxPx, pad);
                ctx.lineTo(gxPx, pad + drawH);
                ctx.stroke();
            }
            for (var gy = 0; gy <= p.warehouseWidth; gy += 5) {
                var gyPx = pad + gy * scale;
                ctx.beginPath();
                ctx.moveTo(pad, gyPx);
                ctx.lineTo(pad + drawW, gyPx);
                ctx.stroke();
            }

            // Major grid (every 10m, slightly stronger)
            ctx.strokeStyle = '#d5dae2';
            ctx.lineWidth = 0.8;
            for (var gx2 = 0; gx2 <= p.warehouseLength; gx2 += 10) {
                var gxPx2 = pad + gx2 * scale;
                ctx.beginPath();
                ctx.moveTo(gxPx2, pad);
                ctx.lineTo(gxPx2, pad + drawH);
                ctx.stroke();
            }
            for (var gy2 = 0; gy2 <= p.warehouseWidth; gy2 += 10) {
                var gyPx2 = pad + gy2 * scale;
                ctx.beginPath();
                ctx.moveTo(pad, gyPx2);
                ctx.lineTo(pad + drawW, gyPx2);
                ctx.stroke();
            }

            // Warehouse outline (thick dark border)
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(pad, pad, drawW, drawH);

            // Warehouse fill (very light)
            ctx.fillStyle = '#fafbfc';
            ctx.fillRect(pad, pad, drawW, drawH);

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

                // Aisle area (before this row) — subtle gray
                if (i > 0) {
                    ctx.fillStyle = '#f8f9fb';
                    var aisleStartPx = pad + (this.rows[i - 1].y + this.rows[i - 1].blockDepth) * scale;
                    ctx.fillRect(pad, aisleStartPx, drawW, rowYPx - aisleStartPx);

                    // Aisle label
                    ctx.fillStyle = '#9ca3af';
                    ctx.font = '600 10px -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('AISLE ' + i + ' · ' + aisleW + 'm', pad + drawW / 2, aisleStartPx + (rowYPx - aisleStartPx) / 2);
                }

                // Rack block — light blue fill
                ctx.fillStyle = 'rgba(37, 99, 235, 0.10)';
                ctx.fillRect(pad + 10, rowYPx, drawW - 20, blockDepthPx);

                // Rack block border
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(pad + 10, rowYPx, drawW - 20, blockDepthPx);

                // Center line (double-sided divider)
                var centerY = rowYPx + blockDepthPx / 2;
                ctx.strokeStyle = 'rgba(37, 99, 235, 0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(pad + 10, centerY);
                ctx.lineTo(pad + drawW - 10, centerY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Bay dividers (vertical lines)
                var bayPx = bayWidth * scale;
                ctx.strokeStyle = 'rgba(37, 99, 235, 0.20)';
                ctx.lineWidth = 0.5;
                for (var b = 1; b < row.baysPerRow; b++) {
                    var bx = pad + 10 + b * bayPx;
                    if (bx > pad + drawW - 10) break;
                    ctx.beginPath();
                    ctx.moveTo(bx, rowYPx);
                    ctx.lineTo(bx, rowYPx + blockDepthPx);
                    ctx.stroke();
                }

                // Upright markers — small dots
                ctx.fillStyle = 'rgba(37, 99, 235, 0.5)';
                for (var b = 0; b <= row.baysPerRow; b++) {
                    var ux = pad + 10 + b * bayPx;
                    if (ux > pad + drawW - 10) break;
                    ctx.beginPath();
                    ctx.arc(ux, rowYPx + 2, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(ux, rowYPx + blockDepthPx - 2, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Row label
                ctx.fillStyle = '#1e40af';
                ctx.font = 'bold 10px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('ROW ' + (i + 1), pad + 14, rowYPx + blockDepthPx / 2);

                // Pallet count label on right side
                ctx.textAlign = 'right';
                var bayPositions = p.palletsPerLevel * p.levels;
                ctx.fillText(row.baysPerRow * 2 * bayPositions + ' pos', pad + drawW - 14, rowYPx + blockDepthPx / 2);
            }

            // Entrance zone
            var entranceSize = 3;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.fillRect(pad, pad + drawH - entranceSize * scale, drawW, entranceSize * scale);
            ctx.fillStyle = '#059669';
            ctx.font = '600 10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading Zone (' + entranceSize + 'm)', pad + drawW / 2, pad + drawH - entranceSize * scale / 2);

            // ===== CAD-style dimension lines =====
            // Top: warehouse total length
            var dimOffset = 16;
            ctx.strokeStyle = '#374151';
            ctx.fillStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.font = 'bold 11px -apple-system, sans-serif';

            // Top dimension
            ctx.beginPath();
            ctx.moveTo(pad, pad - dimOffset);
            ctx.lineTo(pad + drawW, pad - dimOffset);
            ctx.stroke();
            // End ticks
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad, pad - dimOffset - 4); ctx.lineTo(pad, pad - dimOffset + 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad + drawW, pad - dimOffset - 4); ctx.lineTo(pad + drawW, pad - dimOffset + 4); ctx.stroke();
            // Label
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(this.formatDimension(p.warehouseLength), pad + drawW / 2, pad - dimOffset - 3);

            // Left dimension
            ctx.strokeStyle = '#374151'; ctx.fillStyle = '#374151'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad - dimOffset, pad);
            ctx.lineTo(pad - dimOffset, pad + drawH);
            ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad - dimOffset - 4, pad); ctx.lineTo(pad - dimOffset + 4, pad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad - dimOffset - 4, pad + drawH); ctx.lineTo(pad - dimOffset + 4, pad + drawH); ctx.stroke();
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.translate(pad - dimOffset - 5, pad + drawH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(this.formatDimension(p.warehouseWidth), 0, 0);
            ctx.restore();

            // Between rack rows: row spacing labels
            for (var di = 0; di < this.rows.length - 1; di++) {
                var r1 = this.rows[di];
                var r2 = this.rows[di + 1];
                var aisleStartY = pad + (r1.y + r1.blockDepth) * scale;
                var aisleEndY = pad + r2.y * scale;
                var aisleSpacingM = r2.y - (r1.y + r1.blockDepth);
                var aisleLabelX = pad + drawW + 6;
                var aisleMidY = (aisleStartY + aisleEndY) / 2;

                ctx.fillStyle = '#9ca3af';
                ctx.font = '600 9px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(aisleSpacingM.toFixed(1) + ' m', aisleLabelX, aisleMidY);
            }

            // Bottom: loading zone dimension
            var loadingTopY = pad + drawH - entranceSize * scale;
            ctx.strokeStyle = '#059669'; ctx.fillStyle = '#059669'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad + drawW - 60, loadingTopY);
            ctx.lineTo(pad + drawW - 60, pad + drawH);
            ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad + drawW - 64, loadingTopY); ctx.lineTo(pad + drawW - 56, loadingTopY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad + drawW - 64, pad + drawH); ctx.lineTo(pad + drawW - 56, pad + drawH); ctx.stroke();
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.translate(pad + drawW - 66, (loadingTopY + pad + drawH) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(this.formatDimension(entranceSize), 0, 0);
            ctx.restore();

            // Scale bar
            var scaleBarM = this.getScaleBarM(p.warehouseLength);
            var scaleBarPx = scaleBarM * scale;
            var sbX = pad;
            var sbY = h - 14;
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sbX, sbY);
            ctx.lineTo(sbX + scaleBarPx, sbY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sbX, sbY - 5);
            ctx.lineTo(sbX, sbY + 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sbX + scaleBarPx, sbY - 5);
            ctx.lineTo(sbX + scaleBarPx, sbY + 5);
            ctx.stroke();
            ctx.fillStyle = '#374151';
            ctx.font = '600 10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scaleBarM + ' m', sbX + scaleBarPx / 2, sbY - 7);

            // Bottom label
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' · ' + this.rows.length + ' row(s) · ' + this.stats.totalPositions.toLocaleString() + ' positions', pad + drawW / 2, h - 4);
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
            var h = 220;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 50;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            var levels = p.levels;
            var palletsPerBay = p.palletsPerLevel;
            var bayWidth = preset.rackWidth;
            var warehouseHeight = levels * 2.0;

            var totalBayW = bayWidth * palletsPerBay;
            var scaleX = drawW / totalBayW;
            var scaleY = drawH / warehouseHeight;
            var sc = Math.min(scaleX, scaleY);

            var rackW = totalBayW * sc;
            var rackH = warehouseHeight * sc;
            var offsetX = pad + (drawW - rackW) / 2;
            var offsetY = pad + (drawH - rackH);

            // Ground line
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(pad - 10, pad + drawH);
            ctx.lineTo(pad + drawW + 10, pad + drawH);
            ctx.stroke();

            // Ground hatch
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.2)';
            ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath();
                ctx.moveTo(gx, pad + drawH);
                ctx.lineTo(gx - 5, pad + drawH + 5);
                ctx.stroke();
            }

            // Draw upright frames (vertical columns) — blue
            var uprightWidth = 0.08;
            var uprightPxW = Math.max(2, uprightWidth * sc);
            var numUprights = palletsPerBay + 1;

            ctx.fillStyle = '#2563eb';
            for (var u = 0; u < numUprights; u++) {
                var ux = offsetX + u * bayWidth * sc - uprightPxW / 2;
                ctx.fillRect(ux, offsetY, uprightPxW, rackH);
            }

            // Draw beams (horizontal) — blue accent
            var beamH = 0.06;
            var beamPxH = Math.max(2, beamH * sc);
            var levelHeight = warehouseHeight / levels;

            ctx.fillStyle = '#60a5fa';
            for (var lv = 0; lv < levels; lv++) {
                var ly = offsetY + rackH - (lv + 1) * levelHeight * sc - beamPxH / 2;
                ctx.fillRect(offsetX, ly, rackW, beamPxH);

                // Pallet on this level — subtle gray
                var palletH = levelHeight * 0.6;
                var palletPxH = palletH * sc;
                var palletGap = 0.15;
                var palletPxGap = palletGap * sc;

                ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
                for (var pl = 0; pl < palletsPerBay; pl++) {
                    var px = offsetX + pl * bayWidth * sc + palletPxGap;
                    var pw = bayWidth * sc - palletPxGap * 2;
                    var py = ly - palletPxH;
                    ctx.fillRect(px, py, pw, palletPxH);
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, py, pw, palletPxH);
                }
                ctx.fillStyle = '#60a5fa';
            }

            // Dimension annotations
            var dimX = offsetX - 16;
            var warehouseHeightM = levels * 2.0;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY,
                endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeightM),
                isHorizontal: false
            });

            // Level labels
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#6b7280';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + rackW + 5, levelY + 3);
            }

            // Bottom: bay width
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: pad + drawH + 16,
                endX: offsetX + rackW, endY: pad + drawH + 16,
                label: bayWidth.toFixed(1) + ' m',
                isHorizontal: true
            });

            // Top label
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FRONT ELEVATION', w / 2, pad - 10);
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
            var h = 220;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 50;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            var levels = p.levels;
            var rackDepth = preset.rackDepth;
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var warehouseHeight = levels * 2.0;

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
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(pad - 10, pad + drawH);
            ctx.lineTo(pad + drawW + 10, pad + drawH);
            ctx.stroke();

            // Ground hatch
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.2)';
            ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath();
                ctx.moveTo(gx, pad + drawH);
                ctx.lineTo(gx - 5, pad + drawH + 5);
                ctx.stroke();
            }

            // Rack block (side profile) — light blue
            ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
            ctx.fillRect(offsetX, offsetY, rackW, rackH);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(offsetX, offsetY, rackW, rackH);

            // Level dividers
            var levelHeight = warehouseHeight / levels;
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            for (var lv = 1; lv < levels; lv++) {
                var ly = offsetY + lv * levelHeight * sc;
                ctx.beginPath();
                ctx.moveTo(offsetX, ly);
                ctx.lineTo(offsetX + rackW, ly);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Level labels
            ctx.fillStyle = '#1e40af';
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY2 = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + 3, levelY2 + 3);
            }

            // Aisle zone — dashed rectangle
            var aisleX = offsetX + rackW;
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(aisleX, offsetY, aisleW_Px, rackH);
            ctx.setLineDash([]);

            // Aisle label
            ctx.fillStyle = '#9ca3af';
            ctx.font = '600 10px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('AISLE', aisleX + aisleW_Px / 2, offsetY + rackH / 2 - 7);
            ctx.fillText(aisleW.toFixed(1) + ' m', aisleX + aisleW_Px / 2, offsetY + rackH / 2 + 9);

            // Forklift icon (simplified)
            var forkX = aisleX + aisleW_Px / 2;
            var forkY = offsetY + rackH - 15;
            ctx.fillStyle = '#d97706';
            ctx.fillRect(forkX - 10, forkY - 7, 20, 8);
            ctx.fillStyle = '#6b7280';
            ctx.beginPath();
            ctx.arc(forkX - 7, forkY + 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(forkX + 7, forkY + 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(forkX - 9, forkY - 7);
            ctx.lineTo(forkX - 9, forkY - 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(forkX - 9, forkY - 16);
            ctx.lineTo(forkX - 4, forkY - 16);
            ctx.stroke();

            // Dimension annotations
            var dimTopY = offsetY - 16;
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: dimTopY,
                endX: offsetX + rackW, endY: dimTopY,
                label: 'Rack ' + rackDepth.toFixed(1) + ' m',
                isHorizontal: true
            });

            this.drawDimensionLine(ctx, {
                startX: aisleX, startY: dimTopY,
                endX: aisleX + aisleW_Px, endY: dimTopY,
                label: 'Aisle ' + aisleW.toFixed(1) + ' m',
                isHorizontal: true
            });

            var dimX = offsetX - 16;
            var warehouseHeightM = levels * 2.0;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY,
                endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeightM),
                isHorizontal: false
            });

            // Top label
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SIDE SECTION', w / 2, pad - 10);
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
                            display.textContent = val + ' m';
                        } else if (key === 'aisleWidth') {
                            display.textContent = val.toFixed(1) + ' m';
                        } else if (key === 'levels' || key === 'palletsPerLevel') {
                            display.textContent = val;
                        } else if (key === 'columnSpacingX' || key === 'columnSpacingY') {
                            display.textContent = val + ' m';
                        } else if (key === 'columnSize') {
                            display.textContent = val + ' mm';
                        } else {
                            // mm values: pallet, beam, upright, gap
                            display.textContent = val + ' mm';
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
            if (s4) s4.textContent = '¥' + s.estimatedCostCNY.toLocaleString('en-US') + ' CNY';
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
