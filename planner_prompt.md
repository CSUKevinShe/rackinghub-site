# RackingHub Planner 重建任务

## 📍 重要说明
- **提示词位置:** `~/rackinghub-site/planner_prompt.md`
- **工作目录:** `~/rackinghub-site` (主站仓库根目录)
- **输出文件必须放在以下位置 (不要创建新仓库):**

## 📁 输出文件路径

### 前端文件 (静态站点)
```
~/rackinghub-site/planner/
├── index.html          ← 入口页（工具介绍 + 案例展示）
├── style.css           ← Planner 专用样式（需与主站风格统一）
├── app.js              ← 推荐引擎 + Canvas 绘图 + 交互逻辑
├── data/
│   ├── products.json   ← 模拟产品数据（6种货架）
│   └── cases.json      ← 模拟案例数据（3个案例）
└── README.md           ← 项目说明 + 部署指南 + EmailJS 配置
```

### Cloudflare Functions (Serverless)
```
~/rackinghub-site/functions/
└── planner/
    └── submit.js       ← 处理表单提交、存 KV、调 Webhook 通知
```

## 🎯 核心目标
重建 RackingHub Planner — 免费仓库规划计算器，收集销售线索，引流到 rackinghub.com。
部署在 `rackinghub.com/planner/` 子目录下。

## ☁️ 部署环境
- **仓库:** `~/rackinghub-site` (分支 main)
- **部署平台:** Cloudflare Pages (推 main 分支自动部署)
- **Git 代理:** push 必须走 `https_proxy=http://127.0.0.1:1087`
- **KV 绑定:** 变量名 `PLANNER_LEADS` (在 Functions 中通过 `env.PLANNER_LEADS` 访问)
- **飞书 Webhook:** 环境变量 `FEISHU_WEBHOOK_URL` (可选，新线索通知)

## 👤 用户流程（3步）
1. **第1页 (planner/index.html):** 工具介绍 + 案例展示（Hero区、How it works、3个案例、CTA按钮）
2. **第2页 (向导Step1):** 客户信息收集（姓名/邮箱*必填、公司/电话/国家选填，进度条 Step 1/3）
3. **第3页 (向导Step2):** 仓库信息输入 + 方案生成 → 推荐 2-3 种方案对比卡片

## 🧠 推荐引擎（多维度评分）
- 承重匹配度(30%) + 存取效率匹配(25%) + 空间利用率(25%) + 成本效率(20%)
- SKU 少(1-20)→可 Drive-In/Shuttle；多(>100)→必须 Selective
- FIFO 必须→Selective 或 Shuttle；LIFO→Drive-In
- 仓库高度 >8m→VNA/Shuttle；<4.5m→标准 Selective

## ☁️ Cloudflare 原生能力
- `/functions/planner/submit.js` 处理表单 POST 请求
- 线索存入 `env.PLANNER_LEADS` (Cloudflare KV)
- 新线索通过 `env.FEISHU_WEBHOOK_URL` 通知 Kevin
- 前端 EmailJS CDN 发送方案摘要（KEY 占位符 `YOUR_EMAILJS_PUBLIC_KEY`）

## ⚠️ 视觉设计要求（重点）
**必须与现有主站风格完全统一！**
- **请先阅读:** `~/rackinghub-site/style.css` 和 `~/rackinghub-site/index.html`
- **复用主站 CSS 变量:** 提取 `--color-primary: #1a365d`, `--color-accent: #f59e0b` 等
- **保持一致:** 字体、字号、间距、按钮样式、卡片阴影/圆角、响应式断点
- 在 `planner/style.css` 顶部内联定义相同变量，确保视觉无缝衔接

## 🔧 技术要求
1. **纯前端:** 无后端，计算在浏览器本地完成
2. **无构建步骤:** 推送到 GitHub main 分支即自动部署
3. **数据文件:** `planner/data/products.json` (模拟6种货架规格), `planner/data/cases.json` (3个案例)
4. **PDF导出:** `window.print()` + CSS `@media print` 样式
5. **状态管理:** localStorage 保存用户进度
6. **Canvas 2D:** 简化版货架布局示意图
7. **代码规范:** 中文注释，英文 UI 文本，完成后用 `node -c ~/rackinghub-site/planner/app.js` 验证语法

## 📦 交付清单
- [ ] `~/rackinghub-site/planner/index.html`
- [ ] `~/rackinghub-site/planner/style.css`
- [ ] `~/rackinghub-site/planner/app.js`
- [ ] `~/rackinghub-site/planner/data/products.json`
- [ ] `~/rackinghub-site/planner/data/cases.json`
- [ ] `~/rackinghub-site/planner/README.md`
- [ ] `~/rackinghub-site/functions/planner/submit.js`

## ⚠️ 重要
- 这是获客工具，不是最终报价系统。方案输出必须包含免责声明
- 推荐引擎要专业合理，不要推荐明显不合适的货架类型
- 整体设计要专业 B2B 感，让客户觉得 RackingHub 懂仓储规划
- **不需要用户确认，直接开始编写代码**