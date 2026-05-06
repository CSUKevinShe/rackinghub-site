# trackinghub.com / rackinghub.com

**重型货架外贸网站**  
**基于 Cloudflare Pages 部署**

---

## 🚀 快速部署

### 1. Cloudflare Pages 部署（推荐）

**步骤：**
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create Application** → **Pages**
3. 连接 GitHub 仓库 `CSUKevinShe/rackinghub-site`
4. 配置：
   - **Framework preset:** None
   - **Build command:** (留空，静态站点无需构建)
   - **Build output directory:** `./`
5. 点击 **Save and Deploy**

**优势：**
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ✅ 预览部署（每次提交自动生成预览链接）
- ✅ 免费无限存储

### 2. 本地开发

```bash
# 克隆仓库
git clone https://github.com/CSUKevinshe/rackinghub-site.git
cd rackinghub-site

# 启动本地服务器（需要 Python 3）
python3 -m http.server 8000

# 或使用 Node.js
npx serve .
```

访问 http://localhost:8000

---

## 📁 项目结构

```
rackinghub-site/
├── index.html              # 首页
├── about.html              # 关于我们
├── contact.html            # 联系我们
├── products/               # 产品页面
│   ├── heavy-duty-racking.html
│   ├── medium-duty-shelving.html
│   ├── drive-in-racking.html
│   ├── radio-shuttle-racking.html
│   ├── mezzanine-racking.html
│   ├── steel-platform.html
│   ├── warehouse-cages.html
│   └── plastic-pallets.html
├── blog/                   # 博客文章
├── case-studies.html       # 案例研究
├── faq.html                # 常见问题
├── thank-you.html          # 感谢页面
├── 404.html                # 404 页面
├── style.css               # 样式表
├── images/                 # 图片资源
│   ├── hero/               # 首页横幅
│   ├── products/           # 产品图片
│   ├── factory/            # 工厂图片
│   ├── logos/              # Logo
│   ├── icons/              # 图标
│   ├── blog/               # 博客图片
│   └── README.md           # 图片替换指南
├── robots.txt              # 搜索引擎爬虫配置
├── sitemap.xml             # 网站地图
├── wrangler.toml           # Cloudflare Pages 配置
└── .gitignore              # Git 忽略文件
```

---

## 🔄 图片替换指南

详见 `images/README.md`

**快速替换：**
```bash
# 替换产品图片（保持文件名）
cp new-image.jpg images/products/Pallet-Racks-pd533912748.jpg

# 或使用新文件名（需更新 HTML）
cp new-image.jpg images/products/heavy-duty-racking-v2.jpg
# 然后更新 products/heavy-duty-racking.html 中的图片路径
```

---

## 🎨 技术栈

- **静态站点** - HTML5 + CSS3 + JavaScript
- **部署平台** - Cloudflare Pages
- **CDN** - Cloudflare 全球节点
- **SSL** - Cloudflare Universal SSL
- **分析** - Google Analytics (G-HY3B0T73TJ)
- **表单** - Formspree (xeerarqy)

---

## 📈 未来优化计划

### 阶段 1：基础部署 ✅
- [x] 重构图片目录结构
- [x] 添加 wrangler.toml 配置
- [ ] Cloudflare Pages 部署
- [ ] 启用 CDN/SSL/WAF

### 阶段 2：功能增强（待实施）
- [ ] Workers 边缘函数处理询盘
- [ ] D1 数据库存储客户数据
- [ ] Turnstile 无验证码防护

### 阶段 3：内容优化（待实施）
- [ ] R2 托管产品图片
- [ ] Web Analytics 网站分析
- [ ] Email Routing 询盘转发

### 阶段 4：高级功能（待实施）
- [ ] Tunnel 内网安全访问
- [ ] Workers AI 智能客服
- [ ] Zero Trust 零信任访问

---

## 📞 联系方式

- **邮箱：** Kevin@boracs.com
- **网站：** https://trackinghub.com
- **GitHub：** https://github.com/CSUKevinShe/rackinghub-site

---

**最后更新：** 2026-05-07  
**维护者：** 孔明（蜀汉团队）
