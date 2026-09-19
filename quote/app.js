(function () {
  "use strict";

  const STORAGE_KEY = "rackinghub_quote_v1";

  let templatesData = null;
  let settings = null;
  let entries = []; // { id, templateId, templateName, costType, lines: [{key,label,formula,fields:{...}}] }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function uid() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function fmtMoney(n) {
    if (!isFinite(n)) return "-";
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }

  function fmtWeight(n) {
    if (!isFinite(n)) return "-";
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) + " kg";
  }

  // ---------- 加载 / 保存 ----------

  async function loadData() {
    const [tRes, sRes] = await Promise.all([
      fetch("./data/templates.json").then((r) => r.json()),
      fetch("./data/settings.json").then((r) => r.json()),
    ]);
    templatesData = tRes;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        entries = parsed.entries || [];
        settings = Object.assign({}, sRes, parsed.settings || {});
      } catch (e) {
        settings = sRes;
      }
    } else {
      settings = sRes;
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, settings }));
  }

  // ---------- 模板列表 ----------

  function renderTemplateList() {
    const root = $("#template-list");
    root.innerHTML = "";
    for (const cat of templatesData.categories) {
      const group = document.createElement("div");
      group.className = "template-group";
      const label = document.createElement("div");
      label.className = "group-label";
      label.textContent = cat.label;
      group.appendChild(label);

      const items = templatesData.templates.filter((t) => t.category === cat.id);
      for (const tpl of items) {
        const item = document.createElement("div");
        item.className = "template-item";
        item.innerHTML = `<div>${tpl.name}</div><div class="desc">${tpl.description || ""}</div>`;
        item.addEventListener("click", () => addEntry(tpl));
        group.appendChild(item);
      }
      root.appendChild(group);
    }
  }

  function addEntry(tpl) {
    const lines = tpl.lines.map((line) => {
      const fields = {};
      for (const f of line.fields) fields[f.key] = f.default;
      return { key: line.key, label: line.label, formula: line.formula, fieldDefs: line.fields, fields };
    });
    entries.push({
      id: uid(),
      templateId: tpl.id,
      templateName: tpl.name,
      costType: tpl.costType || "self-made",
      lines,
    });
    persist();
    renderEntries();
    renderSummary();
  }

  // ---------- 报价单条目 ----------

  function computeEntry(entry) {
    const calcLines = entry.lines.map((l) => ({ key: l.key, formula: l.formula, fields: l.fields, label: l.label }));
    return calcEntry({ lines: calcLines });
  }

  function renderEntries() {
    const root = $("#entries");
    $("#entry-count").textContent = entries.length;
    root.innerHTML = "";

    if (entries.length === 0) {
      root.innerHTML = '<div class="empty-hint">从左侧选一个模板，开始添加产品行</div>';
      return;
    }

    entries.forEach((entry, idx) => {
      const card = document.createElement("div");
      card.className = "entry-card";

      const head = document.createElement("div");
      head.className = "entry-head";
      head.innerHTML = `
        <div class="entry-title">#${idx + 1} ${entry.templateName}
          <span class="tag">${entry.costType === "purchased" ? "采购件" : "自制件"}</span>
        </div>
        <div class="entry-actions"><button data-action="remove">删除</button></div>
      `;
      head.querySelector('[data-action="remove"]').addEventListener("click", () => {
        entries = entries.filter((e) => e.id !== entry.id);
        persist();
        renderEntries();
        renderSummary();
      });
      card.appendChild(head);

      entry.lines.forEach((line) => {
        const block = document.createElement("div");
        block.className = "line-block";

        const grid = document.createElement("div");
        grid.className = "fields-grid";
        line.fieldDefs.forEach((f) => {
          const field = document.createElement("div");
          field.className = "field";
          field.innerHTML = `
            <label>${f.label}${f.unit ? " (" + f.unit + ")" : ""}</label>
            <input type="${f.type === "text" ? "text" : "number"}" step="${f.step || "any"}" placeholder="${f.placeholder || ""}" />
            ${f.help ? `<div class="unit-hint">${f.help}</div>` : ""}
          `;
          const input = field.querySelector("input");
          input.value = line.fields[f.key] ?? "";
          input.addEventListener("input", () => {
            line.fields[f.key] = f.type === "text" ? input.value : Number(input.value);
            persist();
            renderLineResult(entry, line, resultBox);
            renderSummary();
          });
          grid.appendChild(field);
        });
        block.appendChild(grid);

        const resultBox = document.createElement("div");
        resultBox.className = "line-result";
        block.appendChild(resultBox);
        renderLineResult(entry, line, resultBox);

        card.appendChild(block);
      });

      root.appendChild(card);
    });
  }

  function renderLineResult(entry, line, box) {
    const r = calcLine(line.formula, line.fields);
    box.innerHTML = `
      <span>单件成本：<b>¥${fmtMoney(r.unitCost)}</b></span>
      <span>数量：${r.qty}</span>
      <span>行成本：<b>¥${fmtMoney(r.lineCost)}</b></span>
      ${r.lineWeight ? `<span>行重量：${fmtWeight(r.lineWeight)}</span>` : ""}
    `;
  }

  // ---------- 订单汇总 ----------

  function renderSummary() {
    const computed = entries.map((e) => ({ category: e.costType, calc: computeEntry(e) }));
    const order = calcOrder(computed, settings);

    const marginPct = (order.profitMargin * 100).toFixed(1);
    const marginClass = order.profitMargin >= 0.2 ? "ok" : "warn";

    $("#order-summary").innerHTML = `
      <div class="summary-row"><span>总重量</span><span class="val">${fmtWeight(order.totalWeight)}</span></div>
      <div class="summary-row"><span>估算柜数</span><span class="val">${order.containerCount}</span></div>
      <div class="summary-row"><span>自制件成本</span><span class="val">¥${fmtMoney(order.selfMadeCost)}</span></div>
      <div class="summary-row"><span>采购件成本</span><span class="val">¥${fmtMoney(order.purchasedCost)}</span></div>
      <div class="summary-row"><span>物流费用（按柜）</span><span class="val">¥${fmtMoney(order.logisticsCost)}</span></div>
      <div class="summary-row"><span>总成本</span><span class="val">¥${fmtMoney(order.totalCost)}</span></div>
      <div class="summary-row total"><span>报价销售额</span><span class="val">¥${fmtMoney(order.saleAmount)}</span></div>
      <div class="summary-row"><span>利润</span><span class="val">¥${fmtMoney(order.profit)}</span></div>
      <div class="summary-row"><span>利润率</span><span class="val ${marginClass}">${marginPct}%</span></div>
    `;
  }

  // ---------- 参数设置 ----------

  function renderSettingsForm() {
    const root = $("#settings-form");
    root.innerHTML = "";

    const defs = [
      { path: ["markup", "selfMade"], label: "自制件加价系数", step: 0.01 },
      { path: ["markup", "purchased"], label: "采购件加价系数", step: 0.01 },
      { path: ["exchangeRate", "value"], label: "汇率（暂未接入报价单位换算）", step: 0.01 },
      { path: ["container", "capacityKg"], label: "单柜可装重量 (kg)", step: 10 },
      { path: ["logisticsPerContainer", "packingFee"], label: "包装费/柜" },
      { path: ["logisticsPerContainer", "loadingFee"], label: "装箱费/柜" },
      { path: ["logisticsPerContainer", "trailerFee"], label: "拖车费/柜" },
      { path: ["logisticsPerContainer", "fobFee"], label: "FOB费/柜" },
      { path: ["logisticsPerContainer", "seaFreight"], label: "海运费/柜" },
      { path: ["logisticsPerContainer", "otherFee"], label: "其他费用/柜" },
    ];

    defs.forEach((d) => {
      const field = document.createElement("div");
      field.className = "field";
      const value = d.path.reduce((o, k) => o[k], settings);
      field.innerHTML = `<label>${d.label}</label><input type="number" step="${d.step || "any"}" value="${value}" />`;
      field.querySelector("input").addEventListener("input", (ev) => {
        let obj = settings;
        for (let i = 0; i < d.path.length - 1; i++) obj = obj[d.path[i]];
        obj[d.path[d.path.length - 1]] = Number(ev.target.value);
        persist();
        renderSummary();
      });
      root.appendChild(field);
    });
  }

  // ---------- 导出 ----------

  function exportJson() {
    const computed = entries.map((e) => ({ ...e, calc: computeEntry(e) }));
    const order = calcOrder(
      computed.map((e) => ({ category: e.costType, calc: e.calc })),
      settings
    );
    const payload = { entries: computed, settings, order, exportedAt: new Date().toISOString() };
    downloadFile(`quote-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCsv() {
    const rows = [["序号", "模板", "类型", "行名称", "单件成本", "数量", "行成本", "行重量(kg)"]];
    entries.forEach((entry, idx) => {
      entry.lines.forEach((line) => {
        const r = calcLine(line.formula, line.fields);
        rows.push([
          idx + 1,
          entry.templateName,
          entry.costType === "purchased" ? "采购件" : "自制件",
          line.label,
          r.unitCost.toFixed(2),
          r.qty,
          r.lineCost.toFixed(2),
          r.lineWeight ? r.lineWeight.toFixed(2) : "",
        ]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(`quote-${Date.now()}.csv`, "﻿" + csv, "text/csv");
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- 事件绑定 ----------

  function bindToolbar() {
    $("#btn-export-json").addEventListener("click", exportJson);
    $("#btn-export-csv").addEventListener("click", exportCsv);
    $("#btn-print").addEventListener("click", () => window.print());
    $("#btn-clear").addEventListener("click", () => {
      if (!confirm("确认清空当前报价单？此操作不可撤销。")) return;
      entries = [];
      persist();
      renderEntries();
      renderSummary();
    });
  }

  async function init() {
    await loadData();
    renderTemplateList();
    renderEntries();
    renderSettingsForm();
    renderSummary();
    bindToolbar();
  }

  init();
})();
