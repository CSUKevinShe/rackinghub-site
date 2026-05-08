---
name: seo-audit
description: SEO 网站审计工具。检查页面 SEO 要素、关键词密度、技术 SEO 问题。当用户要求检查 SEO、优化页面、或发现排名问题时使用。
---

# SEO 审计技能

## 审计清单

### 页面级 SEO（每个页面必查）
1. **Title 标签**：50-60 字符，包含核心关键词，独特不重复
2. **Meta Description**：120-155 字符，包含关键词，有行动号召
3. **H1 标签**：每页唯一，包含核心关键词
4. **H2-H3 层级**：逻辑清晰，包含长尾关键词
5. **关键词密度**：核心词 1-3%，自然分布，不堆砌
6. **图片 Alt 属性**：所有图片有描述性 alt 文本
7. **内链**：至少 3 个指向其他页面的链接
8. **URL 结构**：语义化，含关键词

### 技术 SEO
1. **robots.txt**：检查是否允许爬虫
2. **sitemap.xml**：检查是否包含所有页面
3. **HTTPS**：确保全站 HTTPS
4. **移动端适配**：响应式设计
5. **页面速度**：Core Web Vitals
6. **结构化数据**：Schema.org 标记
7. **canonical 标签**：避免重复内容
8. **404 页面**：自定义友好页面

### 内容质量
1. **字数**：产品页 500+ 词，博客 1500+ 词
2. **可读性**：短段落，小标题，列表
3. **原创性**：不抄袭竞品
4. **专业度**：行业术语准确
5. **CTA**：明确的行动号召（Quote Now, Contact Us）

## 执行步骤

1. 读取目标 HTML 文件
2. 检查上述清单中的每一项
3. 生成审计报告（问题 + 优先级 + 修复建议）
4. 高优先级问题直接修复
5. 提交并推送

## 关键词密度检查

使用以下命令检查页面关键词：
```bash
grep -oi "pallet racking" page.html | wc -l
grep -oi "warehouse racking" page.html | wc -l
grep -oi "heavy duty" page.html | wc -l
```

## 竞品对标

检查 Top 3 竞品页面（如 demarco.com, apollostorage.com, hjgracking.com）：
- 他们的 Title/Meta 写法
- 内容结构和字数
- 关键词布局策略
- 内链网络
