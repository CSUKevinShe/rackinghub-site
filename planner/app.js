/*
 * RackingHub Planner — app.js
 * 推荐引擎 + 表单管理 + Canvas 布局 + 页面交互
 * 中文注释，英文 UI 文本
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
        } catch (e) { /* localStorage 不可用时静默失败 */ }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            var data = JSON.parse(saved);
            // 版本不兼容时忽略旧数据
            if (!data.v || data.v !== STORAGE_VERSION) return;
            // 超过 24 小时的进度不恢复
            if (Date.now() - data.timestamp > 86400000) return;
            if (data.contact && Object.keys(data.contact).length > 0) {
                state.contactData = data.contact;
                state.specsData = data.specs || {};
                // 如果上次停留在结果页，回退到规格页（结果需重新计算）
                if (data.step >= 4) {
                    state.currentStep = 3;
                } else {
                    state.currentStep = data.step || 1;
                }
            }
        } catch (e) { /* 解析失败时忽略 */ }
    }

    // 将已保存的数据回填到表单字段
    function restoreFormFields() {
        var c = state.contactData;
        if (c.name) { var el = document.getElementById('contact-name'); if (el) el.value = c.name; }
        if (c.email) { var el = document.getElementById('contact-email'); if (el) el.value = c.email; }
        if (c.company) { var el = document.getElementById('contact-company'); if (el) el.value = c.company; }
        if (c.phone) { var el = document.getElementById('contact-phone'); if (el) el.value = c.phone; }
        if (c.country) { var el = document.getElementById('contact-country'); if (el) el.value = c.country; }

        var s = state.specsData;
        if (s.length) { var el = document.getElementById('spec-length'); if (el) el.value = s.length; }
        if (s.width) { var el = document.getElementById('spec-width'); if (el) el.value = s.width; }
        if (s.height) { var el = document.getElementById('spec-height'); if (el) el.value = s.height; }
        if (s.floorLoad) { var el = document.getElementById('spec-floor'); if (el) el.value = s.floorLoad; }
        if (s.palletWeight) { var el = document.getElementById('spec-pallet-weight'); if (el) el.value = s.palletWeight; }
        if (s.skuCount) { var el = document.getElementById('spec-sku'); if (el) el.value = s.skuCount; }
        if (s.frequency) { var el = document.getElementById('spec-frequency'); if (el) el.value = s.frequency; }
        if (s.rotation) { var el = document.getElementById('spec-rotation'); if (el) el.value = s.rotation; }
    }

    function clearProgress() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
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
        var pageMap = { 1: 'page-landing', 2: 'page-contact', 3: 'page-specs', 4: 'page-results' };
        showPage(pageMap[step] || 'page-landing');
    };

    // ===== 数据加载 =====
    function loadData() {
        // 加载案例数据
        fetch('data/cases.json')
            .then(function (r) { return r.json(); })
            .then(function (cases) {
                state.cases = cases;
                renderCases();
            })
            .catch(function () {
                state.cases = [];
                console.warn('[Planner] Failed to load cases.json');
            });

        // 加载产品数据
        fetch('data/products.json')
            .then(function (r) { return r.json(); })
            .then(function (products) {
                state.products = products;
                state.loaded = true;
            })
            .catch(function () {
                state.products = [];
                state.loaded = true;
                console.warn('[Planner] Failed to load products.json, using fallback recommendations');
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
                c.highlights.forEach(function (h) {
                    highlightsHtml += '<li>' + escapeHtml(h) + '</li>';
                });
                highlightsHtml += '</ul>';
            }

            html += '<div class="case-card">'
                + '<div class="case-header">'
                    + '<div class="case-region">' + escapeHtml(c.region) + '</div>'
                    + '<div class="case-title">' + escapeHtml(c.title) + '</div>'
                    + '<div class="case-location">\u{1F4CD} ' + escapeHtml(c.location) + '</div>'
                + '</div>'
                + '<div class="case-body">'
                    + '<div class="case-meta">'
                        + '<span class="case-meta-item">\u{1F3E2} ' + escapeHtml(c.warehouse_area) + '</span>'
                        + '<span class="case-meta-item">' + (c.racking_icon || '') + ' ' + escapeHtml(c.racking_type) + '</span>'
                    + '</div>'
                    + '<p class="case-desc">' + escapeHtml(c.description) + '</p>'
                    + highlightsHtml
                + '</div>'
            + '</div>';
        });
        container.innerHTML = html;
    }

    // ===== 联系信息表单提交 =====
    App.submitContact = function (e) {
        e.preventDefault();
        var form = document.getElementById('contact-form');
        var formData = new FormData(form);

        state.contactData = {
            name: formData.get('name') || '',
            email: formData.get('email') || '',
            company: formData.get('company') || '',
            phone: formData.get('phone') || '',
            country: formData.get('country') || ''
        };

        saveProgress();
        state.currentStep = 3; // 下一步：仓库规格
        saveProgress();
        showPage('page-specs');
        window.scrollTo({ top: 0 });
    };

    // ===== 仓库规格表单提交 → 生成方案 =====
    App.generatePlan = function (e) {
        e.preventDefault();
        var form = document.getElementById('specs-form');
        var formData = new FormData(form);

        // If interactive layout has been used, take params from it
        var useInteractive = (typeof LayoutEngine !== 'undefined' && LayoutEngine.stats.totalPositions > 0);
        var interactiveParams = useInteractive ? LayoutEngine.params : null;

        state.specsData = {
            length: interactiveParams ? interactiveParams.warehouseLength : (parseFloat(formData.get('length')) || 60),
            width: interactiveParams ? interactiveParams.warehouseWidth : (parseFloat(formData.get('width')) || 40),
            height: parseFloat(formData.get('height')) || 9,
            floorLoad: parseFloat(formData.get('floorLoad')) || 5000,
            palletWeight: parseFloat(formData.get('palletWeight')) || 1000,
            skuCount: parseInt(formData.get('skuCount')) || 500,
            frequency: formData.get('frequency') || 'medium',
            rotation: formData.get('rotation') || 'either',
            interactiveLevels: interactiveParams ? interactiveParams.levels : null,
            interactivePallets: interactiveParams ? interactiveParams.palletsPerLevel : null,
            interactiveRackingType: interactiveParams ? interactiveParams.rackingType : null
        };

        saveProgress();
        state.currentStep = 4;
        saveProgress();
        showPage('page-results');
        renderSpecsSummary();

        // 模拟计算延迟后显示结果
        document.getElementById('results-loading').style.display = 'block';
        document.getElementById('results-content').style.display = 'none';

        setTimeout(function () {
            var recs = generateRecommendations();
            state.recommendations = recs;
            renderRecommendations(recs);
            renderComparisonTable(recs);
            renderLayout(recs[0]); // 最佳方案布局
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
    //  🦓 推荐引擎 — 多维度评分系统
    //  承重匹配度(30%) + 存取效率匹配(25%) + 空间利用率(25%) + 成本效率(20%)
    // ============================================================
    function generateRecommendations() {
        var products = state.products;
        var specs = state.specsData;
        if (!products.length) return getDefaultRecommendations();

        var scores = products.map(function (product) {
            return { product: product, score: calculateScore(product, specs) };
        });

        // 按评分降序排序
        scores.sort(function (a, b) { return b.score.total - a.score.total; });

        // 返回前 3 个方案
        return scores.slice(0, 3).map(function (s, index) {
            return {
                rank: index + 1,
                product: s.product,
                score: s.score,
                isBest: index === 0
            };
        });
    }

    // 计算单个产品的综合评分
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

    // 存取效率评分
    function calculateAccessScore(product, specs) {
        var score = 50;
        var sku = specs.skuCount || 100;
        var freq = specs.frequency;
        var rotation = specs.rotation;

        // SKU 数量匹配
        if (sku <= 20) {
            if (product.access_type === 'drive-in' || product.access_type === 'shuttle') {
                score += 30;
            } else {
                score += 10;
            }
        } else if (sku <= 100) {
            if (product.access_type === 'shuttle' || product.access_type === 'push-back') {
                score += 25;
            } else if (product.access_type === 'selective' || product.access_type === 'vna-selective') {
                score += 20;
            } else {
                score += 5;
            }
        } else {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') {
                score += 30;
            } else {
                score -= 20;
            }
        }

        // 存取频率匹配
        if (freq === 'high') {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') {
                score += 20;
            } else {
                score -= 10;
            }
        } else if (freq === 'low') {
            if (product.access_type === 'drive-in' || product.access_type === 'push-back') {
                score += 15;
            }
        }

        // FIFO/LIFO 硬性约束
        if (rotation === 'fifo' && !product.supports_fifo) { score -= 30; }
        if (rotation === 'lifo' && !product.supports_lifo) { score -= 30; }

        return Math.max(0, Math.min(100, score));
    }

    // 空间利用率评分
    function calculateSpaceScore(product, specs) {
        var score = 50;

        if (specs.height > 8) {
            if (product.access_type === 'vna-selective' || product.access_type === 'shuttle') {
                score += 30;
            }
            var maxH = Math.max.apply(null, product.upright_height_options);
            if (maxH < specs.height) { score -= 10; }
        }

        if (specs.height < 4.5) {
            if (product.access_type === 'selective') { score += 20; }
            if (product.access_type === 'vna-selective') { score -= 15; }
        }

        var area = specs.length * specs.width;
        if (area < 800) {
            if (product.storage_density_pct >= 70) { score += 25; }
        } else {
            if (product.access_type === 'selective' || product.access_type === 'vna-selective') {
                score += 15;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    // 成本效率评分（价格越低得分越高）
    function calculateCostScore(product, specs) {
        var allPrices = state.products.map(function (p) { return p.price_per_position_cny; });
        var minPrice = Math.min.apply(null, allPrices);
        var maxPrice = Math.max.apply(null, allPrices);
        var range = maxPrice - minPrice || 1;
        var normalized = 1 - (product.price_per_position_cny - minPrice) / range;
        return 20 + normalized * 80;
    }

    // ===== 无数据时的默认推荐 =====
    function getDefaultRecommendations() {
        var defaults = [
            {
                rank: 1, product: {
                    id: 'selective-heavy', name: 'Heavy-Duty Selective Racking',
                    description: 'The most versatile pallet racking system offering 100% direct access to every pallet position.',
                    max_load_per_level: 3000, storage_density_pct: 35, aisle_width: 3.2,
                    price_per_position_cny: 120, supports_fifo: true, supports_lifo: true
                },
                score: { total: 87.5, load: 95, access: 85, space: 80, cost: 85 }, isBest: true
            },
            {
                rank: 2, product: {
                    id: 'radio-shuttle', name: 'Radio Shuttle Racking',
                    description: 'Semi-automated high-density system using remote-controlled shuttle carts.',
                    max_load_per_level: 2500, storage_density_pct: 70, aisle_width: 3.0,
                    price_per_position_cny: 200, supports_fifo: true, supports_lifo: true
                },
                score: { total: 78.2, load: 85, access: 70, space: 85, cost: 65 }, isBest: false
            },
            {
                rank: 3, product: {
                    id: 'drive-in', name: 'Drive-In Racking',
                    description: 'High-density storage system where forklifts drive directly into the racking lanes.',
                    max_load_per_level: 2000, storage_density_pct: 75, aisle_width: 3.0,
                    price_per_position_cny: 150, supports_fifo: false, supports_lifo: true
                },
                score: { total: 72.0, load: 70, access: 60, space: 88, cost: 75 }, isBest: false
            }
        ];
        state.recommendations = defaults;
        return defaults;
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

            getPros(rec.product, state.specsData).forEach(function (p) {
                html += '<li>' + escapeHtml(p) + '</li>';
            });

            html += '</ul></div></div></div>';
        });
        container.innerHTML = html;
    }

    // 为产品生成优势列表
    function getPros(product, specs) {
        var pros = [];

        if (product.access_type === 'selective') {
            pros.push('100% direct pallet accessibility');
        }
        if (product.storage_density_pct >= 70) {
            pros.push('High space utilization (' + product.storage_density_pct + '%)');
        }
        if (product.access_type === 'vna-selective') {
            pros.push('Narrow aisles (' + product.aisle_width + 'm) save floor space');
        }
        if (product.supports_fifo && specs.rotation === 'fifo') {
            pros.push('Supports FIFO rotation for your inventory needs');
        }
        if (product.max_load_per_level >= specs.palletWeight * 1.5) {
            pros.push('Generous load margin (' + product.max_load_per_level + 'kg vs ' + specs.palletWeight + 'kg needed)');
        }
        if (product.access_type === 'shuttle') {
            pros.push('Semi-automated — reduces forklift labor costs');
        }
        if (product.access_type === 'drive-in') {
            pros.push('Lowest cost per pallet position');
        }

        var positions = estimatePalletPositions(product, specs);
        pros.push('~' + formatNumber(positions) + ' pallet positions in your warehouse');

        return pros;
    }

    // 估算托盘位数（简化计算）
    function estimatePalletPositions(product, specs) {
        var area = specs.length * specs.width;
        var aisleRatio = product.aisle_width / (product.aisle_width + 2.7);
        var usableArea = area * (1 - aisleRatio * 0.5);
        var palletPositions = Math.floor(usableArea / 2.5);
        var maxH = Math.max.apply(null, product.upright_height_options);
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
        recs.forEach(function (rec) {
            html += '<th>' + escapeHtml(rec.product.name) + '</th>';
        });
        html += '</tr></thead><tbody>';

        var rows = [
            { label: 'Match Score', getValue: function (r) { return r.score.total; }, best: 'high' },
            { label: 'Max Load / Level', getValue: function (r) { return r.product.max_load_per_level + ' kg'; }, best: 'high' },
            { label: 'Space Utilization', getValue: function (r) { return r.product.storage_density_pct + '%'; }, best: 'high' },
            { label: 'Aisle Width', getValue: function (r) { return r.product.aisle_width + ' m'; }, best: 'low' },
            { label: 'FIFO Support', getValue: function (r) { return r.product.supports_fifo ? '✓ Yes' : '✗ No'; }, best: 'yes' },
            { label: 'LIFO Support', getValue: function (r) { return r.product.supports_lifo ? '✓ Yes' : '✗ No'; }, best: 'yes' },
            { label: 'Est. Price per Position', getValue: function (r) { return '¥' + r.product.price_per_position_cny; }, best: 'low' },
            { label: 'Est. Pallet Positions', getValue: function (r) { return '~' + formatNumber(estimatePalletPositions(r.product, specs)); }, best: 'high' }
        ];

        rows.forEach(function (row) {
            html += '<tr><td>' + row.label + '</td>';
            var bestIdx = 0;
            if (row.best === 'high') {
                // 第一行(最佳方案)默认最高
            } else if (row.best === 'low' && row.label !== 'FIFO Support' && row.label !== 'LIFO Support') {
                // 找最小值
                var minVal = Infinity;
                recs.forEach(function (r, i) {
                    var v = parseFloat(String(row.getValue(r)).replace(/[^0-9.-]/g, ''));
                    if (v < minVal) { minVal = v; bestIdx = i; }
                });
            }
            recs.forEach(function (r, i) {
                var cls = i === bestIdx ? ' best-value' : '';
                html += '<td class="' + cls + '">' + row.getValue(r) + '</td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    // ===== Canvas 2D warehouse layout — three-view rendering =====
    function renderLayout(rec) {
        if (!rec) return;

        var specs = state.specsData;
        var product = rec.product;

        // Populate LayoutEngine params from results data and reuse drawAll
        var levels = specs.interactiveLevels || Math.max(2, Math.floor(specs.height / 1.5));
        var pallets = specs.interactivePallets || 3;
        var rackingType = specs.interactiveRackingType || 'selective-heavy';

        LayoutEngine.params.warehouseLength = specs.length;
        LayoutEngine.params.warehouseWidth = specs.width;
        LayoutEngine.params.rackingType = rackingType;
        LayoutEngine.params.levels = levels;
        LayoutEngine.params.palletsPerLevel = pallets;

        // Apply preset defaults
        var RACKING_PRESETS = {
            'selective-heavy': { aisleWidth: 3.2, rackDepth: 1.0, rackWidth: 2.7 },
            'selective-medium': { aisleWidth: 3.0, rackDepth: 0.9, rackWidth: 2.5 },
            'drive-in': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.4 },
            'radio-shuttle': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.7 },
            'vna': { aisleWidth: 1.8, rackDepth: 1.0, rackWidth: 2.4 },
            'push-back': { aisleWidth: 3.2, rackDepth: 1.0, rackWidth: 2.4 }
        };
        var preset = RACKING_PRESETS[rackingType] || RACKING_PRESETS['selective-heavy'];
        LayoutEngine.params.aisleWidth = preset.aisleWidth;

        LayoutEngine.calculate();
        LayoutEngine.drawAll();
    }

    // ===== 请求报价（EmailJS 集成） =====
    App.requestQuote = function () {
        // 方案摘要数据
        var quoteData = {
            contact: state.contactData,
            specs: state.specsData,
            recommendations: state.recommendations.map(function (r) {
                return {
                    rank: r.rank,
                    name: r.product.name,
                    score: r.score.total,
                    positions: estimatePalletPositions(r.product, state.specsData)
                };
            })
        };

        // 通过 Cloudflare Functions 提交线索
        fetch('/planner/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteData)
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.success) {
                alert('Thank you! Our engineering team will prepare a detailed quotation and contact you within 24 hours.');
                clearProgress();
            } else {
                // 提交失败时降级为邮件链接
                var subject = encodeURIComponent('RackingHub Planner — Quote Request from ' + state.contactData.name);
                var body = encodeURIComponent('Please see my warehouse specs and recommended plan at rackinghub.com/planner/\n\nContact: ' + state.contactData.name + ' <' + state.contactData.email + '>');
                window.location.href = 'mailto:kevin@boracs.com?subject=' + subject + '&body=' + body;
            }
        })
        .catch(function () {
            // 网络错误时降级为邮件链接
            var subject = encodeURIComponent('RackingHub Planner — Quote Request from ' + state.contactData.name);
            var body = encodeURIComponent('Please see my warehouse specs and recommended plan at rackinghub.com/planner/');
            window.location.href = 'mailto:kevin@boracs.com?subject=' + subject + '&body=' + body;
        });
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
        // 更新版权年份
        var yearEl = document.getElementById('footer-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // 表单提交绑定 — 在 HTML onsubmit 之外额外绑定，确保脚本加载顺序变化时仍可靠
        var contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function (e) {
                e.preventDefault();
                App.submitContact(e);
            });
        }

        var specsForm = document.getElementById('specs-form');
        if (specsForm) {
            specsForm.addEventListener('submit', function (e) {
                e.preventDefault();
                App.generatePlan(e);
            });
        }

    // ===== Hero Preview Canvas =====
    function drawHeroPreview() {
        var canvas = document.getElementById('hero-preview-canvas');
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        var w = 600, h = 400;
        canvas.width = w * 2; // 2x for retina
        canvas.height = h * 2;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(2, 2);

        // 白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        var pad = 40;
        var drawW = w - pad * 2;
        var drawH = h - pad * 2;

        // 仓库外框
        ctx.strokeStyle = '#1a365d';
        ctx.lineWidth = 2;
        ctx.strokeRect(pad, pad, drawW, drawH);

        // 仓库标签
        ctx.fillStyle = '#1a365d';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Typical Warehouse Layout — 60m × 40m', w / 2, pad - 10);

        // 预设参数：6条通道，每条通道 2.5m + 双排货架 2.8m
        var numAisles = 6;
        var aisleWidth = 2.5;
        var doubleRackDepth = 2.8;
        var unitWidth = aisleWidth + doubleRackDepth;
        var totalUnits = numAisles * unitWidth;
        var scale = drawW / 40; // 40m 仓库宽度

        // 绘制双排货架 + 通道
        var y = pad;
        var colors = ['#1a365d', '#2c5282', '#1a365d', '#2c5282', '#1a365d', '#2c5282'];

        for (var i = 0; i < numAisles; i++) {
            var rackPx = doubleRackDepth * scale;
            var aislePx = aisleWidth * scale;

            // 双排货架（深蓝色矩形）
            ctx.fillStyle = colors[i % 2] === '#1a365d' ? 'rgba(26, 54, 93, 0.8)' : 'rgba(44, 82, 130, 0.7)';
            ctx.fillRect(pad, y, drawW, rackPx);

            // 货架上的横梁线
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            var beamCount = Math.floor(drawW / 25);
            for (var b = 0; b < beamCount; b++) {
                var bx = pad + 25 + b * 25;
                ctx.beginPath();
                ctx.moveTo(bx, y);
                ctx.lineTo(bx, y + rackPx);
                ctx.stroke();
            }

            y += rackPx;

            // 通道（浅黄色）
            if (i < numAisles - 1) {
                ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
                ctx.fillRect(pad, y, drawW, aislePx);

                ctx.fillStyle = '#d97706';
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Aisle ' + (i + 1), w / 2, y + aislePx / 2 + 3);

                y += aislePx;
            }
        }

        // 入口标注
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('\uD83D\uDEAA Entrance', pad + 5, pad + 14);

        // 比例尺
        var scaleBarM = 10;
        var scaleBarPx = scaleBarM * scale;
        var sbX = w - pad - scaleBarPx;
        var sbY = h - 12;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sbX, sbY);
        ctx.lineTo(sbX + scaleBarPx, sbY);
        ctx.stroke();

        // 比例尺端点
        ctx.beginPath();
        ctx.moveTo(sbX, sbY - 4);
        ctx.lineTo(sbX, sbY + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sbX + scaleBarPx, sbY - 4);
        ctx.lineTo(sbX + scaleBarPx, sbY + 4);
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(scaleBarM + 'm', sbX + scaleBarPx / 2, sbY - 6);

        // 右上角小标签
        ctx.fillStyle = '#1a365d';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('RackingHub Planner', w - pad, pad - 10);
    }

        // Canvas layout responsive redraw
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (state.recommendations.length > 0 && state.currentStep === 4) {
                    renderLayout(state.recommendations[0]);
                }
                if (typeof LayoutEngine !== 'undefined' && document.getElementById('canvas-top')) {
                    LayoutEngine.drawAll();
                }
            }, 250);
        });

        // 加载进度（已保存的用户数据）
        loadProgress();

        // 回填已保存的表单数据
        restoreFormFields();

        // 如果有已保存的进度，自动跳到对应页面
        if (state.currentStep > 1) {
            var pageId = state.currentStep === 2 ? 'page-contact' : state.currentStep === 3 ? 'page-specs' : 'page-landing';
            showPage(pageId);
        }

        // 绘制 Hero 预览图（立即 + DOMContentLoaded 兜底）
        function initHeroPreview() {
            if (typeof drawHeroPreview === 'function') drawHeroPreview();
        }
        initHeroPreview();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initHeroPreview);
        } else {
            setTimeout(initHeroPreview, 200);
        }

        // ===== Interactive Layout Engine initialization =====
        if (typeof LayoutEngine !== 'undefined') {
            // Delay to ensure DOM is fully rendered
            setTimeout(function () {
                var canvas = document.getElementById('canvas-top');
                if (canvas) {
                    LayoutEngine.initInteractive();
                }
            }, 300);
        }

        // 加载数据
        loadData();
    });

})();
