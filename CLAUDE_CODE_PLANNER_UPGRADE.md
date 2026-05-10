# Planner 全面升级 — 工程级细节增强

## 概述
对 RackingHub Planner 进行 5 项升级，让它在工程细节上接近 warehouse-planner.com 的水平，同时保持我们的用户体验优势（滑块 + 推荐引擎 + 三视图 + 询盘引导）。

---

## 改进 1：工程尺寸线标注（高优先级）

### 目标
在三视图上叠加精确的 CAD 风格尺寸线，让图纸看起来像专业工程图。

### 尺寸线风格
```
效果示例：
    ═══ 60,000 ═══   ← 带端点的尺寸线（两端短竖线 + 中间数值）
    ┌────────────────┐
    │                │
6000│                │6000  ← 垂直尺寸线
    │                │
    └────────────────┘
```

### 实现细节

**俯视图（Top View）新增尺寸线：**
- 顶部：仓库总长度标注（如 `60,000`）
- 左侧：仓库总宽度标注（如 `40,000`）
- 每排货架之间：行间距标注（如 `3,200`）
- 通道上方：通道宽度标注（如 `Aisle 3,200`）
- 底部：Loading Zone 标注（如 `Loading 3,000`）

**正视图（Front View）新增尺寸线：**
- 左侧：总高度标注（如 `8,000`）
- 右侧：每层层高标注（如 `2,000`）
- 底部：Bay 宽度标注（如 `2,700`）
- 每层横梁处：托盘间距标注

**侧视图（Side View）新增尺寸线：**
- 顶部：Rack Depth 标注（如 `1,050`）
- 中间：Aisle Width 标注（如 `3,200`）
- 左侧：总高度标注（如 `8,000`）
- 右侧：每层层高标注

### 尺寸线绘制函数

```javascript
function drawDimensionLine(ctx, options) {
    // options: { startX, startY, endX, endY, label, offset, color, fontSize }
    // 绘制：端点竖线 + 连接线 + 居中文字
    // 水平线：端点在 (startX-offset, startY) 和 (endX+offset, endY)
    // 垂直线：端点在 (startX, startY-offset) 和 (endX, endY+offset)
    // 颜色：#64748b（灰色），字体：10px monospace
    // 端点：2px 宽的短竖线/横线，长度 6px
}
```

### 参数格式化
- 所有尺寸统一以 **mm** 为单位显示（m → mm：60m → 60,000）
- 使用千位分隔符（`60,000` 而非 `60000`）
- 标注文字用 `formatDimension(meters)` 函数转换

---

## 改进 2：3D 交互式预览（高优先级）

### 目标
在三视图下方增加一个可交互的 3D 预览区域，使用 Three.js 渲染简单的货架 3D 模型。

### 技术方案
- 使用 Three.js CDN（`https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js`）
- 使用 OrbitControls（`https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js`）
- 渲染一个简化的货架 3D 模型（不是完整的仓库，而是一排货架的 3D 展示）

### 3D 场景内容
```
场景：一排货架的 3D 模型
- 立柱（Upright Frames）：蓝色 BoxGeometry (#1e40af)
- 横梁（Beams）：橙色 BoxGeometry (#f59e0b)
- 托盘（Pallets）：浅灰色 BoxGeometry (#d1d5db）
- 地面：浅灰色平面
- 灯光：AmbientLight + DirectionalLight

交互：
- 鼠标拖拽旋转（OrbitControls）
- 滚轮缩放
- 自动旋转（缓慢旋转展示）
```

### HTML 结构
```html
<div class="view-panel view-panel-3d">
    <div class="view-label">3D Preview — Drag to Rotate</div>
    <canvas id="canvas-3d" class="view-canvas-3d"></canvas>
</div>
```

### CSS
```css
.view-panel-3d {
    grid-column: 1 / -1; /* 全宽 */
}
.view-canvas-3d {
    width: 100%;
    height: 320px;
    display: block;
    border-radius: 4px;
    cursor: grab;
}
.view-canvas-3d:active {
    cursor: grabbing;
}
```

### JS 实现要点
```javascript
function init3DPreview() {
    const canvas = document.getElementById('canvas-3d');
    if (!canvas) return;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 2, 0);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    
    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    scene.add(directional);
    
    // 构建货架模型（根据 LayoutEngine.params 动态生成）
    buildRackModel(scene, LayoutEngine.params);
    
    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    // Resize handler
    window.addEventListener('resize', () => { /* update renderer size */ });
}

function buildRackModel(scene, params) {
    // 清除旧模型
    // 根据 params.levels, params.palletsPerLevel, params.warehouseHeight 等
    // 创建立柱、横梁、托盘的 Mesh
    // 立柱：4 根（或根据 palletsPerLevel 计算）
    // 横梁：levels × (palletsPerLevel + 1) 根
    // 托盘：levels × palletsPerLevel 个
}
```

### 依赖加载
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<!-- OrbitControls 用 importmap 或直接内联 -->
```

**注意：** 由于 CDN 加载可能有延迟，需要加一个 loading 状态：
```html
<div id="3d-loading" class="view-label">Loading 3D engine...</div>
```

---

## 改进 3：增加高级参数（中优先级）

### 目标
在左侧参数面板增加更多专业参数，让客户感觉这是一个工程级工具。

### 新增参数分组

**在现有 "Racking Configuration" 下方新增 "Pallet & Rack Details" 折叠面板：**

```
📦 Pallet & Rack Details
  ├─ Pallet Width (mm): [800]  ← 默认 800，范围 600-1400，step 50
  ├─ Pallet Depth (mm): [1200] ← 默认 1200，范围 800-1600，step 50
  ├─ Pallet Height (mm): [1000] ← 默认 1000，范围 600-1800，step 50
  ├─ Beam Height (mm): [120]   ← 默认 120，范围 80-200，step 10
  ├─ Upright Frame Depth (mm): [1050] ← 默认 1050，范围 600-1200，step 50
  └─ Inter-Pallet Gap (mm): [100] ← 默认 100，范围 50-200，step 10
