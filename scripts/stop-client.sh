#!/bin/bash

# Stop a specific client
# Usage: ./stop-client.sh clientxyz

CLIENT=$1

if [ -z "$CLIENT" ]; then
    echo "❌ Error: Client name is required"
    echo "Usage: ./stop-client.sh <client-name>"
    exit 1
fi

if [ ! -d "$CLIENT" ]; then
    echo "❌ Error: Client directory $CLIENT not found"
    exit 1
fi

echo "🛑 Stopping $CLIENT..."
cd "$CLIENT"
docker-compose down
echo "✅ $CLIENT stopped"
