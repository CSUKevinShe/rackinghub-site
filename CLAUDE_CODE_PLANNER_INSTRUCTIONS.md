# Claude Code 开发指令：RackingHub 交互式仓库规划工具

## 🎯 项目目标

我们要实现一个**真正的交互式仓库规划工具**，类似 warehouse-planner.com，但要结合 RackingHub 的业务场景（货架制造商）。

**核心交互**：
- 用户调整参数（仓库长/宽/货架类型/通道宽/层数）→ 右侧 2D 布局图**实时更新**
- 实时显示统计数据：总托盘位、空间利用率、推荐货架类型
- 最终引导用户提交询盘（已有留资系统）

**不是**：
- 不是简单的表单填完才出结果（我们现在的 Planner 就是这样，转化率太低）
- 不是纯静态页面加一张预览图（我之前做的，太表面）
- 不是 3D 渲染引擎（过度工程）

## 📊 竞品分析：warehouse-planner.com

### 它是怎么工作的？（已完整分析源码）

| 技术点 | warehouse-planner.com 的方案 | 复杂度 |
|--------|---------------------------|--------|
| 2D 渲染 | 纯 SVG，`document.createElementNS` 动态创建 `<rect>` 和 `<polygon>` | 低 |
| 3D 视图 | SVG 等轴测投影——用 polygon 的 points 属性模拟倾斜面，算初中数学 | 中 |
| JS 库 | **无任何第三方库**，纯 Vanilla JS，`layoutm22.min.js` 只有 36KB | 极低 |
| 核心逻辑 | 约 30 个输入变量 → 计算坐标 → 生成 SVG → 2D 俯视图 + 等轴测 3D | 低 |
| 实时更新 | `input` 事件监听 → 更新内部 state → 重绘 SVG | 低 |

### 它的核心代码逻辑（已阅读）

```
1. 用户输入参数 → 存储在 t 对象中（约 30 个变量）
2. 计算坐标 → 根据参数算出每个矩形的位置
3. 生成 SVG → 用 document.createElementNS 动态创建 <rect> <polygon>
4. 2D 视图 = 俯视图（简单矩形）
5. 3D 视图 = 等轴测投影（用 polygon 的 points 属性模拟倾斜面）
```

### 它的输入参数（关键变量）

```javascript
// 仓库/建筑参数
rax: 15000,        // 柱距 X (mm)
ray: 12000,        // 柱距 Y (mm)
sbx: 400,          // 柱宽 X (mm)
sby: 300,          // 柱深 Y (mm)
rzx: 2,            // X 方向柱数
rzy: 1,            // Y 方向柱数
ukb: 6000,         // 净高 (mm)
hh: 7500,          // 建筑高度 (mm)
ma: 200,           // 墙厚 (mm)
roo: 0,            // 屋顶角度 (°)

// 货架区域参数
regx: 1500,        // 区域原点 X
regy: 100,         // 区域原点 Y
ast3: 2500,        // 通道宽度 (mm)
pti: 1200,         // 托盘深度 (mm)
pbr: 800,          // 托盘宽度 (mm)
pho: 1000,         // 托盘高度 (mm)
lfw: 2700,         // 货架框架宽度 (mm)
lfh: 1200,         // 货架横梁高度 (mm)
pz: 3,             // 每层托盘数
az: 5,             // 层数
bzx: 2,            // X 方向货架块数
bzy: 1,            // Y 方向货架块数
quer: 0,           // 货架方向 (0/1)
```

## 🏗️ 我们现有的资源

| 资源 | 状态 | 位置 |
|------|------|------|
| 项目目录 | `~/rackinghub-site` | Git 仓库 |
| Planner 页面 | 已有，但只有表单→结果流程 | `planner/index.html`, `planner/app.js`, `planner/style.css` |
| 推荐引擎 | 已有，多维度评分（承重/存取/空间/成本） | `planner/app.js` 中的 `generateRecommendations()` |
| 产品数据 | 已有，8 种货架类型 | `planner/data/products.json` |
| 案例数据 | 已有 | `planner/data/cases.json` |
| 留资系统 | 已有，Cloudflare Pages Functions + KV | `functions/planner/submit.js` |
| 统一 CSS | 已完成，Planner 和主站共用同一套 design tokens | `/style.css` + `planner/style.css` |
| Canvas 2D 逻辑 | 已有 `drawHeroPreview()` 和 `renderLayout()`，但只有静态绘制 | `planner/app.js` |

### 现有 app.js 关键函数

- `App.goToStep(step)` — 页面导航
- `App.generatePlan(e)` — 规格表单提交 → 生成推荐方案
- `generateRecommendations(specs)` — 推荐引擎（多维度评分）
- `renderLayout(rec)` — Canvas 2D 仓库布局图（只在结果页显示）
- `drawHeroPreview()` — Hero 区预设预览图（我刚加的）

## 📋 开发要求

### 技术约束

