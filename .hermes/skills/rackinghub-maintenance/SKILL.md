# RackingHub Maintenance Skill

RackingHub 网站全自动维护技能包。用于定期检查、诊断、修复和报告 rackinghub.com 的运行状态。

---

## 站点概览

| 属性 | 值 |
|---|---|
| **网站** | https://www.rackinghub.com |
| **仓库** | ~/rackinghub-site（分支 `main`） |
| **部署** | Cloudflare Pages |
| **Git 远程** | GitHub `CSUKevinShe/rackinghub-site` |
| **Git 代理** | `http://127.0.0.1:1087`（push 必须经过代理） |
| **表单服务** | Formspree — endpoint `xeerarqy` |
| **分析工具** | Google Analytics — ID `G-HY3B0T73TJ` |
| **技术栈** | 静态 HTML/CSS/JS（无 CMS） |

### 站点结构

```
rackinghub-site/
├── index.html                  # 首页
├── about.html                  # About 页
├── contact.html                # Contact 页（含 Formspree 表单）
├── faq.html                    # FAQ 页
├── blog.html                   # Blog 列表页
├── case-studies.html           # Case Studies 页
├── thank-you.html              # 表单提交感谢页
├── 404.html                    # 404 错误页
├── robots.txt                  # 爬虫规则
├── sitemap.xml                 # XML Sitemap
├── style.css                   # 全局样式
├── _headers                    # Cloudflare Pages 自定义响应头
├── wrangler.toml               # Cloudflare Wrangler 配置
├── products/                   # 8 个产品页
│   ├── heavy-duty-racking.html
│   ├── medium-duty-shelving.html
│   ├── mezzanine-racking.html
│   ├── steel-platform.html
│   ├── radio-shuttle-racking.html
│   ├── drive-in-racking.html
│   ├── plastic-pallets.html
│   └── warehouse-cages.html
├── blog/                       # 博客文章（当前 11 篇）
│   ├── how-to-choose-warehouse-racking-system.html
│   ├── pallet-racking-vs-drive-in-racking.html
│   ├── warehouse-racking-installation-guide.html
│   ├── heavy-duty-pallet-racking-guide.html
│   ├── mezzanine-racking-double-your-space.html
│   ├── radio-shuttle-racking-automated.html
│   ├── drive-in-racking-complete-guide.html
│   ├── medium-duty-shelving-light-storage.html
│   ├── plastic-pallets-vs-wooden.html
│   ├── steel-platform-custom-storage.html
│   └── warehouse-security-cages-protect.html
└── images/                     # 图片资源
```

---

## 1. 触发条件

### 自动触发（计划任务）

| 频率 | 触发内容 |
|---|---|
| **每日** | 可用性检查、SSL 证书过期检查、404 扫描、表单功能验证 |
| **每周** | Broken links 全量扫描、图片加载检查、sitemap 完整性校验、SEO 基础检查 |
| **每月** | PageSpeed 性能测试、结构化数据验证、HTML 有效性检查、元标签审计 |
| **按需** | 内容更新后（新增/修改页面）、Cloudflare Pages 部署后 |

### 手动触发

- Kevin 请求执行维护检查
- 收到 Google Search Console 告警
- Cloudflare Pages 部署失败告警
- 用户报告网站问题

---

## 2. 日常检查清单

### 2.1 网站可用性

```bash
# 检查首页是否返回 200
curl -sI https://www.rackinghub.com/ | head -5
```
- ✅ HTTP 状态码 = 200
- ✅ 响应时间 < 3 秒
- ✅ 页面内容包含预期文本（如 "RackingHub"）

### 2.2 SSL 证书

```bash
# 检查证书有效期
echo | openssl s_client -connect www.rackinghub.com:443 -servername www.rackinghub.com 2>/dev/null | openssl x509 -noout -dates
```
- ✅ 证书未过期（剩余天数 > 30 天）
- ✅ Cloudflare Pages 自动续期，但需验证生效

### 2.3 404 错误扫描

- 逐一检查 sitemap.xml 中所有 URL 返回 200
- 检查已知旧 URL 是否正确 301 重定向
- 验证 `/404.html` 自定义页面是否可访问

### 2.4 Broken Links 检测

- 使用 `grep -r 'href="' *.html` 提取所有 `<a>` 链接
- 逐一 `curl -sI` 检查内部链接（本站页面）
- 逐一检查外部链接（合作伙伴、参考资料等）
- 特别注意：导航栏链接、页脚链接、产品页之间的交叉引用

