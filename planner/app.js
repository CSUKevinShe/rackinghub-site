/*
 * RackingHub Planner — app.js
 * 推荐引擎 + 表单管理 + Canvas 布局 + 页面交互
 * Benchmark-rebuilt: numeric inputs + tab switching
 */

(function () {
    'use strict';

    // ===== 全局命名空间 =====
    window.App = {};

    // ===== 状态管理 =====
    var state = {
        currentStep: 1,
        contactData: {},
        specsData: {},
        recommendations: [],
        products: [],
        cases: [],
        loaded: false
    };

    // ===== 货币换算 =====
    // 近似汇率 (1 CNY = X 目标货币), 定期更新
    var EXCHANGE_RATES = {
        CNY: { rate: 1,       symbol: '¥',  name: 'CNY' },
        USD: { rate: 0.138,   symbol: '$',  name: 'USD' },
        EUR: { rate: 0.127,   symbol: '€',  name: 'EUR' },
        GBP: { rate: 0.109,   symbol: '£',  name: 'GBP' },
        AUD: { rate: 0.213,   symbol: 'A$', name: 'AUD' }
    };

    var currentCurrency = 'CNY';

    function formatCurrency(cnyAmount) {
        var cur = EXCHANGE_RATES[currentCurrency] || EXCHANGE_RATES.CNY;
        var converted = Math.round(cnyAmount * cur.rate);
        return cur.symbol + converted.toLocaleString('en-US');
    }
    // Expose globally so layout-engine.js can use it
    window.formatCurrency = formatCurrency;

    function getCurrencyInfo() {
        return EXCHANGE_RATES[currentCurrency];
    }

    function setCurrency(code) {
        if (EXCHANGE_RATES[code]) {
            currentCurrency = code;
            var cur = EXCHANGE_RATES[code];
            // 更新汇率提示
            var rateEl = document.getElementById('currency-rate');
            if (rateEl) {
                if (code === 'CNY') {
                    rateEl.textContent = '1 CNY = 1.00 CNY';
                } else {
                    rateEl.textContent = '1 CNY ≈ ' + cur.rate + ' ' + cur.name;
                }
            }
        }
    }

    // 绑定货币选择器事件
    function initCurrencySelector() {
        var sel = document.getElementById('currency-select');
        if (!sel) return;
        sel.addEventListener('change', function () {
            setCurrency(sel.value);
            // 重新渲染所有价格显示
            if (state.recommendations && state.recommendations.length > 0) {
                renderComparisonTable(state.recommendations);
            }
            if (typeof LayoutEngine !== 'undefined' && LayoutEngine.stats) {
                LayoutEngine.updateStats();
            }
        });
    }

    // ===== localStorage 持久化 =====
    var STORAGE_KEY = 'rackinghub_planner_progress';
    var STORAGE_VERSION = 1;

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                v: STORAGE_VERSION,
                step: state.currentStep,
                contact: state.contactData,
                specs: state.specsData,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            var data = JSON.parse(saved);
            if (!data.v || data.v !== STORAGE_VERSION) return;
            if (Date.now() - data.timestamp > 86400000) return;
            if (data.contact && Object.keys(data.contact).length > 0) {
                state.contactData = data.contact;
                state.specsData = data.specs || {};
                if (data.step >= 3) {
                    state.currentStep = 2;
                } else {
                    state.currentStep = data.step || 1;
                }
            }
        } catch (e) {}
    }

    function restoreFormFields() {
        // No-op: contact page removed, no form fields to restore
    }

    function clearProgress() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // ===== 页面导航 =====
    function showPage(pageId) {
        var pages = document.querySelectorAll('.page');
        pages.forEach(function (p) { p.classList.remove('active'); });
        var target = document.getElementById(pageId);
        if (target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    App.goToStep = function (step) {
        state.currentStep = step;
        saveProgress();
        var pageMap = { 1: 'page-landing', 2: 'page-specs', 3: 'page-results' };
        showPage(pageMap[step] || 'page-landing');

        // Initialize interactive layout when entering specs page
        if (step === 2 && typeof LayoutEngine !== 'undefined') {
            setTimeout(function () {
                var canvas = document.getElementById('canvas-top');
                if (canvas && !canvas.dataset.initialized) {
                    canvas.dataset.initialized = '1';
                    LayoutEngine.initInteractive();
                }
            }, 200);
        }
    };

    // ===== 数据加载 =====
    function loadData() {
        fetch('data/cases.json')
            .then(function (r) { return r.json(); })
            .then(function (cases) {
                state.cases = cases;
                renderCases();
            })
            .catch(function () { state.cases = []; });

        fetch('data/products.json')
            .then(function (r) { return r.json(); })
            .then(function (products) {
                state.products = products;
                state.loaded = true;
            })
            .catch(function () {
                state.products = [];
                state.loaded = true;
            });
    }

    // ===== 渲染案例卡片 =====
    function renderCases() {
        var container = document.getElementById('cases-grid');
        if (!container || !state.cases.length) return;
        var html = '';
        state.cases.forEach(function (c) {
            var highlightsHtml = '';
            if (c.highlights) {
                highlightsHtml = '<ul class="case-highlights">';
                c.highlights.forEach(function (h) { highlightsHtml += '<li>' + escapeHtml(h) + '</li>'; });
                highlightsHtml += '</ul>';
            }
            html += '<div class="case-card">'
                + '<div class="case-header">'
                    + '<div class="case-region">' + escapeHtml(c.region) + '</div>'
                    + '<div class="case-title">' + escapeHtml(c.title) + '</div>'
                    + '<div class="case-location">📍 ' + escapeHtml(c.location) + '</div>'
                + '</div>'
                + '<div class="case-body">'
                    + '<div class="case-meta">'
                        + '<span class="case-meta-item">🏢 ' + escapeHtml(c.warehouse_area) + '</span>'
                        + '<span class="case-meta-item">' + (c.racking_icon || '') + ' ' + escapeHtml(c.racking_type) + '</span>'
                    + '</div>'
                    + '<p class="case-desc">' + escapeHtml(c.description) + '</p>'
                    + highlightsHtml
                + '</div>'
            + '</div>';
        });
        container.innerHTML = html;
    }

    // ===== 仓库规格表单提交 → 生成方案 =====
    App.generatePlan = function () {
        // Collect specs from LayoutEngine params (interactive mode)
        var useInteractive = (typeof LayoutEngine !== 'undefined' && LayoutEngine.stats.totalPositions > 0);
        var p = useInteractive ? LayoutEngine.params : null;

        state.specsData = {
            length: p ? p.warehouseLength : 60,
            width: p ? p.warehouseWidth : 40,
            height: p ? p.warehouseHeight : 6,
            floorLoad: 5000,
            palletWeight: parseInt(document.getElementById('param-pallet-weight')?.value || 1000, 10),
            skuCount: 500,
            frequency: 'medium',
            rotation: 'either',
            interactiveLevels: p ? p.levels : 4,
            interactivePallets: p ? p.palletsPerLevel : 2,
            interactiveRackingType: p ? p.rackingType : 'selective-heavy'
        };

        saveProgress();
        state.currentStep = 3;
        saveProgress();
        showPage('page-results');
        renderSpecsSummary();

        document.getElementById('results-loading').style.display = 'block';
        document.getElementById('results-content').style.display = 'none';

        setTimeout(function () {
            var recs = generateRecommendations();
            state.recommendations = recs;
            renderRecommendations(recs);
            renderComparisonTable(recs);
            renderLayout(recs[0]);
            if (typeof LayoutEngine !== 'undefined') {
                LayoutEngine.updateStats();
                // Use rAF to ensure Canvas pixels are flushed before copying to thumbnails
                requestAnimationFrame(function () {
                    if (typeof App._drawThumbnails === 'function') App._drawThumbnails();
                });
            }
            document.getElementById('results-loading').style.display = 'none';
            document.getElementById('results-content').style.display = 'block';
        }, 1800);
    };

    // ===== 渲染仓库规格摘要 =====
    function renderSpecsSummary() {
        var s = state.specsData;
        var container = document.getElementById('results-summary');
        if (!container) return;
        container.innerHTML =
            '<span class="spec-badge"><strong>' + s.length + 'm</strong> × <strong>' + s.width + 'm</strong></span>'
            + '<span class="spec-badge">Height: <strong>' + s.height + 'm</strong></span>'
            + '<span class="spec-badge">Pallet Weight: <strong>' + s.palletWeight + 'kg</strong></span>'
            + '<span class="spec-badge">SKUs: <strong>' + (s.skuCount || 'N/A') + '</strong></span>'
            + '<span class="spec-badge">Rotation: <strong>' + s.rotation.toUpperCase() + '</strong></span>';
    }

    // ============================================================
    //  推荐引擎 — 多维度评分系统
    // ============================================================
    function generateRecommendations() {
        var products = state.products;
        var specs = state.specsData;
        if (!products.length) return getDefaultRecommendations();

        var scores = products.map(function (product) {
            return { product: product, score: calculateScore(product, specs) };
        });
        scores.sort(function (a, b) { return b.score.total - a.score.total; });

        return scores.slice(0, 3).map(function (s, index) {
            return { rank: index + 1, product: s.product, score: s.score, isBest: index === 0 };
        });
    }

    function calculateScore(product, specs) {
        // 1. 承重匹配度 (30%)
        var loadScore = 0;
        if (product.max_load_per_level >= specs.palletWeight) {
            var ratio = product.max_load_per_level / specs.palletWeight;
            loadScore = Math.min(100, ratio <= 2 ? ratio * 50 : 100 - (ratio - 2) * 10);
            loadScore = Math.max(50, loadScore);
        } else {
            loadScore = (product.max_load_per_level / specs.palletWeight) * 40;
        }

        // 2. 存取效率匹配 (25%)
        var accessScore = calculateAccessScore(product, specs);
        // 3. 空间利用率 (25%)
        var spaceScore = calculateSpaceScore(product, specs);
        // 4. 成本效率 (20%)
        var costScore = calculateCostScore(product, specs);

        var total = loadScore * 0.30 + accessScore * 0.25 + spaceScore * 0.25 + costScore * 0.20;
        return {
            total: Math.round(total * 10) / 10,
            load: Math.round(loadScore * 10) / 10,
            access: Math.round(accessScore * 10) / 10,
            space: Math.round(spaceScore * 10) / 10,
            cost: Math.round(costScore * 10) / 10
        };
    }

    function calculateAccessScore(product, specs) {
        var score = 50;
        var sku = specs.skuCount || 100;
        var freq = specs.frequency;
        var rotation = specs.rotation;

        if (sku <= 20) {
            if (product.access_type === 'drive-in' || product.access_type === 'shuttle') score += 30;
            else score += 10;
        } else if (sku <= 100) {
            if (product.access_type === 'shuttle' || product.access_type === 'push-back') score += 25;
            else if (product.access_type === 'selective' || product.access_type === 'vna-selective') score += 20;
            else score += 5;
        } else {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') score += 30;
            else score -= 20;
        }

        if (freq === 'high') {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') score += 20;
            else score -= 10;
        } else if (freq === 'low') {
            if (product.access_type === 'drive-in' || product.access_type === 'drive-through' || product.access_type === 'push-back') score += 15;
        }

        if (rotation === 'fifo' && !product.supports_fifo) score -= 30;
        if (rotation === 'lifo' && !product.supports_lifo) score -= 30;

        return Math.max(0, Math.min(100, score));
    }

    function calculateSpaceScore(product, specs) {
        var score = 50;
        if (specs.height > 8) {
            if (product.access_type === 'vna-selective' || product.access_type === 'shuttle') score += 30;
            var maxH = Math.max.apply(null, product.upright_height_options);
            if (maxH < specs.height) score -= 10;
        }
        if (specs.height < 4.5) {
            if (product.access_type === 'selective') score += 20;
            if (product.access_type === 'vna-selective') score -= 15;
        }
        var area = specs.length * specs.width;
        if (area < 800) {
            if (product.storage_density_pct >= 70) score += 25;
        } else {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') score += 15;
        }
        return Math.max(0, Math.min(100, score));
    }

    function calculateCostScore(product, specs) {
        var allPrices = state.products.map(function (p) { return p.price_per_position_cny; });
        var minPrice = Math.min.apply(null, allPrices);
        var maxPrice = Math.max.apply(null, allPrices);
        var range = maxPrice - minPrice || 1;
        var normalized = 1 - (product.price_per_position_cny - minPrice) / range;
        return 20 + normalized * 80;
    }

    function getDefaultRecommendations() {
        return [
            {
                rank: 1, product: {
                    id: 'selective-heavy', name: 'Heavy-Duty Selective Racking',
                    description: 'The most versatile pallet racking system offering 100% direct access to every pallet position.',
                    max_load_per_level: 3000, storage_density_pct: 35, aisle_width: 3.2,
                    upright_height_options: [3, 4, 5, 6, 7, 8, 9, 10],
                    price_per_position_cny: 120, supports_fifo: true, supports_lifo: true
                },
                score: { total: 87.5, load: 95, access: 85, space: 80, cost: 85 }, isBest: true
            },
            {
                rank: 2, product: {
                    id: 'radio-shuttle', name: 'Radio Shuttle Racking',
                    description: 'Semi-automated high-density system using remote-controlled shuttle carts.',
                    max_load_per_level: 2500, storage_density_pct: 70, aisle_width: 3.0,
                    upright_height_options: [4, 5, 6, 7, 8, 9, 10, 12],
                    price_per_position_cny: 200, supports_fifo: true, supports_lifo: true
                },
                score: { total: 78.2, load: 85, access: 70, space: 85, cost: 65 }, isBest: false
            },
            {
                rank: 3, product: {
                    id: 'drive-in', name: 'Drive-In Racking',
                    description: 'High-density storage system where forklifts drive directly into the racking lanes.',
                    max_load_per_level: 2000, storage_density_pct: 75, aisle_width: 3.0,
                    upright_height_options: [4, 5, 6, 7, 8, 9, 10, 12],
                    price_per_position_cny: 150, supports_fifo: false, supports_lifo: true
                },
                score: { total: 72.0, load: 70, access: 60, space: 88, cost: 75 }, isBest: false
            }
        ];
    }

    // ===== 渲染推荐卡片 =====
    function renderRecommendations(recs) {
        var container = document.getElementById('recommendations');
        if (!container) return;
        var html = '';
        recs.forEach(function (rec) {
            var bestBadge = rec.isBest ? '<div class="rec-badge">★ Recommended</div>' : '';
            var rankLabel = rec.rank === 1 ? 'Top Pick' : 'Option #' + rec.rank;
            html += '<div class="rec-card' + (rec.isBest ? ' best' : '') + '">'
                + bestBadge
                + '<div class="rec-header">'
                    + '<div class="rec-rank">' + rankLabel + '</div>'
                    + '<div class="rec-name">' + escapeHtml(rec.product.name) + '</div>'
                    + '<div class="rec-score">'
                        + '<div class="rec-score-bar"><div class="rec-score-fill" style="width:' + rec.score.total + '%"></div></div>'
                        + '<span class="rec-score-text">' + rec.score.total + '/100</span>'
                    + '</div>'
                + '</div>'
                + '<div class="rec-body">'
                    + '<p class="rec-desc">' + escapeHtml(rec.product.description) + '</p>'
                    + '<div class="rec-metrics">'
                        + '<div class="rec-metric"><div class="rec-metric-value">' + formatNumber(rec.product.max_load_per_level) + 'kg</div><div class="rec-metric-label">Max Load/Level</div></div>'
                        + '<div class="rec-metric"><div class="rec-metric-value">' + rec.product.storage_density_pct + '%</div><div class="rec-metric-label">Space Utilization</div></div>'
                        + '<div class="rec-metric"><div class="rec-metric-value">' + rec.score.load + '</div><div class="rec-metric-label">Load Score</div></div>'
                        + '<div class="rec-metric"><div class="rec-metric-value">' + rec.score.access + '</div><div class="rec-metric-label">Access Score</div></div>'
                    + '</div>'
                    + '<div class="rec-pros"><h4>Key Advantages</h4><ul>';
            getPros(rec.product, state.specsData).forEach(function (p) { html += '<li>' + escapeHtml(p) + '</li>'; });
            html += '</ul></div></div></div>';
        });
        container.innerHTML = html;
    }

    function getPros(product, specs) {
        var pros = [];
        if (product.access_type === 'selective') pros.push('100% direct pallet accessibility');
        if (product.storage_density_pct >= 70) pros.push('High space utilization (' + product.storage_density_pct + '%)');
        if (product.access_type === 'vna-selective') pros.push('Narrow aisles (' + product.aisle_width + 'm) save floor space');
        if (product.supports_fifo && specs.rotation === 'fifo') pros.push('Supports FIFO rotation for your inventory needs');
        if (product.max_load_per_level >= specs.palletWeight * 1.5) pros.push('Generous load margin (' + product.max_load_per_level + 'kg vs ' + specs.palletWeight + 'kg needed)');
        if (product.access_type === 'shuttle') pros.push('Semi-automated — reduces forklift labor costs');
        if (product.access_type === 'drive-in') {
            var backBeam = document.getElementById('param-back-beam');
            if (backBeam && backBeam.checked) {
                pros.push('FIFO rotation with back beam (Drive-Through)');
            } else {
                pros.push('Lowest cost per pallet position (LIFO)');
            }
        }
        var positions = estimatePalletPositions(product, specs);
        pros.push('~' + formatNumber(positions) + ' pallet positions in your warehouse');
        return pros;
    }

    function estimatePalletPositions(product, specs) {
        if (!product || !specs || !specs.length || !specs.width || !product.aisle_width) return 0;
        var area = specs.length * specs.width;
        var aisleRatio = product.aisle_width / (product.aisle_width + 2.7);
        var usableArea = area * (1 - aisleRatio * 0.5);
        var palletPositions = Math.floor(usableArea / 2.5);
        var maxH = product.upright_height_options ? Math.max.apply(null, product.upright_height_options) : 10;
        var levels = Math.min(Math.floor(specs.height / 1.5), Math.ceil(maxH / 1.5));
        levels = Math.max(2, levels);
        return Math.floor(palletPositions * levels / 3);
    }

    // ===== 渲染对比表格 =====
    function renderComparisonTable(recs) {
        var table = document.getElementById('comparison-table');
        if (!table) return;
        var specs = state.specsData;
        var html = '<thead><tr><th>Criteria</th>';
        recs.forEach(function (rec) { html += '<th>' + escapeHtml(rec.product.name) + '</th>'; });
        html += '</tr></thead><tbody>';

        var rows = [
            { label: 'Match Score', getValue: function (r) { return r.score.total; }, best: 'high' },
            { label: 'Max Load / Level', getValue: function (r) { return r.product.max_load_per_level + ' kg'; }, best: 'high' },
            { label: 'Space Utilization', getValue: function (r) { return r.product.storage_density_pct + '%'; }, best: 'high' },
            { label: 'Aisle Width', getValue: function (r) { return r.product.aisle_width + ' m'; }, best: 'low' },
            { label: 'FIFO Support', getValue: function (r) { return r.product.supports_fifo ? '✓ Yes' : ' No'; }, best: 'yes' },
            { label: 'LIFO Support', getValue: function (r) { return r.product.supports_lifo ? '✓ Yes' : '✗ No'; }, best: 'yes' },
            { label: 'Est. Price per Position', getValue: function (r) { return formatCurrency(r.product.price_per_position_cny); }, best: 'low' },
            { label: 'Est. Pallet Positions', getValue: function (r) { return '~' + formatNumber(estimatePalletPositions(r.product, specs)); }, best: 'high' },
            { label: 'Est. Total Cost', getValue: function (r) { var p = estimatePalletPositions(r.product, specs) * r.product.price_per_position_cny; return formatCurrency(Math.round(p)); }, best: 'low' }
        ];

        rows.forEach(function (row) {
            html += '<tr><td>' + row.label + '</td>';
            var bestIdx = 0;
            recs.forEach(function (r, i) {
                var cls = i === bestIdx ? ' best-value' : '';
                html += '<td class="' + cls + '">' + row.getValue(r) + '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    // ===== Canvas 2D warehouse layout =====
    function renderLayout(rec) {
        if (!rec) return;
        var specs = state.specsData;
        var rackingType = specs.interactiveRackingType || 'selective-heavy';
        var levels = specs.interactiveLevels || Math.max(2, Math.floor(specs.height / 1.5));
        var pallets = specs.interactivePallets || 3;

        var RACKING_PRESETS = {
            'selective-heavy': { aisleWidth: 3.2, rackDepth: 1.0, rackWidth: 2.7 },
            'drive-in': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.4 },
            'radio-shuttle': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.7 }
        };
        var preset = RACKING_PRESETS[rackingType] || RACKING_PRESETS['selective-heavy'];

        if (typeof LayoutEngine !== 'undefined') {
            LayoutEngine.params.warehouseLength = specs.length;
            LayoutEngine.params.warehouseWidth = specs.width;
            LayoutEngine.params.rackingType = rackingType;
            LayoutEngine.params.levels = levels;
            LayoutEngine.params.palletsPerLevel = pallets;
            LayoutEngine.params.aisleWidth = preset.aisleWidth;
            LayoutEngine.calculate();

            // Draw on results page canvases
            LayoutEngine.drawTopView('canvas-top-results');
            LayoutEngine.drawFrontView('canvas-front-results');
            LayoutEngine.drawSideView('canvas-side-results');

            // Also draw on main canvases (for thumbnails + switchView)
            LayoutEngine.drawTopView('canvas-top');
            LayoutEngine.drawFrontView('canvas-front');
            LayoutEngine.drawSideView('canvas-side');

            // #8: Auto-fit canvas to fill viewport after drawing
            requestAnimationFrame(function () { App.autoFitCanvas(); });
        }
    };

    // ===== Reset to defaults =====
    App.resetDefaults = function () {
        var defaults = {
            'param-length': 60, 'param-width': 40, 'param-height': 6,
            'param-col-x': 15, 'param-col-y': 12,
            'param-pallet-w': 1200, 'param-pallet-d': 800, 'param-pallet-h': 1500, 'param-pallet-weight': 1000,
            'param-rack-type': 'selective-heavy',
            'param-rack-width': 2.7, 'param-rack-depth': 1.0, 'param-rack-height': 6.0,
            'param-beam-h': 120, 'param-first-beam-h': 2.5, 'param-btb-gap': 200,
            'param-levels': 4, 'param-pallets-level': 2,
            'param-aisle-selective': 3.2, 'param-aisle-drivein': 3.0, 'param-aisle-shuttle': 3.0,
            'param-clear-left': 0.5, 'param-clear-right': 0.5,
            'param-clear-front': 0.5, 'param-clear-back': 0.5
        };
        var sliderPairs = {
            'param-aisle-selective': 'slider-aisle-selective',
            'param-aisle-drivein': 'slider-aisle-drivein',
            'param-aisle-shuttle': 'slider-aisle-shuttle'
        };
        Object.keys(defaults).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = defaults[id];
            if (sliderPairs[id]) {
                var slider = document.getElementById(sliderPairs[id]);
                if (slider) slider.value = defaults[id];
            }
        });
        var backBeam = document.getElementById('param-back-beam');
        if (backBeam) backBeam.checked = false;
        var rackType = document.getElementById('param-rack-type');
        if (rackType) rackType.value = 'selective-heavy';
        if (typeof LayoutEngine !== 'undefined') {
            LayoutEngine.params.rackingType = 'selective-heavy';
            LayoutEngine.calculate();
            LayoutEngine.drawAll();
            LayoutEngine.updateStats();
            LayoutEngine.updateRecommendation();
            LayoutEngine.updateStatus();
        }
    };

    // ===== Canvas Zoom =====
    App._zoomLevel = 1.0;
    App.zoomCanvas = function (delta, fit) {
        if (fit) {
            App._zoomLevel = 1.0;
        } else {
            App._zoomLevel = Math.max(0.3, Math.min(3.0, App._zoomLevel + delta));
        }
        var display = document.getElementById('zoom-level');
        if (display) display.textContent = Math.round(App._zoomLevel * 100) + '%';
        // Apply zoom to all view canvases via CSS transform
        var canvases = document.querySelectorAll('.view-canvas, .view-canvas-sub');
        canvases.forEach(function (c) {
            c.style.transform = 'scale(' + App._zoomLevel + ')';
            c.style.transformOrigin = 'top left';
        });
    };

    // ===== Auto-fit canvas to fill viewport (#8) =====
    App.autoFitCanvas = function () {
        // Find the active (visible) canvas
        var activeCanvas = document.querySelector('.view-canvas.active-canvas');
        if (!activeCanvas) return;

        // Get container visible area
        var canvasBody = document.querySelector('.canvas-body');
        if (!canvasBody) return;
        var containerW = canvasBody.clientWidth;
        var containerH = canvasBody.clientHeight;
        if (!containerW || !containerH) return;

        // Get content dimensions from LayoutEngine
        if (typeof LayoutEngine === 'undefined' || !LayoutEngine.params) return;
        var p = LayoutEngine.params;
        var warehouseL = p.warehouseLength || 60;
        var warehouseW = p.warehouseWidth || 40;

        // Content footprint depends on view type
        var activeId = activeCanvas.id;
        var contentW, contentH;

        if (activeId === 'canvas-top') {
            // Top view: warehouse L x W
            contentW = warehouseL;
            contentH = warehouseW;
        } else if (activeId === 'canvas-front') {
            // Front view: warehouse L x height
            var wh = p.warehouseHeight || 6;
            contentW = warehouseL;
            contentH = wh;
        } else if (activeId === 'canvas-side') {
            // Side view: effective block depth x height
            var wh = p.warehouseHeight || 6;
            var blockDepth = (p.rackDepth || 1.0) * 2 + (p.backToBackGap || 200) / 1000;
            var rowsNeeded = LayoutEngine.stats ? LayoutEngine.stats.rowsNeeded : 1;
            var aisleW = p.aisleWidth || 3.2;
            var totalDepth = rowsNeeded * blockDepth + Math.max(0, rowsNeeded - 1) * aisleW;
            contentW = totalDepth;
            contentH = wh;
        } else {
            return;
        }

        if (!contentW || !contentH) return;

        // Canvas drawing uses pad=55 on each side, so usable area = canvas - 110
        // But we want content to fill the CONTAINER, not just the canvas area
        // The canvas itself is sized to container (up to 1200x600)
        // NOTE: canvas.clientWidth/Height can be 0 if canvas has no CSS sizing,
        // so always fall back to container dimensions.
        var canvasCSSW = activeCanvas.clientWidth || containerW;
        var canvasCSSH = activeCanvas.clientHeight || containerH;
        if (!canvasCSSW) canvasCSSW = containerW;
        if (!canvasCSSH) canvasCSSH = containerH;

        // How much of the canvas does the content occupy at scale=1.0 (no CSS transform)?
        // Content is drawn with scale = (canvasSize - 110) / contentSize
        // So at CSS scale=1.0, content occupies min((canvasW-110)/contentW, (canvasH-110)/contentH)
        // of the canvas. If this ratio is low, we need to zoom IN.
        var fillRatioX = (canvasCSSW - 110) / contentW;
        var fillRatioY = (canvasCSSH - 110) / contentH;
        var contentScale = Math.min(fillRatioX, fillRatioY);

        // Target: content should fill ~90% of the container
        // Current: contentScale pixels per meter, container has containerW/H pixels
        // content occupies contentSize * contentScale pixels
        var contentPixelW = contentW * contentScale;
        var contentPixelH = contentH * contentScale;
        var currentFillRatio = Math.min(contentPixelW / containerW, contentPixelH / containerH);

        // If content already fills > 65% of container, no need to zoom
        if (currentFillRatio > 0.65) return;

        // Compute zoom to fill 90%
        var targetZoom = Math.min(0.9 / Math.max(currentFillRatio, 0.1), 3.0);
        targetZoom = Math.max(targetZoom, 0.3);

        // Apply zoom
        App._zoomLevel = targetZoom;
        var display = document.getElementById('zoom-level');
        if (display) display.textContent = Math.round(targetZoom * 100) + '%';
        var allCanvases = document.querySelectorAll('.view-canvas, .view-canvas-sub');
        allCanvases.forEach(function (c) {
            c.style.transform = 'scale(' + targetZoom + ')';
            c.style.transformOrigin = 'top left';
        });
    };


    // ===== Copy Cost Button =====
    App.copyCost = function () {
        var costEl = document.getElementById('stat-cost');
        var btn = document.getElementById('cost-copy-btn');
        if (!costEl || !btn) return;
        var text = costEl.textContent.trim();
        if (!text) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopySuccess(btn);
            }).catch(function () {
                fallbackCopy(text, btn);
            });
        } else {
            fallbackCopy(text, btn);
        }
    };

    function fallbackCopy(text, btn) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopySuccess(btn); }
        catch (e) { showCopyFail(btn); }
        document.body.removeChild(ta);
    }

    function showCopySuccess(btn) {
        btn.classList.add('copied');
        btn.title = 'Copied!';
        setTimeout(function () { btn.classList.remove('copied'); btn.title = 'Copy amount'; }, 1500);
    }

    function showCopyFail(btn) {
        btn.title = 'Copy failed';
        setTimeout(function () { btn.title = 'Copy amount'; }, 1500);
    }

    // ===== View Switching (Top/Front/Side thumbnails) =====
    App._currentView = 'top';
    App.switchView = function (viewName) {
        if (viewName === App._currentView) return;
        App._currentView = viewName;

        // Update thumbnail buttons
        document.querySelectorAll('.view-thumb').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
        });

        // Update main canvas visibility and active-canvas class
        var viewNames = ['top', 'front', 'side'];
        viewNames.forEach(function (v) {
            var canvas = document.getElementById('canvas-' + v);
            if (canvas) {
                canvas.style.display = (v === viewName) ? '' : 'none';
                canvas.classList.toggle('active-canvas', v === viewName);
            }
        });

        // Update header title
        var header = document.getElementById('canvas-main-header');
        var titles = {
            'top': 'Top View — Warehouse Plan',
            'front': 'Front View — Elevation',
            'side': 'Side View — Section'
        };
        var titleEl = header ? header.querySelector('.canvas-title') : null;
        if (titleEl) titleEl.textContent = titles[viewName] || '';

        // Redraw the visible canvas to ensure correct sizing
        if (typeof LayoutEngine !== 'undefined' && document.getElementById('canvas-' + viewName)) {
            if (viewName === 'top') LayoutEngine.drawTopView('canvas-top');
            else if (viewName === 'front') LayoutEngine.drawFrontView('canvas-front');
            else if (viewName === 'side') LayoutEngine.drawSideView('canvas-side');
        }

        // Re-fit after view switch
        requestAnimationFrame(function () { App.autoFitCanvas(); });
    };

    // ===== Thumbnail Drawing =====
    App._drawThumbnails = function () {
        // Copy the real main canvases to thumbnail canvases via drawImage
        ['top', 'front', 'side'].forEach(function (view) {
            var mainCanvas = document.getElementById('canvas-' + view);
            var thumbCanvas = document.getElementById('thumb-' + view);
            if (!mainCanvas || !thumbCanvas) return;

            // If main canvas has zero dimensions (e.g., parent container is display:none),
            // trigger a redraw to ensure valid pixel content exists
            if (mainCanvas.width === 0 || mainCanvas.height === 0) {
                if (typeof LayoutEngine !== 'undefined') {
                    if (view === 'top') LayoutEngine.drawTopView('canvas-top');
                    else if (view === 'front') LayoutEngine.drawFrontView('canvas-front');
                    else if (view === 'side') LayoutEngine.drawSideView('canvas-side');
                }
            }

            // Still skip if dimensions are invalid after redraw attempt
            if (mainCanvas.width === 0 || mainCanvas.height === 0) return;

            var ctx = thumbCanvas.getContext('2d');
            var tw = thumbCanvas.width;
            var th = thumbCanvas.height;

            // Scale to fit thumbnail while preserving aspect ratio
            var mainW = mainCanvas.width;
            var mainH = mainCanvas.height;
            var scale = Math.min(tw / mainW, th / mainH);
            var sx = (tw - mainW * scale) / 2;
            var sy = (th - mainH * scale) / 2;

            ctx.clearRect(0, 0, tw, th);
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, tw, th);
            ctx.drawImage(mainCanvas, sx, sy, mainW * scale, mainH * scale);
        });
    };

    // ===== Quote form controls =====
    App.showQuoteForm = function () {
        var container = document.getElementById('quote-form-container');
        if (container) {
            container.style.display = 'block';
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    App.hideQuoteForm = function () {
        var container = document.getElementById('quote-form-container');
        if (container) container.style.display = 'none';
    };

    App.submitQuote = function (e) {
        e.preventDefault();
        var form = document.getElementById('quote-form');
        var submitBtn = form.querySelector('button[type="submit"]');

        // Prevent double submission
        if (submitBtn.disabled) return;

        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        var formData = new FormData(form);
        state.contactData = {
            name: formData.get('name') || '',
            email: formData.get('email') || '',
            company: formData.get('company') || '',
            phone: formData.get('phone') || '',
            country: formData.get('country') || ''
        };

        var quoteData = {
            contact: state.contactData,
            specs: state.specsData,
            recommendations: state.recommendations.map(function (r) {
                return { rank: r.rank, name: r.product.name, score: r.score.total, positions: estimatePalletPositions(r.product, state.specsData) };
            })
        };

        // Save to localStorage as backup — never lose a lead
        try {
            var leads = JSON.parse(localStorage.getItem('planner_leads') || '[]');
            leads.push({ data: quoteData, savedAt: new Date().toISOString() });
            if (leads.length > 50) leads = leads.slice(-50);
            localStorage.setItem('planner_leads', JSON.stringify(leads));
        } catch (e) { /* storage full, ignore */ }

        // Primary: Cloudflare Function (KV + Feishu webhook)
        fetch('/planner/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteData)
        })
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (data.success) {
                showQuoteSuccess(false);
            } else { fallbackToMailto(); }
        })
        .catch(function () { fallbackToMailto(); });

        function fallbackToMailto() {
            var subject = encodeURIComponent('RackingHub Planner — Quote Request from ' + state.contactData.name);
            var body = encodeURIComponent('Name: ' + state.contactData.name + '\nEmail: ' + state.contactData.email + '\nCompany: ' + state.contactData.company + '\nPhone: ' + state.contactData.phone + '\nCountry: ' + state.contactData.country + '\n\n---\nPlease see my warehouse specs and recommended plan at rackinghub.com/planner/');
            window.open('mailto:kevin@boracs.com?subject=' + subject + '&body=' + body);
            showQuoteSuccess(true);
        }

        function showQuoteSuccess(isFallback) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            // Hide form, show success message (form preserved, can be restored)
            var formEl = document.getElementById('quote-form');
            if (formEl) formEl.style.display = 'none';
            var existing = document.getElementById('quote-success-msg');
            if (existing) existing.remove();

            var successDiv = document.createElement('div');
            successDiv.id = 'quote-success-msg';
            successDiv.style.cssText = 'text-align:center;padding:1.5rem 1rem;margin-top:1rem;';
            var fallbackNote = isFallback ? '<p style="font-size:0.85rem;color:#92400e;margin-top:0.75rem;">⚠ Your email client should have opened — please make sure the email was sent.</p>' : '';
            successDiv.innerHTML = '<div style="font-size:3rem;margin-bottom:0.5rem;">✓</div>' +
                '<h3 style="color:#059669;margin-bottom:0.5rem;">Quote Request Sent!</h3>' +
                '<p style="color:#4b5563;">Thank you, <strong>' + escapeHtml(state.contactData.name) + '</strong>! Our engineering team will review your requirements and contact you at <strong>' + escapeHtml(state.contactData.email) + '</strong> within 24 hours.</p>' +
                '<button type="button" class="btn btn-outline" onclick="App.resetQuoteForm()" style="margin-top:0.75rem;">Submit Another Request</button>' +
                fallbackNote;
            var container = document.getElementById('quote-form-container');
            if (container) container.appendChild(successDiv);
        }
    };

    App.resetQuoteForm = function () {
        var container = document.getElementById('quote-form-container');
        var formEl = document.getElementById('quote-form');
        var successMsg = document.getElementById('quote-success-msg');
        if (successMsg) successMsg.remove();
        if (formEl) formEl.style.display = '';
        if (formEl) formEl.reset();
    };

    // ===== 工具函数 =====
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function formatNumber(num) {
        if (!num && num !== 0) return '0';
        return Number(num).toLocaleString('en-US');
    }

    // ===== 初始化 =====
    document.addEventListener('DOMContentLoaded', function () {
        var yearEl = document.getElementById('footer-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Hero preview — rich warehouse scene
        function drawHeroPreview() {
            var canvas = document.getElementById('hero-preview-canvas');
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var w = 600, h = 400;
            canvas.width = w * 2; canvas.height = h * 2;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.scale(2, 2);

            // Background
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
            for (var gx = 0; gx < w; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
            for (var gy = 0; gy < h; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

            // Warehouse outline
            var pad = 45;
            var bldgW = w - pad * 2, bldgH = h - pad * 2 - 25;
            var bx = pad, by = pad + 15;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, bldgW, bldgH);
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bldgW, bldgH);

            // Title bar
            ctx.fillStyle = '#1e293b'; ctx.fillRect(bx, by - 15, bldgW, 15);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('WAREHOUSE — 60m x 40m', bx + 6, by - 4);
            ctx.textAlign = 'right';
            ctx.fillText('RackingHub Planner', bx + bldgW - 6, by - 4);

            var innerX = bx + 3, innerY = by + 3;
            var innerW = bldgW - 6, innerH = bldgH - 6;

            // Zone 1: Heavy-Duty Selective (top-left) — blue
            ctx.fillStyle = 'rgba(59, 130, 246, 0.75)';
            ctx.fillRect(innerX + 2, innerY + 2, innerW * 0.38, innerH * 0.48);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5;
            for (var r = 0; r < 8; r++) {
                var ry = innerY + 2 + r * (innerH * 0.48 / 8);
                ctx.beginPath(); ctx.moveTo(innerX + 2, ry); ctx.lineTo(innerX + 2 + innerW * 0.38, ry); ctx.stroke();
            }
            for (var c = 0; c < 14; c++) {
                var cx2 = innerX + 2 + c * (innerW * 0.38 / 14);
                ctx.beginPath(); ctx.moveTo(cx2, innerY + 2); ctx.lineTo(cx2, innerY + 2 + innerH * 0.48); ctx.stroke();
            }
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Heavy-Duty Selective', innerX + 2 + innerW * 0.19, innerY + 2 + innerH * 0.48 / 2 + 3);

            // Zone 2: Drive-In (top-right) — green
            ctx.fillStyle = 'rgba(34, 197, 94, 0.75)';
            ctx.fillRect(innerX + innerW * 0.42, innerY + 2, innerW * 0.28, innerH * 0.48);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5;
            for (var r2 = 0; r2 < 4; r2++) {
                var ry2 = innerY + 2 + r2 * (innerH * 0.48 / 4);
                ctx.beginPath(); ctx.moveTo(innerX + innerW * 0.42, ry2); ctx.lineTo(innerX + innerW * 0.70, ry2); ctx.stroke();
            }
            for (var c2 = 0; c2 < 5; c2++) {
                var cx3 = innerX + innerW * 0.42 + c2 * (innerW * 0.28 / 5);
                ctx.beginPath(); ctx.moveTo(cx3, innerY + 2); ctx.lineTo(cx3, innerY + 2 + innerH * 0.48); ctx.stroke();
            }
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Drive-In', innerX + innerW * 0.56, innerY + 2 + innerH * 0.48 / 2 + 3);

            // Zone 3: Radio Shuttle (bottom) — purple
            ctx.fillStyle = 'rgba(168, 85, 247, 0.75)';
            ctx.fillRect(innerX + 2, innerY + innerH * 0.54, innerW * 0.66, innerH * 0.42);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.5;
            for (var r3 = 0; r3 < 6; r3++) {
                var ry3 = innerY + innerH * 0.54 + r3 * (innerH * 0.42 / 6);
                ctx.beginPath(); ctx.moveTo(innerX + 2, ry3); ctx.lineTo(innerX + 2 + innerW * 0.66, ry3); ctx.stroke();
            }
            for (var c3 = 0; c3 < 12; c3++) {
                var cx4 = innerX + 2 + c3 * (innerW * 0.66 / 12);
                ctx.beginPath(); ctx.moveTo(cx4, innerY + innerH * 0.54); ctx.lineTo(cx4, innerY + innerH * 0.54 + innerH * 0.42); ctx.stroke();
            }
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Radio Shuttle', innerX + 2 + innerW * 0.33, innerY + innerH * 0.54 + innerH * 0.42 / 2 + 3);

            // Loading dock (bottom-right) — orange
            ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
            ctx.fillRect(innerX + innerW * 0.72, innerY + innerH * 0.54, innerW * 0.26, innerH * 0.42);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Loading Dock', innerX + innerW * 0.85, innerY + innerH * 0.54 + innerH * 0.42 / 2 + 3);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (var d = 0; d < 3; d++) {
                ctx.fillRect(innerX + innerW * 0.72 + 8 + d * 22, innerY + innerH * 0.54 + innerH * 0.42 - 14, 16, 10);
            }

            // Forklift icon in aisle
            ctx.fillStyle = '#f59e0b';
            var fkX = innerX + innerW * 0.40, fkY = innerY + innerH * 0.20;
            ctx.fillRect(fkX - 6, fkY - 4, 12, 8);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(fkX + 6, fkY - 2, 4, 4);

            // Legend
            var ly = h - 16;
            ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(59, 130, 246, 0.75)'; ctx.fillRect(pad, ly - 6, 8, 8);
            ctx.fillStyle = '#334155'; ctx.fillText('Selective', pad + 10, ly);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.75)'; ctx.fillRect(pad + 62, ly - 6, 8, 8);
            ctx.fillStyle = '#334155'; ctx.fillText('Drive-In', pad + 72, ly);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.75)'; ctx.fillRect(pad + 122, ly - 6, 8, 8);
            ctx.fillStyle = '#334155'; ctx.fillText('Shuttle', pad + 132, ly);
            ctx.fillStyle = 'rgba(251, 146, 60, 0.6)'; ctx.fillRect(pad + 178, ly - 6, 8, 8);
            ctx.fillStyle = '#334155'; ctx.fillText('Loading', pad + 188, ly);

            // Scale bar
            var scale = bldgW / 60;
            var scaleM = 10, scalePx = scaleM * scale;
            var sbX = w - pad - scalePx, sbY = h - 22;
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + scalePx, sbY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX, sbY - 3); ctx.lineTo(sbX, sbY + 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sbX + scalePx, sbY - 3); ctx.lineTo(sbX + scalePx, sbY + 3); ctx.stroke();
            ctx.fillStyle = '#475569'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('10m', sbX + scalePx / 2, sbY - 5);

            // Stats badge
            ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
            roundRect(ctx, w - pad - 115, pad + 3, 112, 22, 4);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('12,450 pallet positions', w - pad - 59, pad + 17);
        }

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        }
        drawHeroPreview();

        // Resize handler
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (state.recommendations.length > 0 && state.currentStep === 3) {
                    renderLayout(state.recommendations[0]);
                }
                if (typeof LayoutEngine !== 'undefined' && document.getElementById('canvas-top')) {
                    LayoutEngine.drawAll();
                }
            }, 250);
        });

        // Load progress
        loadProgress();
        if (state.currentStep > 1) {
            var pageId = state.currentStep === 2 ? 'page-specs' : 'page-results';
            showPage(pageId);
        }

        // Init currency selector
        initCurrencySelector();

        // Load data
        loadData();
    });

})();
