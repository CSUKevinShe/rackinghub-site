#!/bin/bash
# Git push 前自动检查：SEO 基础验证
# 检查修改的 HTML 文件是否有 Title, Meta Description, H1

echo "🔍 Running pre-push SEO check..."

# 获取本次修改的文件
changed_files=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep '\.html$' || echo "")

if [ -z "$changed_files" ]; then
    echo "✅ No HTML files changed."
    exit 0
fi

issues=0

for file in $changed_files; do
    if [ ! -f "$file" ]; then
        continue
    fi

    filename=$(basename "$file")

    # 检查 Title 标签
    title=$(grep -o '<title>[^<]*</title>' "$file" | head -1 | sed 's/<[^>]*>//g')
    if [ -z "$title" ]; then
        echo "❌ $filename: Missing <title> tag"
        issues=$((issues + 1))
    elif [ ${#title} -lt 30 ] || [ ${#title} -gt 70 ]; then
        echo "⚠️  $filename: Title length (${#title} chars) should be 30-70"
    fi

    # 检查 Meta Description
    meta=$(grep -o '<meta name="description" content="[^"]*"' "$file" | head -1 | sed 's/.*content="//;s/"$//')
    if [ -z "$meta" ]; then
        echo "❌ $filename: Missing meta description"
        issues=$((issues + 1))
    elif [ ${#meta} -lt 100 ] || [ ${#meta} -gt 160 ]; then
        echo "⚠️  $filename: Meta description length (${#meta} chars) should be 100-160"
    fi

    # 检查 H1 标签
    h1=$(grep -o '<h1[^>]*>[^<]*</h1>' "$file" | head -1 | sed 's/<[^>]*>//g')
    if [ -z "$h1" ]; then
        echo "❌ $filename: Missing <h1> tag"
        issues=$((issues + 1))
    fi
done

if [ $issues -gt 0 ]; then
    echo ""
    echo "🚨 Found $issues critical SEO issues. Fix before pushing."
    exit 1
fi

echo "✅ All SEO checks passed!"
exit 0