### 2.5 表单功能验证

```bash
# 验证 Formspree endpoint 是否可达
curl -sI https://formspree.io/f/xeerarqy
```
- ✅ contact.html 中 Formspree action 指向 `https://formspree.io/f/xeerarqy`
- ✅ 表单字段完整（name, email, company, phone, message）
- ✅ 提交后正确跳转到 thank-you.html
- ✅ 表单无 Console 报错

### 2.6 图片加载检查

- 逐一检查 `<img>` 标签的 `src` 路径是否存在
- 验证所有图片返回 HTTP 200
- 检查懒加载（`loading="lazy"`）是否工作正常
- 确认 hero/banner 首屏图片 **不使用** 懒加载

### 2.7 JavaScript 泄露检查

- 打开每个页面，检查浏览器 Console 无红色报错
- 重点检查：
  - `style.css` 引用的 JS 是否有 `undefined` 错误
  - 表单提交 JS 是否正常工作
  - 移动端导航切换 JS 是否正常
- 检查 `network` tab 无 404 资源请求

---

## 3. SEO 检查清单

### 3.1 Sitemap 完整性

- 打开 `sitemap.xml`，逐一验证每个 `<loc>` URL 可访问
- 检查新增页面是否已添加到 sitemap
- 检查已删除页面是否已从 sitemap 移除
- 确保 `<lastmod>` 日期反映实际修改时间
- 验证 sitemap URL 格式正确（`https://www.rackinghub.com/...`）

### 3.2 robots.txt 正确性

- 访问 `https://www.rackinghub.com/robots.txt`，确认：
  - `User-agent: *` + `Allow: /` 允许抓取
  - `Sitemap: https://www.rackinghub.com/sitemap.xml` 声明正确
  - 没有误屏蔽重要页面
  - `Disallow` 规则仅针对预览/备份文件

### 3.3 Meta Tags 审计

对每个 HTML 页面检查：

```html
<!-- 必须存在的 meta 标签 -->
<title>页面标题</title>
<meta name="description" content="页面描述">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="https://www.rackinghub.com/...">
```

- 每个页面必须有唯一的 `<title>`
- 每个页面必须有 `<meta name="description">`
- `<meta name="robots" content="index, follow">` 或无此标签（默认允许索引）
- 页面必须有 `<link rel="canonical">` 指向自身
- 检查 Open Graph 标签（如有）

### 3.4 PageSpeed 性能

- 使用 Lighthouse 或 PageSpeed Insights 测试：
  - 首页：https://www.rackinghub.com/
  - 一个产品页（如 `/products/heavy-duty-racking`）
  - 一篇博客文章
- 目标：Performance ≥ 80（移动端）、≥ 90（桌面端）
- 关注 Core Web Vitals：LCP < 2.5s, FID < 100ms, CLS < 0.1

### 3.5 结构化数据

