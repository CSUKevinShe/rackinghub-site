# 图片资源管理

**最后更新：** 2026-05-07  
**用途：** trackinghub.com 网站图片资源

---

## 📁 目录结构

```
images/
├── hero/              # 首页横幅/大图
│   ├── banner1.jpg    # 当前横幅（可替换）
│   └── _TEMPLATE_.jpg # 占位符（替换时参考）
├── products/          # 产品图片
│   ├── Pallet-Racks-pd533912748.jpg
│   ├── Longspan-Shelving-pd594146548.jpg
│   ├── Mezzanine-pd521783548.jpg
│   ├── Steel-Platform-pd505717048.jpg
│   ├── Shuttle-Radio-Rack-pd531383548.jpg
│   ├── Drive-in-Racking-pd544883548.jpg
│   ├── Plastic-Pallet-pd517083548.jpg
│   └── Wire-Mesh-Container-pd555083548.jpg
├── factory/           # 工厂图片
│   ├── factory-1.jpg
│   ├── factory-2.jpg
│   └── factory-3.jpg
├── logos/             # Logo 图片
│   └── boracs-rackinghub-logo.png
├── icons/             # 图标（待添加）
└── blog/              # 博客图片（待添加）
```

---

## 🔄 图片替换指南

### 替换产品图片

**步骤：**
1. 将新图片放入 `images/products/` 目录
2. 保持与原文件相同的文件名
3. 或使用新文件名，然后更新对应 HTML 文件中的路径

**示例：**
```bash
# 替换重型货架图片
cp new-heavy-duty-racking.jpg images/products/Pallet-Racks-pd533912748.jpg

# 或使用新文件名（需更新 HTML）
cp new-heavy-duty-racking.jpg images/products/heavy-duty-racking-v2.jpg
# 然后更新 products/heavy-duty-racking.html 中的图片路径
```

### 替换横幅图片

**步骤：**
1. 将新横幅放入 `images/hero/` 目录
2. 保持文件名 `banner1.jpg` 或更新 HTML 中的引用

**推荐尺寸：** 1920x600px（横幅）

### 替换工厂图片

**步骤：**
1. 将新工厂图片放入 `images/factory/` 目录
2. 保持文件名 `factory-1.jpg`, `factory-2.jpg`, `factory-3.jpg`
3. 或添加新文件并更新 `index.html` 中的引用

### 添加博客图片

**步骤：**
1. 将图片放入 `images/blog/` 目录
2. 在对应博客 HTML 文件中引用：
   ```html
   <img src="../images/blog/your-image.jpg" alt="描述">
   ```

---

## 📏 图片规格建议

| 类型 | 推荐尺寸 | 格式 | 最大大小 |
|------|---------|------|---------|
| 横幅 | 1920x600px | JPG/WebP | <500KB |
| 产品 | 800x600px | JPG/WebP | <300KB |
| 工厂 | 1200x800px | JPG/WebP | <400KB |
| Logo | 200x60px | PNG | <100KB |
| 图标 | 32x32px | ICO/PNG | <50KB |
| 博客 | 1200x630px | JPG/WebP | <300KB |

---

## 🚀 部署到 Cloudflare R2（未来）

**优势：**
- ✅ 出网流量免费
- ✅ 10GB 免费存储
- ✅ 全球 CDN 加速

**步骤：**
1. 创建 R2 bucket
2. 上传 `images/` 目录
3. 配置自定义域名 `cdn.trackinghub.com`
4. 更新 HTML 中的图片路径为 CDN 地址

---

**最后更新：** 2026-05-07
**维护者：** 孔明
