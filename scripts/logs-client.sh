#!/bin/bash

# View logs for a specific client
# Usage: ./logs-client.sh clientxyz [service]
# Example: ./logs-client.sh clientxyz backend

CLIENT=$1
SERVICE=$2

if [ -z "$CLIENT" ]; then
    echo "❌ Error: Client name is required"
    echo "Usage: ./logs-client.sh <client-name> [service]"
    exit 1
fi

if [ ! -d "$CLIENT" ]; then
    echo "❌ Error: Client directory $CLIENT not found"
    exit 1
fi

cd "$CLIENT"

if [ -z "$SERVICE" ]; then
    echo "📝 Showing logs for all services of $CLIENT..."
    docker-compose logs -f
else
    echo "📝 Showing logs for $SERVICE of $CLIENT..."
    docker-compose logs -f "$SERVICE"
fi
