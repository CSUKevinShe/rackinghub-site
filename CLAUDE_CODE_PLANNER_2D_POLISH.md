# RackingHub Planner — UI 重构规范（2D 专业版）

## 核心指令
**砍掉 3D，专攻 2D，做专业。** 参数区要够大，滑块要对齐，界面要像一个工程工具，不是一个玩具。

## 原则
- **只改样式、布局、渲染，不改业务逻辑** — 推荐引擎、表单提交、事件绑定、localStorage、LayoutEngine.calculate() 一律不动
- **配色体系不变** — 主色 `#1a365d`、强调色 `#ff6b35`（或从 style.css `:root` 继承）
- **保持响应式**

---

## 问题 & 目标

### 1. 3D 预览 — 暂时隐藏
**现状：** 底部一个很大的 3D 预览区域，目前渲染质量粗糙，和 2D 工程图风格不搭，浪费屏幕空间。
**目标：** 隐藏整个 `.view-panel-3d` 区域。不删代码，只 CSS `display: none`。把省下来的空间给 2D 视图或参数区。
**注意：** Three.js 的 importmap 和 `three-view.js` 文件也暂时别加载，减少首屏负担。

### 2. 参数区面积加大
**现状：** `.planner-layout` 是 `360px 1fr`，左侧参数面板太窄（360px），导致：
- 滑块和标签挤在一起
- 展开 Pallet Details + Building Structure 后内容很密
- 没有呼吸空间
**目标：** 左侧面板加宽到足够舒适的宽度（建议 420px~480px 范围，由 Claude Code 自行判断最佳值），右侧 Canvas 区域相应缩小但保证 2D 图可读。整体 `planner-layout` 的 `max-width` 和 `gap` 也需要配合调整，确保在常见桌面分辨率（1440px、1920px）下不浪费空间。

### 3. 滑块对齐
**现状：** 参面板里，不同参数的滑块轨道左边缘/右边缘没有严格对齐。Label 文字长度不一导致滑块起始位置参差不齐。视觉上很乱。
**目标：** 同一组内的所有滑块轨道严格对齐（左边缘和右边缘在同一条垂直线上）。Label 文字区域统一宽度（可用 `min-width` 或 `grid`），数值 Badge 右对齐。下拉框（Racking Type）的宽度和滑块轨道对齐。

### 4. 2D 视图专业感
**现状：** 三视图已经有了尺寸线和标注，但整体呈现还是"示意图"级别，不是"工程图"级别。
**目标：** 由 Claude Code 自行优化 Canvas 渲染的视觉质感。方向参考：
- 线条粗细有层次（轮廓线 > 内部线 > 辅助线）
- 标注文字清晰可读（已经 ≥ 11px，保持）
- 颜色方案更像 CAD 出图（例如：货架结构用深蓝色/黑色，通道用浅色/虚线，Loading Zone 用绿色高亮）
- 可以考虑给 Top View 增加简单的网格背景（grid lines）作为参考

### 5. 整体布局优化
**现状：** 当前布局在宽屏下右侧 Canvas 区域和左侧参数区之间比例失调，下方统计栏（stats-bar）和按钮区域也有改进空间。
**目标：** 由 Claude Code 自行优化整体视觉层次。确保：
- 页面标题 "Describe Your Warehouse" 和下方内容有清晰的层级
- 参数面板有合适的内边距和背景色区分
- 底部操作按钮（Back + Generate）视觉突出但不突兀
- 统计卡片（stats-bar）信息层次清晰

---

## 接口 & 边界

### 不可修改
- `App.goToStep()` / `App.submitContact()` / `App.generatePlan()` — 导航和表单逻辑
- `LayoutEngine.calculate()` / `LayoutEngine.drawAll()` — 计算和渲染入口
- `LayoutEngine.drawDimensionLine()` — 尺寸线函数（可调内部颜色/线宽/字体，但函数签名不变）
- `generateRecommendations()` / `calculateScore()` — 推荐引擎
- localStorage 读写逻辑
- 表单字段 name/id 属性
- 任何 `.json` 数据文件
- 折叠面板 toggle 逻辑（`toggleCollapsible()` 函数）

### 可以修改
- `planner/style.css` — 任何样式（布局、对齐、颜色、间距、3D 隐藏）
- `planner/layout-engine.js` — Canvas 渲染颜色、线宽、网格背景、标注样式
- `planner/app.js` — 仅涉及 Three.js 加载初始化部分（跳过加载）
- `planner/index.html` — 3D importmap 条件加载、版本号更新

### 必须保留
- 4 个折叠面板（Warehouse Dimensions / Racking Config / Pallet Details / Building Structure）
- 三视图（Top / Front / Side）
- 底部统计卡片（Pallet Positions / Space Utilization / Rack Rows / Est. Cost）
- 滑块实时联动 Canvas 渲染（150ms debounce）
- "Generate My Racking Plan" 按钮
- 移动端响应式断点

---

## 验收标准
1. 3D 预览区域完全隐藏，Three.js 不再加载
2. 左侧参数面板宽度 ≥ 420px，展开所有面板后不拥挤
3. 同一组内所有滑块轨道左右边缘严格对齐
4. 下拉框宽度与滑块轨道对齐
5. 2D 视图线条有层次，颜色方案更像 CAD 出图
6. 所有标注清晰可读（≥ 11px）
7. 整体布局在 1440px 和 1920px 宽度下视觉平衡
8. 控制台无 JS 错误
9. 移动端（≤768px）布局正常

---

## 部署
完成后：
1. 本地预览验证（截图确认以上 9 项）
2. `git add -A && git commit -m "planner: UI refactor - remove 3D, widen params, align sliders, 2D polish" && git push`
3. 等待 Cloudflare Pages 构建完成
