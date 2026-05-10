# Planner 三视图渲染引擎升级

## 目标
把 Planner 的右侧 Canvas 区域从**单视图（仅俯视图）**升级为**三视图**（俯视图 + 正视图 + 侧视图），让它看起来更像专业的 CAD 工程图。

## 当前状态
- `planner/index.html`：右侧 `.canvas-area` 中只有一个 `<canvas id="layout-canvas">`
- `planner/layout-engine.js`：已有 `LayoutEngine` 类，包含 `draw()` 方法绘制俯视图
- `planner/app.js`：调用 `LayoutEngine.calculate()` 和 `renderLayout()` 渲染单视图

## 改造方案

### 1. HTML 结构调整（`planner/index.html`）
把 `.canvas-area` 中的单个 canvas 替换为**三视图网格布局**：

```html
<div class="canvas-area">
    <div class="views-grid">
        <div class="view-panel">
            <div class="view-label">Top View — Plan</div>
            <canvas id="canvas-top" class="view-canvas"></canvas>
        </div>
        <div class="view-panel">
            <div class="view-label">Front View — Elevation</div>
            <canvas id="canvas-front" class="view-canvas"></canvas>
        </div>
        <div class="view-panel">
            <div class="view-label">Side View — Section</div>
            <canvas id="canvas-side" class="view-canvas"></canvas>
        </div>
    </div>
    <div class="stats-bar">
        <!-- 4个统计卡片，保持不变 -->
    </div>
</div>
```

### 2. CSS 新增（`planner/style.css`）

```css
/* 三视图网格 */
.views-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 1rem;
    margin-bottom: 1rem;
}
.view-panel {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem;
    min-height: 200px;
}
.view-panel:first-child {
    /* Top view spans full width on top row */
    grid-column: 1 / -1;
}
.view-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    padding-left: 0.25rem;
}
.view-canvas {
    width: 100%;
    height: 200px;
    display: block;
    border-radius: 4px;
}
.view-panel:first-child .view-canvas {
    height: 260px; /* Top view gets more height */
}

/* 响应式：移动端堆叠 */
@media (max-width: 640px) {
    .views-grid {
        grid-template-columns: 1fr;
    }
    .view-panel:first-child {
        grid-column: auto;
    }
}
```

### 3. JavaScript 渲染引擎（修改 `planner/layout-engine.js`）

把原来的单一 `draw()` 方法拆分为三个渲染器：

```javascript
// 命名空间
window.LayoutEngine = window.LayoutEngine || {};

// 共享参数和计算（保持不变）
LayoutEngine.params = { ... };
LayoutEngine.stats = { ... };
LayoutEngine.calculate = function(params) { ... };

// 三个独立的渲染函数
LayoutEngine.drawTopView = function(canvasId) {
    // 从原来的 draw() 方法迁移过来
    // 绘制俯视图：仓库外框 + 货架行 + 通道 + Loading Zone + 比例尺 + 图例
    // 使用 LayoutEngine.params 和 LayoutEngine.stats
};

LayoutEngine.drawFrontView = function(canvasId) {
    // 正视图：货架正面（高度方向）
    // 显示：地面线 + 立柱（upright frames） + 横梁（beams） + 托盘 + 层高标注
    // 参数：levels, palletsPerBay, warehouseHeight, beamLength
    // 风格：蓝色立柱 + 橙色横梁 + 灰色托盘轮廓
};

LayoutEngine.drawSideView = function(canvasId) {
    // 侧视图：货架侧面（深度方向）
    // 显示：地面线 + 货架深度（一排货架的侧面轮廓） + 通道空间 + 叉车示意
    // 参数：aisleWidth, rackDepth, levels
    // 风格：蓝色货架侧面 + 虚线通道区域 + 叉车简图
};

// 统一入口
LayoutEngine.drawAll = function() {
    this.drawTopView('canvas-top');
    this.drawFrontView('canvas-front');
    this.drawSideView('canvas-side');
};

// 初始化（替换原来的 initInteractive）
LayoutEngine.initInteractive = function() {
    // 绑定滑块事件 → calculate() → drawAll() → updateStats()
    // 150ms debounce
};
```

