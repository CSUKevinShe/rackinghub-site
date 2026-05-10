/*
 * RackingHub Planner — layout-engine.js
 * Parameterized 2D warehouse layout engine with real-time Canvas rendering
 * Benchmark-rebuilt: numeric inputs + cleaner CAD-style rendering
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
            warehouseHeight: 6,    // meters
            rackingType: 'selective-heavy',
            aisleWidth: 3.2,       // meters
            levels: 4,
            palletsPerLevel: 2,
            entrancePosition: 'bottom-left',
            palletWidth: 1200,
            palletDepth: 800,
            palletHeight: 1500,
            beamHeight: 120,
            uprightDepth: 80,
            interPalletGap: 100,
            columnSpacingX: 15,
            columnSpacingY: 12,
            columnSize: 400
        },

        stats: {
            totalPositions: 0,
            spaceUtilization: 0,
            rackBlockCount: 0,
            aisleCount: 0,
            estimatedCostCNY: 0
        },

        rows: [],

        setParam: function (key, value) {
            this.params[key] = value;
            if (key === 'rackingType' && RACKING_PRESETS[value]) {
                this.params.aisleWidth = RACKING_PRESETS[value].aisleWidth;
            }
            this.calculate();
        },

        calculate: function () {
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var rackD = preset.rackDepth;
            var rackW = preset.rackWidth;

            var blockDepth = rackD * 2 + 0.8;
            var bayWidth = rackW;
            var usableWidth = p.warehouseWidth - 4;
            var rowsNeeded = Math.floor((usableWidth + aisleW) / (blockDepth + aisleW));
            rowsNeeded = Math.max(1, Math.min(rowsNeeded, 12));
            var usableLength = p.warehouseLength - 5;
            var baysPerRow = Math.floor(usableLength / bayWidth);
            baysPerRow = Math.max(1, Math.min(baysPerRow, 30));
            var positionsPerBay = p.palletsPerLevel * p.levels;
            var totalPositions = rowsNeeded * 2 * baysPerRow * positionsPerBay;

            var rackArea = rowsNeeded * 2 * baysPerRow * rackD * bayWidth;
            var totalArea = p.warehouseLength * p.warehouseWidth;
            var utilization = Math.round((rackArea / totalArea) * 100);
            utilization = Math.min(utilization, 80);

            var pricePerPosition = {
                'selective-heavy': 120, 'selective-medium': 85, 'drive-in': 150,
                'radio-shuttle': 200, 'vna': 280, 'push-back': 220
            };
            var costPerPos = pricePerPosition[p.rackingType] || 120;
            var estimatedCost = totalPositions * costPerPos;

            this.rows = [];
            var offsetY = 2;
            for (var i = 0; i < rowsNeeded; i++) {
                this.rows.push({
                    index: i, y: offsetY, blockDepth: blockDepth,
                    baysPerRow: baysPerRow, aisleAfter: i < rowsNeeded - 1
                });
                offsetY += blockDepth;
                if (i < rowsNeeded - 1) offsetY += aisleW;
            }

            this.stats = {
                totalPositions: totalPositions, spaceUtilization: utilization,
                rackBlockCount: rowsNeeded, aisleCount: Math.max(0, rowsNeeded - 1),
                estimatedCostCNY: estimatedCost, baysPerRow: baysPerRow,
                positionsPerBay: positionsPerBay, rowsNeeded: rowsNeeded
            };
        },

        // ===== Color palette (warehouse-planner.com benchmark) =====
        COLORS: {
            pallet: '#d4a574',       // tan/beige for pallet positions
            palletBg: 'rgba(212,165,116,0.45)',
            upright: '#1a365d',      // dark blue for uprights
            uprightLight: 'rgba(26,54,93,0.25)',
            beam: '#f59e0b',         // amber/yellow for beams
            beamLight: 'rgba(245,158,11,0.5)',
            buildingCol: '#10b981',  // green for building columns
            buildingColBg: 'rgba(16,185,129,0.15)',
            rackBlock: 'rgba(212,168,107,0.22)',
            rackBorder: 'rgba(26,54,93,0.4)',
            aisle: 'rgba(16,185,129,0.04)',
            gridMinor: '#f0f0f0',
            gridMajor: '#e0e0e0',
            dimLine: '#374151',
            dimText: '#1f2937',
            warehouseOutline: '#4b5563',
            forklift: '#ef4444',
            forkliftDetail: '#6b7280',
            ground: '#374151',
            loadingZone: 'rgba(16,185,129,0.08)',
        },

        // ===== Draw CAD-style dimension line =====
        drawDimensionLine: function (ctx, opts) {
            var color = opts.color || this.COLORS.dimLine;
            var fontSize = opts.fontSize || 11;
            var tickLen = 5;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 0.8;
            if (opts.isHorizontal !== false) {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(opts.startX, opts.startY - tickLen); ctx.lineTo(opts.startX, opts.startY + tickLen); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(opts.endX, opts.endY - tickLen); ctx.lineTo(opts.endX, opts.endY + tickLen); ctx.stroke();
                // Label with white background pill
                var label = opts.label;
                ctx.font = '700 ' + fontSize + 'px -apple-system, sans-serif';
                var textW = ctx.measureText(label).width;
                var cx = (opts.startX + opts.endX) / 2;
                var pillH = fontSize + 4;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(cx - textW/2 - 4, opts.startY - pillH - 2, textW + 8, pillH);
                ctx.fillStyle = color;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(label, cx, opts.startY - 3);
            } else {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(opts.startX - tickLen, opts.startY); ctx.lineTo(opts.startX + tickLen, opts.startY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(opts.endX - tickLen, opts.endY); ctx.lineTo(opts.endX + tickLen, opts.endY); ctx.stroke();
                var label = opts.label;
                ctx.save();
                ctx.font = '700 ' + fontSize + 'px -apple-system, sans-serif';
                var textW = ctx.measureText(label).width;
                var cy = (opts.startY + opts.endY) / 2;
                var pillH = fontSize + 4;
                ctx.fillStyle = '#ffffff';
                ctx.translate(opts.startX - 8, cy);
                ctx.rotate(-Math.PI / 2);
                ctx.fillRect(-textW/2 - 4, -pillH - 2, textW + 8, pillH);
                ctx.fillStyle = color;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(label, 0, -3);
                ctx.restore();
            }
        },

        formatDimension: function (meters) { return meters.toFixed(1) + ' m'; },

        // ===== Draw building columns (green thick bars, benchmark style) =====
        drawBuildingColumns: function (ctx, pad, drawW, drawH, scale) {
            var p = this.params;
            var colSizeM = p.columnSize / 1000;
            var colSizePx = Math.max(6, colSizeM * scale);
            var C = this.COLORS;
            // Green fill + border
            ctx.fillStyle = C.buildingColBg;
            ctx.strokeStyle = C.buildingCol;
            ctx.lineWidth = 1.2;
            for (var x = p.columnSpacingX; x < p.warehouseLength; x += p.columnSpacingX) {
                for (var y = p.columnSpacingY; y < p.warehouseWidth; y += p.columnSpacingY) {
                    var cx = pad + x * scale - colSizePx / 2;
                    var cy = pad + y * scale - colSizePx / 2;
                    ctx.fillRect(cx, cy, colSizePx, colSizePx);
                    ctx.strokeRect(cx, cy, colSizePx, colSizePx);
                }
            }
        },

        // ===== Draw top-down view (warehouse-planner.com benchmark style) =====
        drawTopView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var C = this.COLORS;

            // Size to parent container
            var container = canvas.parentElement;
            var w = container ? container.clientWidth - 2 : 600;
            var h = container ? container.clientHeight - 2 : 400;
            w = Math.min(1200, Math.max(300, w));
            h = Math.max(200, Math.min(600, h));

            var dpr = window.devicePixelRatio || 1;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 55;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;
            var scale = drawW / p.warehouseLength;
            var scaleY = drawH / p.warehouseWidth;
            var sc = Math.min(scale, scaleY);

            // ===== Background: subtle off-white =====
            ctx.fillStyle = '#fafbfc';
            ctx.fillRect(0, 0, w, h);

            // ===== Minor grid (5m) — very light =====
            ctx.strokeStyle = C.gridMinor;
            ctx.lineWidth = 0.4;
            for (var gx = 0; gx <= p.warehouseLength; gx += 5) {
                var gxPx = pad + gx * sc;
                ctx.beginPath(); ctx.moveTo(gxPx, pad); ctx.lineTo(gxPx, pad + p.warehouseWidth * sc); ctx.stroke();
            }
            for (var gy = 0; gy <= p.warehouseWidth; gy += 5) {
                var gyPx = pad + gy * sc;
                ctx.beginPath(); ctx.moveTo(pad, gyPx); ctx.lineTo(pad + p.warehouseLength * sc, gyPx); ctx.stroke();
            }

            // ===== Major grid (10m) — slightly stronger =====
            ctx.strokeStyle = C.gridMajor;
            ctx.lineWidth = 0.6;
            for (var gx2 = 0; gx2 <= p.warehouseLength; gx2 += 10) {
                var gxPx2 = pad + gx2 * sc;
                ctx.beginPath(); ctx.moveTo(gxPx2, pad); ctx.lineTo(gxPx2, pad + p.warehouseWidth * sc); ctx.stroke();
            }
            for (var gy2 = 0; gy2 <= p.warehouseWidth; gy2 += 10) {
                var gyPx2 = pad + gy2 * sc;
                ctx.beginPath(); ctx.moveTo(pad, gyPx2); ctx.lineTo(pad + p.warehouseLength * sc, gyPx2); ctx.stroke();
            }

            // ===== Warehouse outline =====
            ctx.strokeStyle = C.warehouseOutline;
            ctx.lineWidth = 2;
            ctx.strokeRect(pad, pad, p.warehouseLength * sc, p.warehouseWidth * sc);

            // ===== Building columns (green) =====
            this.drawBuildingColumns(ctx, pad, p.warehouseLength * sc, p.warehouseWidth * sc, sc);

            // ===== Rack rows =====
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var blockDepth = preset.rackDepth * 2 + 0.8;
            var bayWidth = preset.rackWidth;
            var levels = p.levels;
            var palletsPerBay = p.palletsPerLevel;

            for (var i = 0; i < this.rows.length; i++) {
                var row = this.rows[i];
                var rowYPx = pad + row.y * sc;
                var blockDepthPx = row.blockDepth * sc;
                var rowXPx = pad + 8;
                var rowW = p.warehouseLength * sc - 16;

                // Aisle area between rows (subtle green tint)
                if (i > 0) {
                    var aisleStartPx = pad + (this.rows[i - 1].y + this.rows[i - 1].blockDepth) * sc;
                    ctx.fillStyle = C.aisle;
                    ctx.fillRect(pad, aisleStartPx, p.warehouseLength * sc, rowYPx - aisleStartPx);
                    // Dashed aisle centerline
                    ctx.strokeStyle = 'rgba(16,185,129,0.15)';
                    ctx.lineWidth = 0.6;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(pad, (aisleStartPx + rowYPx) / 2);
                    ctx.lineTo(pad + p.warehouseLength * sc, (aisleStartPx + rowYPx) / 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Rack block background (warm tan)
                ctx.fillStyle = C.rackBlock;
                ctx.fillRect(rowXPx, rowYPx, rowW, blockDepthPx);

                // Rack block border
                ctx.strokeStyle = C.rackBorder;
                ctx.lineWidth = 1;
                ctx.strokeRect(rowXPx, rowYPx, rowW, blockDepthPx);

                // Center line (double-sided divider — blue dashed)
                var centerY = rowYPx + blockDepthPx / 2;
                ctx.strokeStyle = C.uprightLight;
                ctx.lineWidth = 0.6;
                ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(rowXPx, centerY); ctx.lineTo(rowXPx + rowW, centerY); ctx.stroke();
                ctx.setLineDash([]);

                // ===== Individual pallet positions (tan/beige blocks) =====
                var bayPx = bayWidth * sc;
                var palletGapPx = 2;
                var halfDepth = blockDepthPx / 2;

                for (var b = 0; b < row.baysPerRow; b++) {
                    var bx = rowXPx + b * bayPx;
                    if (bx + bayPx > rowXPx + rowW) break;

                    // Each pallet slot: top half and bottom half of rack row
                    for (var s = 0; s < palletsPerBay; s++) {
                        var slotW = (bayPx - palletGapPx * 2 - (palletsPerBay - 1) * 1) / palletsPerBay;
                        var slotX = bx + palletGapPx + s * (slotW + 1);

                        // Top side pallet
                        ctx.fillStyle = C.palletBg;
                        ctx.fillRect(slotX, rowYPx + 1, slotW, halfDepth - 2);
                        ctx.strokeStyle = C.pallet;
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(slotX, rowYPx + 1, slotW, halfDepth - 2);

                        // Bottom side pallet
                        ctx.fillStyle = C.palletBg;
                        ctx.fillRect(slotX, centerY + 1, slotW, halfDepth - 2);
                        ctx.strokeStyle = C.pallet;
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(slotX, centerY + 1, slotW, halfDepth - 2);
                    }

                    // Bay divider — upright (blue vertical line)
                    if (b > 0) {
                        ctx.strokeStyle = C.upright;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(bx, rowYPx); ctx.lineTo(bx, rowYPx + blockDepthPx); ctx.stroke();
                    }
                }
                // Last upright
                var lastBx = rowXPx + Math.min(row.baysPerRow, Math.floor(rowW / bayPx)) * bayPx;
                if (lastBx <= rowXPx + rowW) {
                    ctx.strokeStyle = C.upright;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(lastBx, rowYPx); ctx.lineTo(lastBx, rowYPx + blockDepthPx); ctx.stroke();
                }

                // Yellow beam lines (horizontal along top and bottom of rack)
                ctx.strokeStyle = C.beam;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(rowXPx, rowYPx + 1); ctx.lineTo(rowXPx + rowW, rowYPx + 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(rowXPx, rowYPx + blockDepthPx - 1); ctx.lineTo(rowXPx + rowW, rowYPx + blockDepthPx - 1); ctx.stroke();

                // Row label
                ctx.fillStyle = C.upright;
                ctx.font = '700 10px -apple-system, sans-serif';
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText('ROW ' + (i + 1), rowXPx + 4, rowYPx + blockDepthPx / 2);

                // Position count
                ctx.textAlign = 'right';
                var bayPositions = palletsPerBay * levels;
                ctx.fillStyle = '#6b7280';
                ctx.font = '600 9px -apple-system, sans-serif';
                ctx.fillText(row.baysPerRow * 2 * bayPositions + ' pos', rowXPx + rowW - 4, rowYPx + blockDepthPx / 2);
            }

            // ===== Loading zone =====
            var entranceSize = 3;
            var loadingTopY = pad + p.warehouseWidth * sc - entranceSize * sc;
            ctx.fillStyle = C.loadingZone;
            ctx.fillRect(pad, loadingTopY, p.warehouseLength * sc, entranceSize * sc);
            ctx.fillStyle = '#059669';
            ctx.font = '700 10px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Loading Zone (' + entranceSize + 'm)', pad + p.warehouseLength * sc / 2, loadingTopY + entranceSize * sc / 2);

            // ===== Forklift icon (bottom-right of warehouse area) =====
            this.drawForkliftIcon(ctx, pad + p.warehouseLength * sc - 40, pad + p.warehouseWidth * sc - 35, sc);

            // ===== Dimension lines =====
            var dimOffset = 16;
            // Top dimension
            this.drawDimensionLine(ctx, {
                startX: pad, startY: pad - dimOffset,
                endX: pad + p.warehouseLength * sc, endY: pad - dimOffset,
                label: p.warehouseLength + ' m', isHorizontal: true
            });
            // Left dimension
            this.drawDimensionLine(ctx, {
                startX: pad - dimOffset, startY: pad,
                endX: pad - dimOffset, endY: pad + p.warehouseWidth * sc,
                label: p.warehouseWidth + ' m', isHorizontal: false
            });

            // ===== Scale bar =====
            var scaleBarM = this.getScaleBarM(p.warehouseLength);
            var scaleBarPx = scaleBarM * sc;
            var sbX = pad;
            var sbY = h - 12;
            ctx.strokeStyle = C.dimLine; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + scaleBarPx, sbY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX, sbY - 5); ctx.lineTo(sbX, sbY + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX + scaleBarPx, sbY - 5); ctx.lineTo(sbX + scaleBarPx, sbY + 5); ctx.stroke();
            ctx.fillStyle = C.dimText; ctx.font = '700 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scaleBarM + ' m', sbX + scaleBarPx / 2, sbY - 7);

            // ===== Bottom label =====
            ctx.fillStyle = '#9ca3af';
            ctx.font = '9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' · ' + this.rows.length + ' row(s) · ' + this.stats.totalPositions.toLocaleString() + ' positions', pad + p.warehouseLength * sc / 2, h - 2);
        },

        // ===== Draw forklift icon (benchmark-style simple red forklift) =====
        drawForkliftIcon: function (ctx, x, y, scale) {
            var C = this.COLORS;
            var s = Math.max(0.6, Math.min(1.2, scale / 10));

            // Forklift body (red)
            ctx.fillStyle = C.forklift;
            ctx.beginPath();
            ctx.roundRect(x, y, 18 * s, 10 * s, 2 * s);
            ctx.fill();

            // Cabin
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x + 2 * s, y - 6 * s, 8 * s, 6 * s);

            // Mast
            ctx.strokeStyle = C.forkliftDetail;
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath();
            ctx.moveTo(x, y + 2 * s);
            ctx.lineTo(x, y - 10 * s);
            ctx.stroke();

            // Forks
            ctx.strokeStyle = C.forkliftDetail;
            ctx.lineWidth = 1.2 * s;
            ctx.beginPath();
            ctx.moveTo(x, y - 8 * s);
            ctx.lineTo(x - 5 * s, y - 8 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 5 * s);
            ctx.lineTo(x - 5 * s, y - 5 * s);
            ctx.stroke();

            // Wheels
            ctx.fillStyle = C.forkliftDetail;
            ctx.beginPath(); ctx.arc(x + 4 * s, y + 11 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 14 * s, y + 11 * s, 2 * s, 0, Math.PI * 2); ctx.fill();

            // Label
            ctx.fillStyle = '#9ca3af';
            ctx.font = '7px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FORKLIFT', x + 9 * s, y + 17 * s);
        },

        // ===== Draw front elevation (benchmark style) =====
        drawFrontView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var C = this.COLORS;

            var dpr = window.devicePixelRatio || 1;
            var container = canvas.parentElement;
            var w = container ? container.clientWidth - 2 : 350;
            var h = container ? container.clientHeight - 2 : 180;
            w = Math.min(600, Math.max(200, w));
            h = Math.max(150, Math.min(250, h));
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 45;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;

            // Off-white background
            ctx.fillStyle = '#fafbfc';
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

            // Ground line + hatch
            ctx.strokeStyle = C.ground; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad - 10, pad + drawH); ctx.lineTo(pad + drawW + 10, pad + drawH); ctx.stroke();
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.12)'; ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath(); ctx.moveTo(gx, pad + drawH); ctx.lineTo(gx - 4, pad + drawH + 4); ctx.stroke();
            }

            // Upright frames (blue vertical lines, thicker)
            var uprightWidth = 0.08;
            var uprightPxW = Math.max(3, uprightWidth * sc);
            var numUprights = palletsPerBay + 1;
            ctx.fillStyle = C.upright;
            for (var u = 0; u < numUprights; u++) {
                var ux = offsetX + u * bayWidth * sc - uprightPxW / 2;
                ctx.fillRect(ux, offsetY, uprightPxW, rackH);
            }

            // Beams + pallets
            var beamH = 0.06;
            var beamPxH = Math.max(2, beamH * sc);
            var levelHeight = warehouseHeight / levels;
            for (var lv = 0; lv < levels; lv++) {
                var ly = offsetY + rackH - (lv + 1) * levelHeight * sc - beamPxH / 2;

                // Beam — yellow horizontal line
                ctx.fillStyle = C.beam;
                ctx.fillRect(offsetX, ly, rackW, beamPxH);

                // Pallets — tan/beige blocks sitting on beam
                var palletH = levelHeight * 0.55;
                var palletPxH = palletH * sc;
                var palletGapM = 0.08; // 8cm gap between pallets
                var palletPxGap = palletGapM * sc;
                var singlePalletW = bayWidth / palletsPerBay; // width of one pallet
                var singlePalletPxW = singlePalletW * sc - palletPxGap * 2;
                ctx.fillStyle = C.palletBg;
                ctx.strokeStyle = C.pallet;
                ctx.lineWidth = 0.6;
                for (var pl = 0; pl < palletsPerBay; pl++) {
                    var px = offsetX + pl * singlePalletW * sc + palletPxGap;
                    ctx.fillRect(px, ly - palletPxH, singlePalletPxW, palletPxH);
                    ctx.strokeRect(px, ly - palletPxH, singlePalletPxW, palletPxH);
                }
            }

            // Height dimension line
            this.drawDimensionLine(ctx, {
                startX: offsetX - 16, startY: offsetY,
                endX: offsetX - 16, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeight),
                isHorizontal: false
            });

            // Level labels
            ctx.font = '700 8px -apple-system, sans-serif';
            ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + rackW + 5, levelY + 3);
            }

            // Bottom dimension
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: pad + drawH + 16,
                endX: offsetX + rackW, endY: pad + drawH + 16,
                label: bayWidth.toFixed(1) + ' m', isHorizontal: true
            });

            // Title
            ctx.fillStyle = '#9ca3af';
            ctx.font = '700 8px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FRONT ELEVATION', w / 2, pad - 8);
        },

        // ===== Draw side section (benchmark style) =====
        drawSideView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var C = this.COLORS;

            var dpr = window.devicePixelRatio || 1;
            var container = canvas.parentElement;
            var w = container ? container.clientWidth - 2 : 350;
            var h = container ? container.clientHeight - 2 : 180;
            w = Math.min(600, Math.max(200, w));
            h = Math.max(150, Math.min(250, h));
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.scale(dpr, dpr);

            var pad = 45;
            var drawW = w - pad * 2;
            var drawH = h - pad * 2;
            // Off-white background
            ctx.fillStyle = '#fafbfc';
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

            // Ground line + hatch
            ctx.strokeStyle = C.ground; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad - 10, pad + drawH); ctx.lineTo(pad + drawW + 10, pad + drawH); ctx.stroke();
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.12)'; ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath(); ctx.moveTo(gx, pad + drawH); ctx.lineTo(gx - 4, pad + drawH + 4); ctx.stroke();
            }

            // Rack block (tan background)
            ctx.fillStyle = 'rgba(212,168,107,0.18)';
            ctx.fillRect(offsetX, offsetY, rackW, rackH);
            ctx.strokeStyle = C.rackBorder; ctx.lineWidth = 1;
            ctx.strokeRect(offsetX, offsetY, rackW, rackH);

            // Level dividers + pallets + beams
            var levelHeight = warehouseHeight / levels;
            for (var lv = 0; lv < levels; lv++) {
                var lvY = offsetY + rackH - (lv + 1) * levelHeight * sc;
                var lvH = levelHeight * sc;

                // Beam — yellow line
                ctx.strokeStyle = C.beam;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(offsetX, lvY); ctx.lineTo(offsetX + rackW, lvY); ctx.stroke();

                // Pallet — tan block on beam
                var palletH = levelHeight * 0.5;
                var palletPxH = palletH * sc;
                ctx.fillStyle = C.palletBg;
                ctx.strokeStyle = C.pallet;
                ctx.lineWidth = 0.6;
                ctx.fillRect(offsetX + 2, lvY - palletPxH, rackW - 4, palletPxH);
                ctx.strokeRect(offsetX + 2, lvY - palletPxH, rackW - 4, palletPxH);

                // Level label
                ctx.fillStyle = '#6b7280';
                ctx.font = '700 7px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('L' + (lv + 1), offsetX + 3, lvY - palletPxH / 2 + 3);
            }

            // Upright edges (blue vertical lines at rack edges)
            ctx.strokeStyle = C.upright;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(offsetX, offsetY); ctx.lineTo(offsetX, offsetY + rackH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(offsetX + rackW, offsetY); ctx.lineTo(offsetX + rackW, offsetY + rackH); ctx.stroke();

            // Aisle zone (dashed border)
            var aisleX = offsetX + rackW;
            ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.8;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(aisleX, offsetY, aisleW_Px, rackH);
            ctx.setLineDash([]);

            // Aisle label
            ctx.fillStyle = '#9ca3af';
            ctx.font = '700 9px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('AISLE', aisleX + aisleW_Px / 2, offsetY + rackH / 2 - 6);
            ctx.fillText(aisleW.toFixed(1) + ' m', aisleX + aisleW_Px / 2, offsetY + rackH / 2 + 7);

            // Forklift icon in aisle
            this.drawForkliftIcon(ctx, aisleX + aisleW_Px / 2 - 10, offsetY + rackH - 28, sc);

            // Dimensions
            var dimTopY = offsetY - 16;
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: dimTopY, endX: offsetX + rackW, endY: dimTopY,
                label: 'Rack ' + rackDepth.toFixed(1) + ' m', isHorizontal: true
            });
            this.drawDimensionLine(ctx, {
                startX: aisleX, startY: dimTopY, endX: aisleX + aisleW_Px, endY: dimTopY,
                label: 'Aisle ' + aisleW.toFixed(1) + ' m', isHorizontal: true
            });
            var dimX = offsetX - 16;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY, endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeight), isHorizontal: false
            });

            // Title
            ctx.fillStyle = '#9ca3af';
            ctx.font = '700 8px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SIDE SECTION', w / 2, pad - 8);
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

        // ===== Initialize interactive mode (NEW: numeric inputs) =====
        initInteractive: function () {
            var engine = this;

            engine.calculate();

            // Map of numeric input IDs to param keys
            var inputMap = {
                'param-length': 'warehouseLength',
                'param-width': 'warehouseWidth',
                'param-height': 'warehouseHeight',
                'param-col-x': 'columnSpacingX',
                'param-col-y': 'columnSpacingY',
                'param-pallet-w': 'palletWidth',
                'param-pallet-d': 'palletDepth',
                'param-pallet-h': 'palletHeight',
                'param-rack-width': 'rackWidth',
                'param-rack-depth': 'rackDepth',
                'param-rack-height': 'rackHeight',
                'param-beam-h': 'beamHeight',
                'param-upright-d': 'uprightDepth',
                'param-levels': 'levels',
                'param-pallets-level': 'palletsPerLevel',
                'param-aisle-selective': 'aisleWidth',
                'param-aisle-drivein': 'aisleWidth',
                'param-aisle-shuttle': 'aisleWidth'
            };

            var debouncedDraw = debounce(function () {
                engine.calculate();
                engine.drawAll();
                engine.updateStats();
                engine.updateRecommendation();
                engine.updateStatus();
            }, 150);

            // Bind numeric inputs
            Object.keys(inputMap).forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', function () {
                    var key = inputMap[id];
                    var val = parseFloat(this.value) || 0;
                    engine.params[key] = val;
                    debouncedDraw();
                });
            });

            // Bind racking type selector
            var rackingSelect = document.getElementById('param-rack-type');
            if (rackingSelect) {
                rackingSelect.addEventListener('change', function () {
                    engine.setParam('rackingType', this.value);
                    debouncedDraw();
                });
            }

            // Bind slider tracks (sync with number inputs)
            var sliderPairs = [
                { slider: 'slider-aisle-selective', input: 'param-aisle-selective' },
                { slider: 'slider-aisle-drivein', input: 'param-aisle-drivein' },
                { slider: 'slider-aisle-shuttle', input: 'param-aisle-shuttle' }
            ];
            sliderPairs.forEach(function (pair) {
                var slider = document.getElementById(pair.slider);
                var input = document.getElementById(pair.input);
                if (!slider || !input) return;
                slider.addEventListener('input', function () {
                    input.value = this.value;
                    engine.params.aisleWidth = parseFloat(this.value);
                    debouncedDraw();
                });
                input.addEventListener('input', function () {
                    slider.value = this.value;
                });
            });

            // Initial draw
            engine.calculate();
            setTimeout(function () {
                engine.drawAll();
                engine.updateStats();
                engine.updateRecommendation();
                engine.updateStatus();
            }, 100);
        },

        // ===== Update stats panel =====
        updateStats: function () {
            var s = this.stats;
            var s1 = document.getElementById('stat-positions');
            if (s1) s1.textContent = s.totalPositions.toLocaleString();
            var s2 = document.getElementById('stat-utilization');
            if (s2) s2.textContent = s.spaceUtilization + '%';
            var s3 = document.getElementById('stat-rows');
            if (s3) s3.textContent = s.rackBlockCount;
            var s4 = document.getElementById('stat-cost');
            if (s4) s4.textContent = '¥' + s.estimatedCostCNY.toLocaleString('en-US');
        },

        // ===== Update status bar =====
        updateStatus: function () {
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];
            var el = document.getElementById('status-racking-type');
            if (el) el.textContent = preset.name;
            var el2 = document.getElementById('status-positions');
            if (el2) el2.textContent = this.stats.totalPositions.toLocaleString() + ' pallet positions';
            var el3 = document.getElementById('status-dimensions');
            if (el3) el3.textContent = p.warehouseLength + 'm × ' + p.warehouseWidth + 'm';
        },

        // ===== Update mini recommendation =====
        updateRecommendation: function () {
            var el = document.getElementById('stat-recommendation');
            if (!el) return;
            var p = this.params;
            var rec = '';
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

    window.LayoutEngine = LayoutEngine;
})();
