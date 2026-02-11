#!/bin/bash
# Sync changes from dev to specific client
# Usage: ./sync-to-client.sh <client> <path>
# Example: ./sync-to-client.sh abc backend/src/service/BillingService.java
# Example: ./sync-to-client.sh xyz frontend/src/pages/

set -e

CLIENT=$1
SOURCE_PATH=$2

if [ -z "$CLIENT" ] || [ -z "$SOURCE_PATH" ]; then
    echo "❌ Usage: ./sync-to-client.sh <client> <path>"
    echo ""
    echo "Examples:"
    echo "  ./sync-to-client.sh abc backend/src/service/BillingService.java"
    echo "  ./sync-to-client.sh xyz frontend/src/pages/"
    echo "  ./sync-to-client.sh abc backend/src/service/"
    exit 1
fi

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$BASE_DIR/dev/$SOURCE_PATH"
DEST="$BASE_DIR/client$CLIENT/$SOURCE_PATH"

if [ ! -e "$SOURCE" ]; then
    echo "❌ Source not found: $SOURCE"
    exit 1
fi

if [ ! -d "$BASE_DIR/client$CLIENT" ]; then
    echo "❌ Client folder not found: client$CLIENT"
    echo "Available clients: clientabc, clientxyz"
    exit 1
fi

echo "📋 Syncing from dev to client$CLIENT"
echo "   Source: dev/$SOURCE_PATH"
echo "   Dest:   client$CLIENT/$SOURCE_PATH"
echo ""

# If it's a directory, use rsync with exclusions
if [ -d "$SOURCE" ]; then
    rsync -av --exclude='node_modules' --exclude='build' --exclude='target' --exclude='.env*' "$SOURCE" "$(dirname "$DEST")/"
else
    # Single file - ensure destination directory exists
    mkdir -p "$(dirname "$DEST")"
    cp -v "$SOURCE" "$DEST"
fi

echo ""
echo "✅ Synced successfully!"
echo "💡 Don't forget to test in client$CLIENT before deploying"
