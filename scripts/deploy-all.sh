#!/bin/bash

# Deploy all clients
# Usage: ./deploy-all.sh

set -e

echo "🚀 Deploying all clients..."
echo "================================"
echo ""

# Get all client directories (exclude system folders)
CLIENTS=$(ls -d */ 2>/dev/null | grep -vE '^(backend|frontend|clients|docker|scripts|node_modules|\.git)/' | sed 's/\/$//')

if [ -z "$CLIENTS" ]; then
    echo "❌ No client directories found"
    exit 1
fi

echo "Found clients: $CLIENTS"
echo ""

# Deploy each client
for CLIENT in $CLIENTS; do
    echo "📦 Deploying $CLIENT..."
    ./scripts/deploy-client.sh "$CLIENT"
    echo ""
    echo "---"
    echo ""
done

echo "✅ All clients deployed successfully!"
echo ""
echo "📊 Overall status:"
docker ps --filter "name=client" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