1. **零第三方库** — 就像 warehouse-planner.com 一样，纯 Vanilla JS，不引入 Three.js、Fabric.js 等
2. **纯前端** — 所有计算在浏览器端完成，无需后端
3. **Cloudflare Pages 兼容** — 部署到 `rackinghub.com/planner/`，零额外成本
4. **复用现有系统** — 保留推荐引擎、留资系统、产品数据、统一 CSS
5. **ES5 兼容** — 现有 app.js 使用 ES5 语法（var、function），新代码保持一致风格
6. **中文注释** — 代码注释用中文，UI 文本用英文

### 功能需求

#### Phase 1：参数化 2D 布局（核心）

1. **左侧参数面板**（复用现有 specs-form，但改成实时更新模式）
   - 仓库长度（m）：10-200
   - 仓库宽度（m）：10-100
   - 货架类型选择：Heavy Duty / Medium Duty / Radio Shuttle / Drive-In
   - 通道宽度（m）：1.5-5.0
   - 货架层数：1-10
   - 每层托盘数：1-10

2. **右侧实时布局图**
   - 用 Canvas 或 SVG 绘制 2D 俯视图
   - 参数变化时 **0.5 秒内** 重绘
   - 显示：仓库轮廓、货架区域、通道、入口、比例尺
   - 颜色方案：货架深蓝色 `#1a365d`，通道浅黄色 `rgba(251,191,36,0.15)`，入口绿色 `#10b981`

3. **实时统计面板**（布局图下方或旁边）
   - 总托盘位数量
   - 空间利用率（%）
   - 推荐货架类型（匹配现有推荐引擎）
   - 估算成本范围

#### Phase 2：集成推荐引擎

1. 用户调整参数后，自动运行推荐引擎
2. 显示 Top 3 推荐方案，带评分
3. 点击方案可切换右侧布局图

#### Phase 3：3D 等轴测视图（可选）

1. 加一个"切换到 3D"按钮
2. 用 SVG polygon 模拟等轴测投影
3. 参考 warehouse-planner.com 的 isometric 实现

### 代码质量要求

1. **不要自己写自己评价** — 写完直接测试，不要自己评价自己的代码
2. **本地预览验证** — 用 `python3 -m http.server 8888` 启动本地服务器，在 `http://localhost:8888/planner/` 验证
3. **保持现有功能** — 不要破坏现有的留资系统、推荐引擎、案例展示
4. **版本缓存** — JS/CSS 链接带版本号（如 `app.js?v=20260510a`），确保 Cloudflare 缓存刷新

### 项目结构

```
planner/
  ├── index.html          # 主页面（已有，需要修改 Hero 和添加参数面板）
  ├── style.css           # 样式（已有，需要添加参数面板和布局图样式）
  ├── app.js              # 核心逻辑（已有，需要添加实时布局引擎）
  ├── layout-engine.js    # ← 新增：参数化布局引擎（或集成到 app.js）
  └── data/
      ├── products.json   # 产品数据（已有）
      └── cases.json      # 案例数据（已有）
```

## 🚀 开发步骤

### Step 1：研究竞品源码

1. 访问 `https://warehouse-planner.com/tool.html`
2. 下载 `wtool.css` 和 `js/layoutm22.min.js`（或直接在浏览器控制台查看）
3. 理解它的参数计算逻辑和 SVG 生成方式
4. 重点关注：如何从输入变量计算出每个货架/通道的坐标

### Step 2：设计参数化布局引擎

1. 创建一个 `LayoutEngine` 类或函数
2. 输入：仓库长/宽、货架类型、通道宽、层数等
3. 输出：每个货架/通道的坐标数组
4. 渲染：用 Canvas 2D 绘制（复用现有 renderLayout 逻辑，但改成参数化）

### Step 3：实现参数面板 + 实时联动

1. 在 Hero 区下方或左侧添加参数面板
2. 每个参数 input 绑定 `input` 事件
3. 事件触发 → 更新 state → 调用 `LayoutEngine` → 重绘布局图
4. 防抖处理：避免每次按键都重绘（200ms 延迟）

### Step 4：集成推荐引擎

1. 参数变化时，自动运行 `generateRecommendations()`
2. 显示 Top 3 推荐方案
3. 点击方案可更新布局图

### Step 5：本地预览验证

1. `cd ~/rackinghub-site && python3 -m http.server 8888`
2. 访问 `http://localhost:8888/planner/`
3. 验证：调整参数 → 布局图实时更新 → 统计数据更新
4. 验证：移动端响应式正常

### Step 6：提交代码

1. `git add -A && git commit -m "feat: interactive warehouse planner with real-time 2D layout"`
2. `git push`（如果网络问题用代理）

## 📝 重要提示

- **不要重写整个页面** — 保留现有的导航、留资系统、案例展示、推荐引擎
- **优先实现核心交互** — 参数变化 → 实时更新布局图，这是最重要的
- **3D 是锦上添花** — 先做好 2D 实时联动，3D 可以后续加
- **参考竞品但不要抄袭** — 学习它的技术实现，但 UI 设计和业务逻辑要符合 RackingHub 品牌
- **代码写完后直接本地预览验证**，不要自己评价代码质量

开始吧！先研究 warehouse-planner.com 的源码，然后开始实现。
