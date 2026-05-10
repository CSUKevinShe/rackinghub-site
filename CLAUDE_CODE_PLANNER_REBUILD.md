# RackingHub Planner — 按标杆重建（先跑通再优化）

## 策略
**先抄标杆的结构和布局，跑通 MVP，再重写优化。** 不要自己创新，先把标杆的东西做出来。

## Step 1: 分析标杆
打开 https://www.warehouse-planner.com
- 截图整个页面
- 分析页面结构（左侧面板有哪些区域、右侧有哪些视图、布局比例如何）
- 分析控件类型（输入框 vs 滑块 vs 下拉框）
- 分析 2D 画布的呈现方式（几个视图？什么角度？什么颜色？）
- 分析整体信息层次（什么最重要、什么次要）

## Step 2: 按标杆结构重建
基于 Step 1 的分析，**按标杆的结构重新组织 RackingHub Planner 的页面**：

**HTML 结构调整（index.html）：**
- 如果标杆是左右布局，我们也是左右布局
- 如果标杆的参数区有特定分区（如 Warehouse → Racking → Pallet），我们也用相同分区
- 如果标杆的视图区是单画布 vs 多画布，我们模仿

**CSS 重写（style.css）：**
- 按标杆的视觉层次写样式
- 控件样式对标标杆
- 颜色方案可以保留 RackingHub 品牌色（#1a365d + #ff6b35），但布局结构、间距、字号对标标杆

**Canvas 渲染（layout-engine.js）：**
- 如果标杆的画布是单视图，我们改成单视图
- 如果标杆有网格背景，我们也加网格
- 如果标杆的标注方式不同，我们改成标杆的方式

## Step 3: 保留我们的业务逻辑
以下逻辑**完全不动**，只改 UI 层：
- `LayoutEngine.calculate()` — 货架排布计算
- `App.submitContact()` / `App.generatePlan()` — 表单流程
- `generateRecommendations()` — 推荐引擎
- 所有 localStorage、事件绑定、数据流

## Step 4: 验证
- 本地 http://localhost:8080/planner/ 截图
- 和标杆并排对比
- 确认所有功能正常工作（滑块联动、表单提交、统计更新）
- 控制台无 JS 错误

---

## 部署
`git add -A && git commit -m "planner: rebuild UI following warehouse-planner.com structure" && git push`
