# RackingHub Planner — 视觉对标 + UI 重构

## 任务流程（严格按顺序执行）

### Step 1: 看标杆
打开 https://www.warehouse-planner.com 或类似的在线仓库规划工具。
- 截图整个页面
- 重点看：参数区布局、滑块/输入控件样式、2D 画布呈现方式、颜色/线条/标注风格、整体信息层次
- 记录标杆做的好在哪里（具体到像素级：间距、字号、颜色、对齐方式）

### Step 2: 看自己
打开 http://localhost:8080/planner/ ，进入 Warehouse Specs 页面（Step 2 参数填写页）。
- 截图整个页面
- 和标杆逐一对比，列出具体差距

### Step 3: 重构
基于对比结果，重写 `style.css` 和 `layout-engine.js` 中影响视觉的部分。目标：**让 RackingHub Planner 看起来和 warehouse-planner.com 一样专业**，甚至在某些方面更好。

**核心改造点：**
1. **隐藏 3D 预览** — 当前质量太差，和 2D 工程图风格不搭，先砍掉
2. **参数区加大** — 当前 360px 太窄，加大到舒适宽度（420-480px 范围自行判断）
3. **滑块严格对齐** — 同一组内所有滑块轨道左右边缘在一条垂直线上，label 文字区统一宽度
4. **2D 视图专业感** — 线条粗细有层次，CAD 风格配色，标注清晰
5. **整体布局** — 宽屏下视觉平衡，不浪费空间

### Step 4: 验证
- 本地 http://localhost:8080/planner/ 截图验证
- 和标杆侧对侧对比截图
- 确认控制台无 JS 错误
- 确认移动端正常

---

## 边界

### 不可修改（业务逻辑一律不动）
- `App.goToStep()` / `App.submitContact()` / `App.generatePlan()`
- `LayoutEngine.calculate()` / `LayoutEngine.drawAll()` — 入口函数签名
- `generateRecommendations()` / `calculateScore()`
- localStorage 读写
- 表单字段 name/id
- `.json` 数据文件
- `toggleCollapsible()` 函数逻辑

### 可以修改
- `planner/style.css` — 任何样式
- `planner/layout-engine.js` — Canvas 渲染颜色/线宽/网格背景/标注样式（可调函数内部实现）
- `planner/app.js` — 仅 Three.js 加载相关部分（跳过）
- `planner/index.html` — 版本号、3D 区域隐藏、importmap 条件加载

---

## 验收标准
1. 3D 预览完全隐藏
2. 参数面板 ≥ 420px，所有面板展开后不拥挤
3. 同组滑块轨道严格左右对齐
4. 2D 视图线条有层次，CAD 风格
5. 标注 ≥ 11px 清晰可读
6. 1440px / 1920px 宽屏下视觉平衡
7. 控制台无 JS 错误
8. 移动端正常
9. **视觉上和标杆接近同一水平**

---

## 部署
`git add -A && git commit -m "planner: UI overhaul - visual benchmark against warehouse-planner.com" && git push`