### 4. 正视图绘制细节（Front View — Elevation）

```
视觉效果（从左到右一排货架的正面）：

    ┌─────────────────────────────────┐
    │  Level 4  ┌──┐  ┌──┐  ┌──┐    │  ← 横梁（橙色 #f59e0b）
    │           │▓▓│  │▓▓│  │▓▓│    │  ← 托盘（灰色 #94a3b8）
    ├───────────┼──┼──┼──┼──┼──┤    │
    │  Level 3  └──┘  └──┘  └──┘    │
    │           │▓▓│  │▓▓│  │▓▓│    │
    ├───────────┼──┼──┼──┼──┼──┤    │
    │  Level 2  └──┘  └──┘  └──┘    │
    │           │▓▓│  │▓▓│  │▓▓│    │
    ├───────────┼──┼──┼──┼──┼──┤    │
    │  Level 1  └──┘  └──┘  └──┘    │
    │           │▓▓│  │▓▓│  │▓▓│    │
    ├═══════════╪══╪══╪══╪══╪═══════┤
    │  Ground   ┃  ┃  ┃  ┃  ┃       │  ← 立柱（蓝色 #1e40af）
    └───────────┴──┴──┴──┴──┴───────┘
    
    标注：
    - 左侧：总高度标注（如 12m）
    - 右侧：每层层高标注（如 3.0m）
    - 底部：Bay 宽度标注（如 2.7m × 3 pallets）
    - 顶部：racking type 名称
```

### 5. 侧视图绘制细节（Side View — Section）

```
视觉效果（货架侧面 + 通道）：

    ┌──────────────────────────────────────────┐
    │  Rack Depth    │     Aisle               │
    │                │                         │
    │  ┌──────────┐  │                         │
    │  │ Level 4  │  │                         │
    │  ├──────────┤  │      🚛 Fork            │
    │  │ Level 3  │  │      Access Zone        │
    │  ├──────────┤  │                         │
    │  │ Level 2  │  │                         │
    │  ├──────────┤  │                         │
    │  │ Level 1  │  │                         │
    │  └──────────┘  │                         │
    ╞════════════════╪═════════════════════════╡
    │   Ground       │                         │
    └────────────────┴─────────────────────────┘
    
    标注：
    - 顶部：Rack Depth (e.g., 1.0m)
    - 中间：Aisle Width (e.g., 3.2m)
    - 右侧：叉车操作区域标注
    - 底部：地面线
```

### 6. app.js 适配
- 把原来调用 `renderLayout()` 的地方改为调用 `LayoutEngine.drawAll()`
- 滑块事件绑定改为触发 `LayoutEngine.calculate() → drawAll() → updateStats()`
- 结果页面的 canvas 渲染也适配三视图

### 7. 版本更新
- `planner/index.html`：`style.css?v=20260510c`
- `planner/style.css`：新增三视图 CSS
- `planner/layout-engine.js`：`?v=20260510c`
- `planner/app.js`：`?v=20260510c`

## 关键约束
- **保持现有功能不变**：推荐引擎、表单提交、结果页面、localStorage 持久化全部不动
- **Canvas 响应式**：三个 canvas 都要随窗口大小自适应
- **视觉风格一致**：使用现有配色（深蓝 #1a365d / #1e40af，橙色 #f59e0b / #d97706，灰色 #94a3b8）
- **标注清晰**：每个视图都要有标题标签、尺寸标注、图例
- **性能**：三视图绘制总时间 < 50ms，保持 150ms debounce

## 完成后验证
1. 本地启动 `python3 -m http.server 8082`，打开 `/planner/`
2. 进入 Warehouse Specs 页面，检查三视图是否正常显示
3. 拖动左侧滑块，确认三个视图同步更新
4. 检查响应式布局（窗口缩小时是否合理堆叠）
