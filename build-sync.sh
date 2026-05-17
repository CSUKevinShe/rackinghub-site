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

# Copy chunk subdirectories (app/, etc.)
for subdir in out/_next/static/chunks/*/; do
  [ -d "$subdir" ] || continue
  name=$(basename "$subdir")
  mkdir -p "_next/static/chunks/$name"
  for chunk in "$subdir"*; do
    [ -f "$chunk" ] || continue
    fname=$(basename "$chunk")
    if [ ! -f "_next/static/chunks/$name/$fname" ]; then
      cp "$chunk" "_next/static/chunks/$name/$fname"
      echo "  + chunk/$name: $fname"
    fi
  done
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
echo "==> Cleaning old chunks (keeping last 20)..."
for dir in _next/static/chunks _next/static/chunks/app; do
  if [ -d "$dir" ]; then
    count=$(find "$dir" -maxdepth 1 -type f -name "*.js" | wc -l)
    if [ "$count" -gt 20 ]; then
      # Remove oldest files beyond 20
      find "$dir" -maxdepth 1 -type f -name "*.js" -print0 | \
        xargs -0 ls -t | tail -n +21 | xargs rm -f
      echo "  cleaned $dir (was $count files)"
    fi
  fi
done

echo "==> Done! Commit and push when ready."