```

### 实现方式
- 使用**折叠面板（Accordion）**，默认展开基础参数，高级参数收起
- 高级参数改变时触发 `LayoutEngine.calculate() → drawAll()` 重新渲染
- 参数值同步到 `LayoutEngine.params`

### 折叠面板 HTML 结构
```html
<div class="param-group collapsible">
    <button class="collapsible-toggle" onclick="this.parentElement.classList.toggle('collapsed')">
        <span class="toggle-icon">▼</span>
        <span class="toggle-label">Pallet & Rack Details</span>
    </button>
    <div class="collapsible-content">
        <!-- 新增参数滑块 -->
    </div>
</div>
```

### 折叠面板 CSS
```css
.collapsible-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    padding: 0.5rem 0;
    font-weight: 600;
    font-size: 0.875rem;
    color: #1a365d;
    cursor: pointer;
    width: 100%;
    text-align: left;
}
.toggle-icon {
    transition: transform 0.2s;
    font-size: 0.75rem;
}
.collapsed .toggle-icon {
    transform: rotate(-90deg);
}
.collapsible-content {
    max-height: 500px;
    overflow: hidden;
    transition: max-height 0.3s ease;
}
.collapsed .collapsible-content {
    max-height: 0;
}
```

---

## 改进 4：建筑元素 — 柱子显示（中优先级）

### 目标
在俯视图和 3D 预览中显示建筑柱子（Building Columns），让图纸更真实。

### 俯视图柱子显示
- 在 "Warehouse Dimensions" 分组新增参数：
  - Column Spacing X (m): [15] ← 默认 15m，范围 10-30
  - Column Spacing Y (m): [12] ← 默认 12m，范围 8-20
  - Column Size (mm): [400] ← 默认 400，范围 300-600

- 在 `drawTopView` 中绘制柱子：
  ```javascript
  // 在仓库范围内按 Column Spacing 网格绘制柱子
  for (let x = columnSpacing; x < warehouseLength; x += columnSpacing) {
      for (let y = columnSpacing; y < warehouseWidth; y += columnSpacing) {
          // 绘制小方块表示柱子
          ctx.fillStyle = 'rgba(100, 116, 139, 0.3)'; // 半透明灰色
          ctx.fillRect(px(x) - colSize/2, py(y) - colSize/2, colSize, colSize);
      }
  }
  ```

### 3D 预览柱子显示
- 在 `buildRackModel` 中同步添加柱子（灰色圆柱体或方块）

---

## 改进 5：参数面板重构（中优先级）

### 目标
把现有参数面板改造成折叠面板结构，为将来扩展预留空间。

### 新的面板结构
```
📐 Warehouse Dimensions
  ├─ Length (m): [60]
  └─ Width (m): [40]

🏗️ Racking Configuration
  ├─ Racking Type: [Heavy-Duty Selective]
  ├─ Aisle Width (m): [3.2]
  ├─ Levels: [4]
  └─ Pallets/Bay: [3]

📦 Pallet & Rack Details（默认折叠）
  ├─ Pallet Width (mm): [800]
  ├─ Pallet Depth (mm): [1200]
  ├─ Pallet Height (mm): [1000]
  ├─ Beam Height (mm): [120]
  ├─ Upright Frame Depth (mm): [1050]
  └─ Inter-Pallet Gap (mm): [100]

🏢 Building Structure（默认折叠）
  ├─ Column Spacing X (m): [15]
  ├─ Column Spacing Y (m): [12]
  └─ Column Size (mm): [400]
```

### 实现要点
- 保留现有滑块样式，只在分组标题上加折叠功能
- "Warehouse Dimensions" 和 "Racking Configuration" 默认展开
- "Pallet & Rack Details" 和 "Building Structure" 默认折叠
- 折叠状态用 `localStorage` 记住用户偏好

---

## 版本更新
- `planner/index.html`：`?v=20260510d`
- `planner/style.css`：新增折叠面板 + 3D canvas 样式
- `planner/layout-engine.js`：新增尺寸线绘制 + 柱子绘制
- `planner/app.js`：适配新参数 + 3D 初始化
- 新增 `planner/three-view.js`：Three.js 3D 预览（独立文件，按需加载）

## 关键约束
1. **保持现有功能不变**：推荐引擎、表单提交、结果页面、localStorage 全部不动
2. **性能**：3D 场景初始化 < 200ms，三视图 + 尺寸线绘制 < 50ms
3. **渐进增强**：Three.js 加载失败时，3D 面板显示 "3D preview unavailable"，不影响其他功能
4. **移动端**：折叠面板在移动端同样工作，3D canvas 高度自适应

## 完成后验证
1. 本地预览 `/planner/`，进入 Warehouse Specs 页面
2. 检查三视图上的尺寸线是否清晰
3. 检查 3D 预览是否可交互（拖拽旋转、滚轮缩放）
4. 检查折叠面板展开/收起是否流畅
5. 拖动滑块，确认所有视图和尺寸线同步更新
6. 检查响应式布局
