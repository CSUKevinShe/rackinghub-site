// auto-select-profiles.js — 自动横梁/立柱型材选择器
// 基于承重需求自动匹配最小可用型材（含安全系数）
// 梁：根据 span(跨度) + load(每层承重) 从 beam-capacity.js 匹配
// 柱：根据 height(总高) + load(单柱承重) 从 frame-capacity.js 匹配

(function () {
  'use strict';

  var SAFETY_FACTOR = 1.05; // Small margin for beam+pallet self-weight (Excel data already includes safety factor)

  // ===== 横梁自动选择 =====
  // 参数: span_mm(跨度,mm), loadPerLevel(每层承重,kg)
  // 返回: { model, thickness, I_cm4, capacity, safetyFactor, span }
  function selectBeam(span_mm, loadPerLevel) {
    if (!window.BEAM_CAPACITY) return null;
    var capacityMap = window.BEAM_CAPACITY;

    // 按型号从小到大排序
    var models = Object.keys(capacityMap).sort(function (a, b) {
      return parseInt(a.replace('B', '')) - parseInt(b.replace('B', ''));
    });

    var targetLoad = Math.ceil(loadPerLevel * SAFETY_FACTOR);
    var closestSpan = null;
    var closestDiff = Infinity;

    // 对每个型号，找最接近的跨度
    for (var i = 0; i < models.length; i++) {
      var model = models[i];
      var beam = capacityMap[model];
      if (!beam.spans) continue;

      var spans = Object.keys(beam.spans).map(Number);
      for (var j = 0; j < spans.length; j++) {
        var diff = Math.abs(spans[j] - span_mm);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestSpan = spans[j];
        }
      }
    }

    // 找到最接近的跨度后，从小到大找第一个满足承重的型号
    for (var i = 0; i < models.length; i++) {
      var model = models[i];
      var beam = capacityMap[model];
      if (!beam.spans) continue;

      // 用最接近的跨度查承重（如果没有精确匹配，取相邻两个插值或向下取保守值）
      var spans = Object.keys(beam.spans).map(Number).sort(function (a, b) { return a - b; });
      var span = closestSpan;
      if (beam.spans[span] === undefined) {
        // 找最接近的已定义跨度（偏保守：选更大的跨度对应更低的承重）
        span = spans.reduce(function (prev, curr) {
          return Math.abs(curr - span_mm) < Math.abs(prev - span_mm) ? curr : prev;
        });
      }

      var capacity = beam.spans[span];
      if (capacity >= targetLoad) {
        return {
          model: model,
          thickness: beam.thickness,
          I_cm4: beam.I_cm4,
          capacity: capacity,
          requiredLoad: targetLoad,
          safetyFactor: (capacity / loadPerLevel).toFixed(2),
          span: span
        };
      }
    }

    // 如果所有型号都不够，返回最大型号并标记不足
    var lastModel = models[models.length - 1];
    var lastBeam = capacityMap[lastModel];
    var lastSpans = Object.keys(lastBeam.spans).map(Number).sort(function (a, b) { return a - b; });
    var lastSpan = closestSpan || lastSpans[lastSpans.length - 1];
    var lastCap = lastBeam.spans[lastSpan];

    return {
      model: lastModel,
      thickness: lastBeam.thickness,
      I_cm4: lastBeam.I_cm4,
      capacity: lastCap,
      requiredLoad: targetLoad,
      safetyFactor: (lastCap / loadPerLevel).toFixed(2),
      span: lastSpan,
      warning: 'Max beam insufficient — load exceeds capacity'
    };
  }

  // ===== 立柱自动选择 =====
  // 参数: height_mm(立柱总高,mm), loadPerUpright(单柱承重,kg), material(Q235/Q355)
  // 返回: { profile, ctype, capacity, safetyFactor, height }
  function selectUpright(height_mm, loadPerUpright, material) {
    if (!window.FRAME_CAPACITY) return null;

    var targetLoad = Math.ceil(loadPerUpright * SAFETY_FACTOR);
    var fc = window.FRAME_CAPACITY; // flat: { profile: { height: capacity, ... }, ... }

    // 收集所有可用的 [profile, height, capacity] 三元组
    var candidates = [];
    var profiles = Object.keys(fc);
    for (var i = 0; i < profiles.length; i++) {
      var profile = profiles[i];
      var heights = fc[profile];
      var heightsKeys = Object.keys(heights).map(Number).sort(function (a, b) { return a - b; });

      // 找最接近 input height 的标准高度
      var closestH = heightsKeys.reduce(function (prev, curr) {
        return Math.abs(curr - height_mm) < Math.abs(prev - height_mm) ? curr : prev;
      });

      // 保守策略：如果实际高度超过所有标准高度，用最大高度（承重最低）
      if (height_mm > heightsKeys[heightsKeys.length - 1]) {
        closestH = heightsKeys[heightsKeys.length - 1];
      }

      var capacity = heights[closestH];
      candidates.push({
        profile: profile,
        height: closestH,
        capacity: capacity
      });
    }

    // 按承重从小到大排序
    candidates.sort(function (a, b) { return a.capacity - b.capacity; });

    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].capacity >= targetLoad) {
        return {
          profile: candidates[i].profile,
          ctype: '',
          capacity: candidates[i].capacity,
          requiredLoad: targetLoad,
          safetyFactor: (candidates[i].capacity / loadPerUpright).toFixed(2),
          height: candidates[i].height
        };
      }
    }

    // 如果都不够，返回最大承重型材
    var last = candidates[candidates.length - 1];
    return {
      profile: last.profile,
      ctype: '',
      capacity: last.capacity,
      requiredLoad: targetLoad,
      safetyFactor: (last.capacity / loadPerUpright).toFixed(2),
      height: last.height,
      warning: 'Max upright insufficient — load exceeds capacity'
    };
  }

  // ===== 主入口：根据 Planner 参数自动选择 =====
  function autoSelect(params) {
    var palletsPerLevel = params.palletsPerLevel || 2;
    var levels = params.levels || 4;
    var palletWeight = params.palletWeight || 1000;
    var bayWidthM = params.bayWidth || 2.76;
    var rackHeightM = params.rackHeight || 6.0;
    var material = params.material || 'Q235';

    var span_mm = Math.round(bayWidthM * 1000);
    var loadPerLevel = palletsPerLevel * palletWeight;
    var totalLoad = levels * palletsPerLevel * palletWeight;
    var loadPerUpright = totalLoad / 2; // 每个bay有2根立柱分担
    var height_mm = Math.round(rackHeightM * 1000);

    return {
      beam: selectBeam(span_mm, loadPerLevel),
      upright: selectUpright(height_mm, loadPerUpright, material),
      loadInfo: {
        palletWeight: palletWeight,
        palletsPerLevel: palletsPerLevel,
        levels: levels,
        loadPerLevel: loadPerLevel,
        totalLoad: totalLoad,
        loadPerUpright: loadPerUpright,
        span_mm: span_mm,
        height_mm: height_mm
      }
    };
  }

  window.AutoProfiles = {
    selectBeam: selectBeam,
    selectUpright: selectUpright,
    autoSelect: autoSelect,
    SAFETY_FACTOR: SAFETY_FACTOR
  };

})();
