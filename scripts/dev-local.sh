#!/bin/bash
# Start local dev environment
# Usage: ./dev-local.sh [mode]
# Modes: docker (default), native

set -e

MODE=${1:-docker}
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEV_DIR="$BASE_DIR/dev"

echo "🚀 Starting Dev Environment"
echo ""

if [ "$MODE" = "docker" ]; then
    echo "Mode: Docker Compose"
    echo ""
    
    cd "$DEV_DIR"
    docker-compose up --build
    
elif [ "$MODE" = "native" ]; then
    echo "Mode: Native (Backend + Frontend separately)"
    echo ""
    echo "📦 Backend: http://localhost:8080"
    echo "🎨 Frontend: http://localhost:5173"
    echo ""
    echo "Run these commands in separate terminals:"
    echo ""
    echo "  # Terminal 1 - Backend"
    echo "  cd $DEV_DIR/backend"
    echo "  ./gradlew bootRun"
    echo ""
    echo "  # Terminal 2 - Frontend"
    echo "  cd $DEV_DIR/frontend"
    echo "  npm run dev"
    echo ""
    
else
    echo "❌ Unknown mode: $MODE"
    echo "Available modes: docker, native"
    exit 1
fi
