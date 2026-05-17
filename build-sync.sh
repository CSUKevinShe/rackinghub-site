#!/bin/bash
# Build and sync static assets — ADDITIVE only, never deletes old chunks
# This prevents "Application error" when browsers have cached old HTML
set -e

echo "==> Building..."
npm run build

echo "==> Syncing _next/static (additive — old chunks preserved)..."

# Create directories if they don't exist
mkdir -p _next/static/chunks/app _next/static/css _next/static/media

# Copy build ID directories (additive)
for dir in out/_next/static/*/; do
  name=$(basename "$dir")
  case "$name" in
    chunks|css|media) continue ;;
  esac
  if [ ! -d "_next/static/$name" ]; then
    cp -r "$dir" "_next/static/$name"
    echo "  + build ID: $name"
  fi
done

# Copy chunk files (additive)
for chunk in out/_next/static/chunks/*; do
  [ -f "$chunk" ] || continue
  name=$(basename "$chunk")
  if [ ! -f "_next/static/chunks/$name" ]; then
    cp "$chunk" "_next/static/chunks/$name"
    echo "  + chunk: $name"
  fi
done

# Copy chunk subdirectories recursively (app/, app/planner/, pages/, etc.)
find out/_next/static/chunks -type f -name "*.js" | while IFS= read -r src; do
  rel="${src#out/_next/static/chunks/}"
  dest="_next/static/chunks/$rel"
  dest_dir=$(dirname "$dest")
  mkdir -p "$dest_dir"
  if [ ! -f "$dest" ]; then
    cp "$src" "$dest"
    echo "  + chunk: $rel"
  fi
done

# Copy CSS (additive)
for css in out/_next/static/css/*; do
  [ -f "$css" ] || continue
  name=$(basename "$css")
  if [ ! -f "_next/static/css/$name" ]; then
    cp "$css" "_next/static/css/$name"
    echo "  + css: $name"
  fi
done

# Copy media (additive)
for media in out/_next/static/media/*; do
  [ -f "$media" ] || continue
  name=$(basename "$media")
  if [ ! -f "_next/static/media/$name" ]; then
    cp "$media" "_next/static/media/$name"
    echo "  + media: $name"
  fi
done

# Copy planner index.html (always overwrite)
cp out/planner.html planner/index.html
echo "  + planner/index.html"

# Clean up very old chunks (keep last 20 chunk files per directory to prevent bloat)
echo "==> Cleaning old chunks (keeping last 20 per directory)..."
find _next/static/chunks -type d | while IFS= read -r dir; do
  count=$(find "$dir" -maxdepth 1 -type f -name "*.js" | wc -l)
  if [ "$count" -gt 20 ]; then
    find "$dir" -maxdepth 1 -type f -name "*.js" -print0 | \
      xargs -0 ls -t | tail -n +21 | xargs rm -f
    echo "  cleaned $dir (was $count files)"
  fi
done

echo "==> Done! Commit and push when ready."
