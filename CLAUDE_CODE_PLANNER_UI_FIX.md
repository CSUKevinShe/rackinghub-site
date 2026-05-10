# RackingHub Planner — UI/UX 优化规范

## 背景
Planner 的 5 项功能升级已完成（尺寸线、3D 预览、折叠面板、建筑柱子、高级参数），功能可用但界面体验不专业。需要在**不改动任何业务逻辑**的前提下，优化视觉呈现和交互体验。

## 原则
- **只改样式和渲染，不改业务逻辑** — 推荐引擎、表单提交、localStorage、事件绑定、数据计算一律不动
- **保持现有配色体系** — 主色 `#0052cc`（深蓝）、强调色 `#ff6b35`（橙）、背景 `#f8f9fa`、统计栏 `#1a1a2e`
- **保持响应式** — ≤768px 单列堆叠，≤640px 进一步简化
- **保持 Canvas 渲染性能** — 尺寸线、建筑柱子等 Canvas 绘制逻辑可以调字体/线宽，但不要引入重型库

---

## 问题清单 & 优化目标

### P0 — 标签与控件分两行（严重）
**现状：** "Width: 40 m" 标签在一行，橙色滑块在下一行，视觉断开，浪费垂直空间。
**目标：** 标签、值、控件在同一行（或紧凑的两行内），类似成熟 SaaS 表单的 inline layout。滑块轨道和标签对齐，值显示在右侧或轨道上方。

### P0 — 2D 图内文字太小（严重）
**现状：** "Aisle 1 (3.2m)"、"Row 1"、"480 lots" 等内部标注字号过小，几乎无法阅读。
**目标：** Canvas 内标注字号至少 12px（2x 屏 24px），关键标注（行号、通道宽度、托盘位数）清晰可读。可适当增大 Canvas 容器高度或调整内部间距来容纳更大字体。

### P1 — 单位不一致
**现状：** 左侧输入用 m（60m），Top View 显示 60,000（mm），Side View 混用 m 和 mm，没有单位标注。
**目标：** 统一策略 — 建议：整体尺寸（仓库长宽高）用 m 标注，内部细节（Bay 宽度、层高）用 m 标注，仅当值 > 1000 时用 mm。所有标注必须带单位后缀。

### P1 — 折叠面板箭头太弱
**现状：** ▼/▶ 纯文本字符，缺乏交互感，用户可能不知道可点击。
**目标：** 改为更明显的 toggle 样式 — 可参考：加粗 Unicode 箭头 + hover 背景色变化 + cursor:pointer，或使用 CSS 伪元素绘制更专业的箭头（chevron）。展开/收起加平滑过渡动画。

### P1 — 3D 预览与 2D 图风格脱节
**现状：** 2D 是工程图风格（白底+深色线条+标注），3D 是简陋灰色网格+方块，不像同一个产品。
**目标：** 3D 预览区域至少做到：
- 容器有标题栏（类似 2D 视图的 "TOP VIEW — Plan" 风格）
- 背景色与页面协调（不要用纯白网格，用浅灰渐变或深蓝底色）
- 标题文字 "3D PREVIEW — DRAG TO ROTATE" 更突出
- 加载状态显示 loading spinner，而不是一片空白

### P1 — 左侧面板太密
**现状：** Racking Configuration 区域下拉框 + 3 个滑块挤在一起，没有呼吸空间。
**目标：** 各参数组之间增加 padding/margin，下拉框与滑块视觉统一（去掉下拉框的独立白色边框，融入整体风格）。折叠面板内部参数间距一致。

### P2 — 统计卡片数字格式
**现状：** "¥35K" 格式不够精确（35K 是 35,000 还是 350,000？）。
**目标：** 改为 "¥35,000" 或 "¥35K CNY"，增加货币单位清晰度。

---

## 接口 & 边界

### 不可修改
- `App.goToStep()` / `App.submitContact()` / `App.generatePlan()` — 导航和表单逻辑
- `LayoutEngine.calculate()` / `LayoutEngine.drawAll()` — 计算和渲染入口
- `LayoutEngine.drawDimensionLine()` — 尺寸线函数（可调内部字体/线宽参数，但函数签名不变）
- `ThreePreview.init()` / `ThreePreview.render()` — 3D 初始化（可调场景颜色/光照/相机，但不改 Three.js 加载方式）
- `generateRecommendations()` / `calculateScore()` — 推荐引擎
- localStorage 读写逻辑
- 表单字段 name/id 属性
- 任何 `.json` 数据文件

### 可以修改
- `planner/style.css` — 任何样式
- `planner/layout-engine.js` — Canvas 字体大小、标注位置计算、单位格式化函数
- `planner/app.js` — 折叠面板 toggle 动画、3D 容器 loading 状态、滑块标签布局相关 DOM 操作
- `planner/three-view.js` — Three.js 场景颜色、背景、光照、标题渲染
- `planner/index.html` — 折叠面板 HTML 结构（如果需要换用更语义化的 markup）、3D 容器 wrapper

### 必须保留
- 4 个折叠面板（Warehouse Dimensions / Racking Config / Pallet Details / Building Structure）
- 三视图（Top / Front / Side）+ 3D 预览
- 底部统计卡片（Pallet Positions / Space Utilization / Rack Rows / Est. Cost）
- 滑块实时联动 Canvas 渲染（150ms debounce）
- "Generate My Racking Plan" 按钮
- 移动端响应式断点

---

## 验收标准
1. 所有标签、值、控件在视觉上紧密关联，不再出现"标签在上、控件在下"的断裂感
2. 2D 图内所有标注字号 ≥ 12px，关键信息一眼可读
3. 所有尺寸标注带明确单位（m 或 mm），同一视图中单位一致
4. 折叠面板箭头有明显交互感（hover 效果 + cursor）
5. 3D 预览有标题栏、loading 状态、与 2D 图协调的配色
6. 左侧面板参数间距舒适，不拥挤
7. 所有改动在本地 `http://localhost:8080/planner/` 验证通过
8. 控制台无 JS 错误
9. 移动端（≤768px）布局正常

---

## 部署
完成后：
1. 本地预览验证（截图确认以上 9 项）
2. `git add -A && git commit -m "planner: UI/UX polish - fix layout, typography, 3D styling" && git push`
3. 等待 Cloudflare Pages 构建完成
