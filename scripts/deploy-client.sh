#!/bin/bash

# Deploy a specific client
# Usage: ./deploy-client.sh clientxyz

set -e

CLIENT=$1

if [ -z "$CLIENT" ]; then
    echo "❌ Error: Client name is required"
    echo "Usage: ./deploy-client.sh <client-name>"
    echo "Example: ./deploy-client.sh clientxyz"
    exit 1
fi

if [ ! -d "$CLIENT" ]; then
    echo "❌ Error: Client directory $CLIENT not found"
    exit 1
fi

echo "🚀 Deploying $CLIENT..."
echo "================================"

cd "$CLIENT"

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️  .env file not found. Copying from .env.example"
        cp .env.example .env
        echo "⚠️  Please edit .env file with your actual credentials!"
    fi
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ Deployment complete for $CLIENT"
echo ""
echo "📊 Service URLs:"
echo "   Frontend: http://localhost:$(grep -oP '(?<=- ")[0-9]+(?=:80")' docker-compose.yml)"
echo "   Backend:  http://localhost:$(grep -oP '(?<=- ")[0-9]+(?=:8080")' docker-compose.yml)"
echo "   Database: localhost:$(grep -oP '(?<=- ")[0-9]+(?=:5432")' docker-compose.yml)"
echo ""
echo "📝 View logs: cd $CLIENT && docker-compose logs -f"
echo "🛑 Stop:      cd $CLIENT && docker-compose down"
