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

        // ===== Draw CAD-style dimension line =====
        drawDimensionLine: function (ctx, opts) {
            var color = opts.color || '#374151';
            var fontSize = opts.fontSize || 10;
            var tickLen = 4;
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 0.8;
            if (opts.isHorizontal !== false) {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(opts.startX, opts.startY - tickLen); ctx.lineTo(opts.startX, opts.startY + tickLen); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(opts.endX, opts.endY - tickLen); ctx.lineTo(opts.endX, opts.endY + tickLen); ctx.stroke();
                ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(opts.label, (opts.startX + opts.endX) / 2, opts.startY - 2);
            } else {
                ctx.beginPath();
                ctx.moveTo(opts.startX, opts.startY);
                ctx.lineTo(opts.endX, opts.endY);
                ctx.stroke();
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(opts.startX - tickLen, opts.startY); ctx.lineTo(opts.startX + tickLen, opts.startY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(opts.endX - tickLen, opts.endY); ctx.lineTo(opts.endX + tickLen, opts.endY); ctx.stroke();
                ctx.save();
                ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.translate(opts.startX - 6, (opts.startY + opts.endY) / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(opts.label, 0, 0);
                ctx.restore();
            }
        },

        formatDimension: function (meters) { return meters.toFixed(1) + ' m'; },

        // ===== Draw building columns =====
        drawBuildingColumns: function (ctx, pad, drawW, drawH, scale) {
            var p = this.params;
            var colSizeM = p.columnSize / 1000;
            var colSizePx = Math.max(4, colSizeM * scale);
            ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = 0.5;
            for (var x = p.columnSpacingX; x < p.warehouseLength; x += p.columnSpacingX) {
                for (var y = p.columnSpacingY; y < p.warehouseWidth; y += p.columnSpacingY) {
                    var cx = pad + x * scale - colSizePx / 2;
                    var cy = pad + y * scale - colSizePx / 2;
                    ctx.fillRect(cx, cy, colSizePx, colSizePx);
                    ctx.strokeRect(cx, cy, colSizePx, colSizePx);
                }
            }
        },

        // ===== Draw top-down view (benchmark style: clean, CAD-like) =====
        drawTopView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

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

            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            // Light CAD grid (5m)
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 0.5;
            for (var gx = 0; gx <= p.warehouseLength; gx += 5) {
                var gxPx = pad + gx * sc;
                ctx.beginPath(); ctx.moveTo(gxPx, pad); ctx.lineTo(gxPx, pad + p.warehouseWidth * sc); ctx.stroke();
            }
            for (var gy = 0; gy <= p.warehouseWidth; gy += 5) {
                var gyPx = pad + gy * sc;
                ctx.beginPath(); ctx.moveTo(pad, gyPx); ctx.lineTo(pad + p.warehouseLength * sc, gyPx); ctx.stroke();
            }

            // Major grid (10m)
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 0.7;
            for (var gx2 = 0; gx2 <= p.warehouseLength; gx2 += 10) {
                var gxPx2 = pad + gx2 * sc;
                ctx.beginPath(); ctx.moveTo(gxPx2, pad); ctx.lineTo(gxPx2, pad + p.warehouseWidth * sc); ctx.stroke();
            }
            for (var gy2 = 0; gy2 <= p.warehouseWidth; gy2 += 10) {
                var gyPx2 = pad + gy2 * sc;
                ctx.beginPath(); ctx.moveTo(pad, gyPx2); ctx.lineTo(pad + p.warehouseLength * sc, gyPx2); ctx.stroke();
            }

            // Warehouse outline
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 2;
            ctx.strokeRect(pad, pad, p.warehouseLength * sc, p.warehouseWidth * sc);

            // Building columns
            this.drawBuildingColumns(ctx, pad, p.warehouseLength * sc, p.warehouseWidth * sc, sc);

            // Draw rack rows
            var aisleW = p.aisleWidth || preset.aisleWidth;
            var blockDepth = preset.rackDepth * 2 + 0.8;
            var bayWidth = preset.rackWidth;

            for (var i = 0; i < this.rows.length; i++) {
                var row = this.rows[i];
                var rowYPx = pad + row.y * sc;
                var blockDepthPx = row.blockDepth * sc;

                // Aisle area
                if (i > 0) {
                    var aisleStartPx = pad + (this.rows[i - 1].y + this.rows[i - 1].blockDepth) * sc;
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
                    ctx.fillRect(pad, aisleStartPx, p.warehouseLength * sc, rowYPx - aisleStartPx);
                }

                // Rack block — warm tan/brown fill (benchmark style)
                ctx.fillStyle = 'rgba(212, 168, 107, 0.35)';
                ctx.fillRect(pad + 8, rowYPx, p.warehouseLength * sc - 16, blockDepthPx);

                // Rack block border
                ctx.strokeStyle = '#1a365d';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(pad + 8, rowYPx, p.warehouseLength * sc - 16, blockDepthPx);

                // Center line (double-sided divider)
                var centerY = rowYPx + blockDepthPx / 2;
                ctx.strokeStyle = 'rgba(26, 54, 93, 0.2)';
                ctx.lineWidth = 0.8;
                ctx.setLineDash([4, 3]);
                ctx.beginPath(); ctx.moveTo(pad + 8, centerY); ctx.lineTo(pad + p.warehouseLength * sc - 8, centerY); ctx.stroke();
                ctx.setLineDash([]);

                // Bay dividers
                var bayPx = bayWidth * sc;
                ctx.strokeStyle = 'rgba(26, 54, 93, 0.15)';
                ctx.lineWidth = 0.5;
                for (var b = 1; b < row.baysPerRow; b++) {
                    var bx = pad + 8 + b * bayPx;
                    if (bx > pad + p.warehouseLength * sc - 8) break;
                    ctx.beginPath(); ctx.moveTo(bx, rowYPx); ctx.lineTo(bx, rowYPx + blockDepthPx); ctx.stroke();
                }

                // Row label
                ctx.fillStyle = '#1a365d';
                ctx.font = 'bold 10px -apple-system, sans-serif';
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText('ROW ' + (i + 1), pad + 12, rowYPx + blockDepthPx / 2);

                // Position count
                ctx.textAlign = 'right';
                var bayPositions = p.palletsPerLevel * p.levels;
                ctx.fillText(row.baysPerRow * 2 * bayPositions + ' pos', pad + p.warehouseLength * sc - 12, rowYPx + blockDepthPx / 2);
            }

            // Loading zone
            var entranceSize = 3;
            var loadingTopY = pad + p.warehouseWidth * sc - entranceSize * sc;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.fillRect(pad, loadingTopY, p.warehouseLength * sc, entranceSize * sc);
            ctx.fillStyle = '#059669';
            ctx.font = '600 10px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Loading Zone (' + entranceSize + 'm)', pad + p.warehouseLength * sc / 2, loadingTopY + entranceSize * sc / 2);

            // Dimension lines
            var dimOffset = 14;
            ctx.strokeStyle = '#374151'; ctx.fillStyle = '#374151'; ctx.lineWidth = 0.8;
            // Top
            ctx.beginPath(); ctx.moveTo(pad, pad - dimOffset); ctx.lineTo(pad + p.warehouseLength * sc, pad - dimOffset); ctx.stroke();
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(pad, pad - dimOffset - 3); ctx.lineTo(pad, pad - dimOffset + 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad + p.warehouseLength * sc, pad - dimOffset - 3); ctx.lineTo(pad + p.warehouseLength * sc, pad - dimOffset + 3); ctx.stroke();
            ctx.font = 'bold 10px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(p.warehouseLength + ' m', pad + p.warehouseLength * sc / 2, pad - dimOffset - 2);

            // Left
            ctx.strokeStyle = '#374151'; ctx.fillStyle = '#374151'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(pad - dimOffset, pad); ctx.lineTo(pad - dimOffset, pad + p.warehouseWidth * sc); ctx.stroke();
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(pad - dimOffset - 3, pad); ctx.lineTo(pad - dimOffset + 3, pad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad - dimOffset - 3, pad + p.warehouseWidth * sc); ctx.lineTo(pad - dimOffset + 3, pad + p.warehouseWidth * sc); ctx.stroke();
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.translate(pad - dimOffset - 4, pad + p.warehouseWidth * sc / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(p.warehouseWidth + ' m', 0, 0);
            ctx.restore();

            // Scale bar
            var scaleBarM = this.getScaleBarM(p.warehouseLength);
            var scaleBarPx = scaleBarM * sc;
            var sbX = pad;
            var sbY = h - 10;
            ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + scaleBarPx, sbY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX, sbY - 4); ctx.lineTo(sbX, sbY + 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX + scaleBarPx, sbY - 4); ctx.lineTo(sbX + scaleBarPx, sbY + 4); ctx.stroke();
            ctx.fillStyle = '#374151'; ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(scaleBarM + ' m', sbX + scaleBarPx / 2, sbY - 6);

            // Bottom label
            ctx.fillStyle = '#6b7280';
            ctx.font = '9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(preset.name + ' · ' + this.rows.length + ' row(s) · ' + this.stats.totalPositions.toLocaleString() + ' positions', pad + p.warehouseLength * sc / 2, h - 2);
        },

        // ===== Draw front elevation =====
        drawFrontView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

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

            // Ground line + hatch
            ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad - 10, pad + drawH); ctx.lineTo(pad + drawW + 10, pad + drawH); ctx.stroke();
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.15)'; ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath(); ctx.moveTo(gx, pad + drawH); ctx.lineTo(gx - 4, pad + drawH + 4); ctx.stroke();
            }

            // Upright frames
            var uprightWidth = 0.08;
            var uprightPxW = Math.max(2, uprightWidth * sc);
            var numUprights = palletsPerBay + 1;
            ctx.fillStyle = '#1a365d';
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
                ctx.fillStyle = '#1a365d';
                ctx.fillRect(offsetX, ly, rackW, beamPxH);

                var palletH = levelHeight * 0.6;
                var palletPxH = palletH * sc;
                var palletGap = 0.15;
                var palletPxGap = palletGap * sc;
                ctx.fillStyle = 'rgba(212, 168, 107, 0.4)';
                for (var pl = 0; pl < palletsPerBay; pl++) {
                    var px = offsetX + pl * bayWidth * sc + palletPxGap;
                    var pw = bayWidth * sc - palletPxGap * 2;
                    ctx.fillRect(px, ly - palletPxH, pw, palletPxH);
                    ctx.strokeStyle = 'rgba(26, 54, 93, 0.2)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, ly - palletPxH, pw, palletPxH);
                }
            }

            // Height dimension
            this.drawDimensionLine(ctx, {
                startX: offsetX - 14, startY: offsetY,
                endX: offsetX - 14, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeight),
                isHorizontal: false
            });

            // Level labels
            ctx.font = '600 8px -apple-system, sans-serif';
            ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + rackW + 4, levelY + 3);
            }

            // Bottom dimension
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: pad + drawH + 14,
                endX: offsetX + rackW, endY: pad + drawH + 14,
                label: bayWidth.toFixed(1) + ' m', isHorizontal: true
            });

            // Title
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 8px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FRONT ELEVATION', w / 2, pad - 8);
        },

        // ===== Draw side section =====
        drawSideView: function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var p = this.params;
            var preset = RACKING_PRESETS[p.rackingType] || RACKING_PRESETS['selective-heavy'];

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

            // Ground
            ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad - 10, pad + drawH); ctx.lineTo(pad + drawW + 10, pad + drawH); ctx.stroke();
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.15)'; ctx.lineWidth = 0.5;
            for (var gx = pad - 10; gx < pad + drawW + 10; gx += 6) {
                ctx.beginPath(); ctx.moveTo(gx, pad + drawH); ctx.lineTo(gx - 4, pad + drawH + 4); ctx.stroke();
            }

            // Rack block
            ctx.fillStyle = 'rgba(212, 168, 107, 0.3)';
            ctx.fillRect(offsetX, offsetY, rackW, rackH);
            ctx.strokeStyle = '#1a365d'; ctx.lineWidth = 1.2;
            ctx.strokeRect(offsetX, offsetY, rackW, rackH);

            // Level dividers
            var levelHeight = warehouseHeight / levels;
            ctx.strokeStyle = 'rgba(26, 54, 93, 0.2)'; ctx.lineWidth = 0.8;
            ctx.setLineDash([3, 3]);
            for (var lv = 1; lv < levels; lv++) {
                var ly = offsetY + lv * levelHeight * sc;
                ctx.beginPath(); ctx.moveTo(offsetX, ly); ctx.lineTo(offsetX + rackW, ly); ctx.stroke();
            }
            ctx.setLineDash([]);

            // Level labels
            ctx.fillStyle = '#1a365d';
            ctx.font = '600 8px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            for (var lv2 = 0; lv2 < levels; lv2++) {
                var levelY2 = offsetY + rackH - (lv2 + 0.5) * levelHeight * sc;
                ctx.fillText('L' + (lv2 + 1), offsetX + 3, levelY2 + 3);
            }

            // Aisle zone
            var aisleX = offsetX + rackW;
            ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.8;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(aisleX, offsetY, aisleW_Px, rackH);
            ctx.setLineDash([]);

            ctx.fillStyle = '#9ca3af';
            ctx.font = '600 9px -apple-system, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('AISLE', aisleX + aisleW_Px / 2, offsetY + rackH / 2 - 6);
            ctx.fillText(aisleW.toFixed(1) + ' m', aisleX + aisleW_Px / 2, offsetY + rackH / 2 + 7);

            // Forklift icon
            var forkX = aisleX + aisleW_Px / 2;
            var forkY = offsetY + rackH - 12;
            ctx.fillStyle = '#d97706';
            ctx.fillRect(forkX - 8, forkY - 6, 16, 7);
            ctx.fillStyle = '#6b7280';
            ctx.beginPath(); ctx.arc(forkX - 6, forkY + 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(forkX + 6, forkY + 3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(forkX - 7, forkY - 6); ctx.lineTo(forkX - 7, forkY - 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(forkX - 7, forkY - 13); ctx.lineTo(forkX - 3, forkY - 13); ctx.stroke();

            // Dimensions
            var dimTopY = offsetY - 14;
            this.drawDimensionLine(ctx, {
                startX: offsetX, startY: dimTopY, endX: offsetX + rackW, endY: dimTopY,
                label: 'Rack ' + rackDepth.toFixed(1) + ' m', isHorizontal: true
            });
            this.drawDimensionLine(ctx, {
                startX: aisleX, startY: dimTopY, endX: aisleX + aisleW_Px, endY: dimTopY,
                label: 'Aisle ' + aisleW.toFixed(1) + ' m', isHorizontal: true
            });
            var dimX = offsetX - 14;
            this.drawDimensionLine(ctx, {
                startX: dimX, startY: offsetY, endX: dimX, endY: offsetY + rackH,
                label: this.formatDimension(warehouseHeight), isHorizontal: false
            });

            // Title
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 8px -apple-system, sans-serif';
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
