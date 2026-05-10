# Claude Code 紧急任务：重写 Planner 布局为专业左右分栏

## 🎯 当前问题

现在的 Planner specs 页面是**单列垂直堆叠**，不像专业工具。需要改成和 warehouse-planner.com 一样的**左右分栏布局**。

## 📊 竞品布局分析（warehouse-planner.com/tool.html）

### 它的布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [顶部导航栏]                                            │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│  [左侧参数面板]          │   [右侧大 Canvas/SVG 布局图]   │
│  ┌──────────────────┐    │   ┌──────────────────────┐   │
│  │ Data | Layout     │    │   │                      │   │
│  ├──────────────────┤    │   │                      │   │
│  │ 仓库参数          │    │   │   2D 俯视图           │   │
│  │ - 柱距 X: 15000  │    │   │   实时更新              │   │
│  │ - 柱距 Y: 12000  │───→│   │                      │   │
│  │ - 通道宽: 2500   │    │   │                      │   │
│  │ - 层数: 5        │    │   │                      │   │
│  │                  │    │   │                      │   │
│  │ 货架参数          │    │   └──────────────────────┘   │
│  │ - 托盘尺寸        │    │                              │
│  │ - 货架类型        │    │   [底部统计面板]              │
│  │                  │    │   托盘位: xxx | 利用率: xx%   │
│  └──────────────────┘    │                              │
│                          │                              │
└──────────────────────────┴──────────────────────────────┘
```

### 关键设计特点

1. **左侧固定宽度参数面板**（约 320-400px 宽）
   - 可滚动的参数列表
   - 每个参数有 +/- 按钮或直接输入
   - 参数分类折叠（仓库参数 / 货架参数 / 托盘参数）

2. **右侧占据剩余空间的大画布**
   - Canvas 或 SVG 渲染
   - 自适应大小
   - 参数变化时实时更新

3. **布局响应式**
   - 桌面端：左右分栏
   - 移动端：上下堆叠（画布在上，参数在下）

## 🔧 你要做的改动

### 1. 重写 `planner/index.html` 的 specs 页面部分

找到 `<section id="page-specs">`，改成左右分栏：

```html
<section id="page-specs" class="page">
    <div class="progress-bar">...</div>
    
    <h2>Describe Your Warehouse</h2>
    
    <!-- 交互布局容器 -->
    <div class="planner-layout">
        <!-- 左侧：参数面板 -->
        <div class="param-sidebar">
            <!-- 保留现有的 slider 控件 -->
            <div class="param-group">
                <h4>📐 Warehouse Dimensions</h4>
                <div class="param-slider">
                    <label>Length: <span id="val-length">60</span>m</label>
                    <input type="range" id="interactive-length" min="10" max="200" value="60">
                </div>
                <div class="param-slider">
                    <label>Width: <span id="val-width">40</span>m</label>
                    <input type="range" id="interactive-width" min="10" max="100" value="40">
                </div>
                <div class="param-slider">
                    <label>Clear Height: <span id="val-height">9</span>m</label>
                    <input type="range" id="interactive-height" min="3" max="20" value="9">
                </div>
            </div>
            
            <div class="param-group">
                <h4>🏗️ Racking Configuration</h4>
                <div class="param-select">
                    <label>Racking Type</label>
                    <select id="interactive-racking">
                        <option value="selective-heavy">Heavy-Duty Selective</option>
                        <option value="selective-medium">Medium-Duty Selective</option>
                        <option value="drive-in">Drive-In Racking</option>
                        <option value="radio-shuttle">Radio Shuttle</option>
                        <option value="vna">VNA</option>
                        <option value="push-back">Push-Back</option>
                    </select>
                </div>
                <div class="param-slider">
                    <label>Aisle Width: <span id="val-aisle">3.2</span>m</label>
                    <input type="range" id="interactive-aisle" min="1.5" max="5.0" step="0.1" value="3.2">
                </div>
                <div class="param-slider">
                    <label>Levels: <span id="val-levels">4</span></label>
                    <input type="range" id="interactive-levels" min="1" max="10" value="4">
                </div>
                <div class="param-slider">
                    <label>Pallets/Bay: <span id="val-pallets">3</span></label>
                    <input type="range" id="interactive-pallets" min="1" max="10" value="3">
                </div>
            </div>
        </div>
        
        <!-- 右侧：Canvas 布局图 + 统计 -->
        <div class="canvas-area">
            <canvas id="layout-canvas"></canvas>
            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-value" id="stat-positions">0</span>
                    <span class="stat-label">Pallet Positions</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-utilization">0%</span>
                    <span class="stat-label">Space Utilization</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-rows">0</span>
                    <span class="stat-label">Rack Rows</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="stat-cost">¥0</span>
                    <span class="stat-label">Est. Cost</span>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 底部按钮 -->
    <div class="form-actions">
        <button type="button" onclick="App.goToStep(2)">← Back</button>
        <button type="button" onclick="App.generatePlan(event)">Generate My Racking Plan →</button>
    </div>
</section>
```

### 2. 更新 `planner/style.css`

添加以下样式：

```css
/* 左右分栏布局 */
.planner-layout {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 2rem;
    min-height: 500px;
}

/* 左侧参数面板 */
.param-sidebar {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 1.5rem;
    overflow-y: auto;
    max-height: 600px;
}

.param-group {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.param-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.param-group h4 {
    margin-bottom: 1rem;
    font-size: 0.95rem;
    color: #1a365d;
}

.param-slider {
    margin-bottom: 1rem;
}

.param-slider label {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #4b5563;
    margin-bottom: 0.5rem;
}

.param-slider label span {
    font-weight: 600;
    color: #1a365d;
}

.param-slider input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
    -webkit-appearance: none;
}

.param-slider input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #f59e0b;
    border: 2px solid #1a365d;
    cursor: pointer;
}

.param-select {
    margin-bottom: 1rem;
}

.param-select label {
    display: block;
    font-size: 0.85rem;
    color: #4b5563;
    margin-bottom: 0.5rem;
}

.param-select select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.85rem;
}

/* 右侧 Canvas 区域 */
.canvas-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.canvas-area canvas {
    flex: 1;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    width: 100%;
    min-height: 400px;
}

/* 底部统计面板 */
.stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.stat-item {
    background: #1a365d;
    color: white;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
}

.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: 0.75rem;
    opacity: 0.8;
}

/* 响应式 */
@media (max-width: 1024px) {
    .planner-layout {
        grid-template-columns: 1fr;
    }
    .param-sidebar {
        order: 2;
        max-height: none;
    }
    .canvas-area {
        order: 1;
    }
    .canvas-area canvas {
        min-height: 300px;
    }
}

@media (max-width: 640px) {
    .stats-bar {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

### 3. 保持 `layout-engine.js` 不变

现有的计算逻辑是正确的，只需要确保它被正确调用。

### 4. 在 `app.js` 中初始化联动

确保 DOMContentLoaded 时：
1. 初始化 Canvas
2. 绑定所有 slider 的 `input` 事件
3. 防抖 150ms 后调用 `LayoutEngine.draw()`
4. 更新统计面板

## 🎯 关键要求

1. **左侧参数面板固定 360px 宽**，可滚动
2. **右侧 Canvas 占据剩余空间**，自适应高度
3. **参数变化实时更新**，150ms 防抖
4. **移动端堆叠**，画布在上参数在下
5. **保留所有现有功能**（推荐引擎、留资系统）
6. **版本号更新** `v=20260510b`

开始吧！