- 检查页面是否包含 JSON-LD 结构化数据（Organization, Product, Article, BreadcrumbList 等）
- 使用 [Google Rich Results Test](https://search.google.com/test/rich-results) 验证
- 确保产品页有 Product schema（name, description, image）
- 确保博客页有 Article schema（headline, datePublished, author）

---

## 4. 内容维护流程

### 4.1 博客发布流程

1. **创建新博客 HTML 文件**
   - 在 `~/rackinghub-site/blog/` 目录下创建
   - 文件名使用 kebab-case（如 `new-blog-topic.html`）
   - 复制已有博客模板（推荐 `blog/how-to-choose-warehouse-racking-system.html`）

2. **填写必需内容**
   - `<title>` ≤ 60 字符
   - `<meta name="description">` 70-160 字符
   - 正文 `<h1>` 包含目标关键词
   - 合理使用 `<h2>`/`<h3>` 构建文章结构
   - 所有 `<img>` 添加有意义的 `alt` 文本
   - 添加内部链接指向相关产品和页面
   - 添加结构化数据（Article JSON-LD）

3. **更新 blog.html 列表页**
   - 在文章列表中添加新文章条目
   - 包含标题、日期、摘要、缩略图

4. **更新 sitemap.xml**
   - 添加新博客 URL 到 sitemap
   - 设置 `<changefreq>monthly</changefreq>`、`<priority>0.7</priority>`
   - `<lastmod>` 使用当前日期（格式 `YYYY-MM-DD`）

5. **Git 提交并部署**
   ```bash
   cd ~/rackinghub-site
   git add blog/new-blog-topic.html blog.html sitemap.xml
   git commit -m "feat: add blog post - new blog topic"
   export https_proxy=http://127.0.0.1:1087
   git push origin main
   unset https_proxy
   ```
   - Cloudflare Pages 自动检测 push 并构建部署

6. **验证部署**
   - 等待 Cloudflare Pages 构建完成
   - 访问新文章 URL 确认上线
   - 检查 Google Search Console 请求索引

### 4.2 产品页更新流程

1. **定位目标产品页**
   - 文件路径：`~/rackinghub-site/products/<product-name>.html`

2. **更新内容**
   - 产品描述、规格参数、特性列表
   - 替换/新增产品图片（放到 `images/` 目录）
   - 确保图片压缩合理（WebP 优先，JPEG 备用）
   - 更新 `<meta name="description">`
   - 更新 Product 结构化数据

3. **更新相关引用**
   - 首页产品展示区链接
   - blog.html 中的交叉引用
   - case-studies.html 中的相关案例

4. **更新 sitemap.xml**（如 URL 变更或内容大幅更新）

5. **Git 提交并部署**
   ```bash
   cd ~/rackinghub-site
   git add products/<product-name>.html images/<new-image> sitemap.xml
   git commit -m "feat: update <product-name> product page"
   export https_proxy=http://127.0.0.1:1087
   git push origin main
   unset https_proxy
   ```

6. **验证部署后**
   - 确认产品页图片正确加载
   - 确认所有规格参数显示正常
   - 确认移动端响应式布局正常

### 4.3 Sitemap 自动更新流程

每次新增或删除页面后，**必须**更新 sitemap.xml：

1. 打开 `sitemap.xml`
2. 新增页面：在对应区域添加 `<url>` 块
3. 删除页面：移除对应 `<url>` 块
4. 更新页面：修改对应 `<lastmod>` 为当前日期
5. 验证 XML 格式正确（可用 `xmllint`）：
   ```bash
   xmllint --noout ~/rackinghub-site/sitemap.xml
   ```
6. 将 sitemap 修改纳入同一次 git commit

### 4.4 Git 部署标准流程

```bash
cd ~/rackinghub-site

# 检查状态
git status

# 添加修改
git add <files>

# 提交（使用规范 commit message）
git commit -m "<type>: <description>"
# type 选项：feat | fix | docs | style | refactor | chore

# Push（必须经过代理）
export https_proxy=http://127.0.0.1:1087
git push origin main
unset https_proxy

# 验证 Cloudflare Pages 部署状态
# 访问 https://www.rackinghub.com 确认更新生效
```

---

## 5. 质量标准

### 5.1 HTML 有效性

- 所有 HTML 文件必须通过 W3C Validator 检查
- 常见检查项：
  - 标签正确闭合
  - 属性值使用引号包裹
  - 无重复 `id` 属性
  - `<meta>` 标签在 `<head>` 内
  - `<!DOCTYPE html>` 声明存在
  - `<html lang="en">` 正确设置

```bash
# 快速检查 HTML 文件是否含有常见错误
for f in *.html; do
  echo "=== $f ==="
  # 检查缺失 alt
  grep -nP '<img\b(?![^>]*\balt=)' "$f" && echo "  ⚠️ 图片缺少 alt 属性"
  # 检查缺失 title
  grep -cP '<title>' "$f" || echo "  ⚠️ 缺少 title 标签"
  # 检查缺失 meta description
  grep -cP '<meta name="description"' "$f" || echo "  ⚠️ 缺少 meta description"
done
```

### 5.2 图片必须有 alt

- 所有 `<img>` 标签必须有 `alt` 属性
- `alt` 文本应描述图片内容（非装饰性图片可用 `alt=""`）
- 禁止空 `alt` 文本（除非图片纯装饰用途）

### 5.3 Meta Description 规范

- 长度：**70-160 字符**（含空格）
- 必须包含页面核心关键词
- 不可所有页面使用相同描述
- 禁止关键词堆砌

```bash
# 快速检查 meta description 长度
grep -oP '(?<=<meta name="description" content=")[^"]*' file.html | awk '{
  if (length($0) < 70) print "TOO SHORT (" length($0) " chars): " $0
  else if (length($0) > 160) print "TOO LONG (" length($0) " chars): " $0
  else print "OK (" length($0) " chars): " $0
}'
```

### 5.4 Title 标签规范

- 长度：**≤ 60 字符**（含空格）
- 格式推荐：`主要关键词 - 品牌名 | RackingHub`
- 每个页面必须唯一
- 避免关键词重复

### 5.5 代码规范

- 缩进：2 空格
- 文件编码：UTF-8
- 换行：LF（Unix 风格）
- CSS 类名：kebab-case
- 图片文件名：kebab-case，小写

---

## 6. 常见问题和陷阱

### 6.1 Git Push 代理问题

**症状：** `git push` 超时或 connection refused

**解决方案：**
```bash
export https_proxy=http://127.0.0.1:1087
git push origin main
unset https_proxy
```

**注意：**
- 仅 `https_proxy` 即可，无需 `http_proxy`
- 推完后 **务必** `unset https_proxy`，避免影响其他操作
- 如果代理未运行，先确认代理进程在运行：`curl -I --proxy http://127.0.0.1:1087 https://github.com`
- 代理端口可能变化，如 1087 不通，尝试 1080/7890

### 6.2 Cloudflare 缓存问题

**症状：** push 后访问网站仍显示旧内容

**解决方案：**
1. 等待 1-5 分钟，Cloudflare Pages 通常自动刷新
2. 强制刷新：`Ctrl+Shift+R`（Chrome/Firefox）
3. 如仍不生效，登录 Cloudflare Dashboard 手动 Purge Cache：
   - Purge Everything
   - 或按 URL 精确清除
4. Cloudflare Pages 构建日志可在 Dashboard 查看

**预防：**
- 在 `_headers` 中合理设置 `Cache-Control`
- 静态资源（CSS/JS/images）使用内容哈希命名
- HTML 页面设置较短缓存时间

### 6.3 懒加载误用（历史教训）

**已知问题：**
- 首屏 hero/banner 图片使用了 `loading="lazy"`，导致用户看到空白后才加载图片
- 产品列表首屏图片使用懒加载，影响 LCP 评分

**正确做法：**
- **首屏可见图片**（hero、banner、首屏产品展示）：**禁用**懒加载
- **第二屏及以下**图片：启用 `loading="lazy"`
- **产品详情页的主图**：**禁用**懒加载
- **博客文章首图**：视情况而定，如在首屏则禁用

**检查方法：**
- 打开页面，立即查看 Network tab
- 首屏图片应在 HTML 解析后立即开始加载
- 不应看到 `loading="lazy"` 的首屏图片

### 6.4 Sitemap 与实际页面不一致

**症状：** Google 索引页面数与站点实际页面数不匹配

**解决方案：**
- 每次添加/删除页面后，**同步更新 sitemap.xml**
- 使用 `xmllint --noout sitemap.xml` 验证 XML 格式
- 在 Google Search Console 重新提交 sitemap

### 6.5 表单提交后无跳转

**症状：** 用户提交 contact 表单后页面不跳转

**排查：**
1. 检查 Formspree endpoint URL 正确：`https://formspree.io/f/xeerarqy`
2. 检查表单 `method="POST"`
3. 检查 `action` 属性值正确
4. 检查 thank-you.html 路径正确
5. Formspree 可能有速率限制，检查是否触发

### 6.6 移动端导航失效

**症状：** 手机端点击汉堡菜单无反应

**排查：**
1. 检查 JS 文件是否正确加载（Network tab 200）
2. 检查 Console 是否有 JS 报错
3. 检查 CSS `z-index` 是否正确（导航层应最高）
4. 检查 `style.css` 中的媒体查询断点是否正确

---

## 7. 飞书通知规范

### 通知级别定义

| 级别 | 描述 | 通知 Kevin？ | 示例 |
|---|---|---|---|
| **P0 - 紧急** | 网站完全不可用或核心功能丧失 | ✅ **立即通知** | 网站返回 5xx/超时、SSL 证书过期、表单无法提交 |
| **P1 - 重要** | 影响用户体验或 SEO 的关键问题 | ✅ **当日通知** | 404 页面增加（>5个）、首屏图片不加载、PageSpeed 大幅下降 |
| **P2 - 一般** | 需要关注但不影响核心功能的问题 | ⚠️ **周报告** | Broken links（少量）、meta description 过长/过短、部分页面缺少结构化数据 |
| **P3 - 建议** | 优化建议、内容更新提醒 | ❌ 不通知（仅记录） | 可优化的图片大小、建议新增的页面、SEO 微调建议 |

### P0 紧急通知模板

```
🚨 【RackingHub 紧急告警】

问题类型：网站不可用 / SSL 过期 / 表单故障
检测时间：YYYY-MM-DD HH:MM
影响范围：全站 / 部分页面
详细信息：...
建议操作：...
```

### P1 重要通知模板

```
⚠️ 【RackingHub 重要通知】

问题类型：Broken links / 图片加载异常 / SEO 异常
检测时间：YYYY-MM-DD
发现数量：X 个
受影响页面：
  - /products/xxx
  - /blog/xxx
建议操作：...
```

### 周报告模板（每周一发送）

```
📊 【RackingHub 周报】YYYY-MM-DD

✅ 可用性：100% uptime
✅ SSL 证书：剩余 XX 天
✅ Broken links：X 个（已修复 X 个）
✅ 表单功能：正常
✅ 新增页面：X 个
📈 PageSpeed 评分：首页 XX / 产品页 XX / 博客页 XX
📝 待处理事项：
  - ...
```

### 通知决策树

```
检测到问题
  ├─ 网站无法访问？ → P0 → 立即通知 Kevin
  ├─ SSL 证书 < 7 天？ → P0 → 立即通知 Kevin
  ├─ 表单无法提交？ → P0 → 立即通知 Kevin
  ├─ 404 页面 > 5 个？ → P1 → 当日通知 Kevin
  ├─ 首屏图片不加载？ → P1 → 当日通知 Kevin
  ├─ PageSpeed 下降 > 20%？ → P1 → 当日通知 Kevin
  ├─ Broken links 1-5 个？ → P2 → 周报告通知
  ├─ Meta tags 不规范？ → P2 → 周报告通知
  └─ 优化建议？ → P3 → 仅记录，不通知
```

---

## 附录

### A. 快速命令参考

```bash
# 检查网站可用性
curl -sI -o /dev/null -w "%{http_code}" https://www.rackinghub.com/

# 检查 SSL 过期天数
echo | openssl s_client -connect www.rackinghub.com:443 -servername www.rackinghub.com 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2 | xargs -I{} date -d {} +%s | \
  awk -v now=$(date +%s) '{printf "%.0f\n", ($1 - now) / 86400}'

# 验证 sitemap XML
xmllint --noout ~/rackinghub-site/sitemap.xml

# 批量检查所有 HTML 文件的 meta description 长度
for f in ~/rackinghub-site/*.html ~/rackinghub-site/**/*.html; do
  [ -f "$f" ] && echo "=== $f ===" && \
  grep -oP '(?<=<meta name="description" content=")[^"]*' "$f" 2>/dev/null | \
  awk '{print length($0) " chars: " $0}'
done

# 批量检查缺失 alt 的图片
for f in ~/rackinghub-site/*.html ~/rackinghub-site/**/*.html; do
  [ -f "$f" ] && grep -nP '<img\b(?![^>]*\balt=)' "$f" 2>/dev/null | \
  sed "s/^/  ${f}:/"
done

# 部署流程一键脚本（复制粘贴使用）
cd ~/rackinghub-site && \
  git status && \
  echo "--- Add files: git add <files> ---" && \
  echo "--- Commit: git commit -m '...' ---" && \
  export https_proxy=http://127.0.0.1:1087 && \
  git push origin main && \
  unset https_proxy && \
  echo "✅ Pushed! Check Cloudflare Pages dashboard for build status."
```

### B. 关键 URL 清单

| 用途 | URL |
|---|---|
| 网站 | https://www.rackinghub.com |
| 表单 endpoint | https://formspree.io/f/xeerarqy |
| GitHub 仓库 | https://github.com/CSUKevinShe/rackinghub-site |
| Cloudflare Pages | https://dash.cloudflare.com → Pages → rackinghub |
| Google Analytics | https://analytics.google.com (G-HY3B0T73TJ) |
| Google Search Console | https://search.google.com/search-console |
| Google PageSpeed | https://pagespeed.web.dev |
| Google Rich Results Test | https://search.google.com/test/rich-results |
| W3C Validator | https://validator.w3.org |

### C. 版本历史

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-05-08 | v1.0 | 初始创建，包含完整维护指南 |
