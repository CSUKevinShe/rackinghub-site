#!/bin/bash
# RackingHub 本地预览脚本
# 用法: bash preview.sh [端口号，默认 8087]
PORT=${1:-8087}
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     RackingHub Preview Server        ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Branch:  staging                    ║"
echo "  ║  URL:     http://localhost:$PORT       ║"
echo "  ║  Ctrl+C  to stop                     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
python3 -m http.server "$PORT"
