#!/bin/bash

# VPS Deployment Script for Multi-Client HMS
# Usage: ./deploy-vps.sh <client-name> [branch]
# Example: ./deploy-vps.sh clientxyz master

set -e

CLIENT=$1
BRANCH="${2:-master}"
BASE_DIR="/opt/apps/dizidentmain"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation
if [ -z "$CLIENT" ]; then
    echo -e "${RED}Error: Client name required${NC}"
    echo "Usage: ./deploy-vps.sh <client-name> [branch]"
    echo "Examples:"
    echo "  ./deploy-vps.sh clientxyz main"
    echo "  ./deploy-vps.sh clientabc main"
    exit 1
fi

# Check if client directory exists
if [ ! -d "$BASE_DIR/$CLIENT" ]; then
    echo -e "${RED}Error: Client directory not found: $BASE_DIR/$CLIENT${NC}"
    exit 1
fi

# Check if .env.prod exists
if [ ! -f "$BASE_DIR/$CLIENT/.env.prod" ]; then
    echo -e "${RED}Error: $BASE_DIR/$CLIENT/.env.prod not found${NC}"
    echo "Create it from .env.prod.example:"
    echo "  cp $BASE_DIR/$CLIENT/.env.prod.example $BASE_DIR/$CLIENT/.env.prod"
    echo "  nano $BASE_DIR/$CLIENT/.env.prod"
    exit 1
fi

cd "$BASE_DIR/$CLIENT"

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Deploying: $CLIENT (Branch: $BRANCH)${NC}"
echo -e "${YELLOW}================================${NC}"

# Step 1: Pull latest code
echo -e "${YELLOW}[1/5] Pulling latest code from Git...${NC}"
git pull origin $BRANCH || {
    echo -e "${RED}Git pull failed. Make sure remote is configured.${NC}"
    exit 1
}

# Step 2: Build backend image
echo -e "${YELLOW}[2/5] Building backend Docker image...${NC}"
docker build -f backend/Dockerfile -t dizidentmain-$CLIENT-backend:latest ./backend || {
    echo -e "${RED}Backend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend image built${NC}"

# Step 3: Build frontend image
echo -e "${YELLOW}[3/5] Building frontend Docker image...${NC}"
docker build -f frontend/Dockerfile -t dizidentmain-$CLIENT-frontend:latest ./frontend || {
    echo -e "${RED}Frontend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend image built${NC}"

# Step 4: Stop old containers
echo -e "${YELLOW}[4/5] Stopping old containers...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.prod down || true
sleep 2

# Step 5: Start new containers
echo -e "${YELLOW}[5/5] Starting containers...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d || {
    echo -e "${RED}Docker compose up failed${NC}"
    exit 1
}

# Wait for container startup
sleep 5

# Show status
echo -e "${YELLOW}================================${NC}"
echo -e "${GREEN}✓ Deployment completed!${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Logs:"
docker-compose -f docker-compose.prod.yml logs --tail=10

echo ""
echo -e "${GREEN}Access at: https://${CLIENT}.dizidental.cloud${NC}"
echo -e "${GREEN}API at: https://${CLIENT}.dizidental.cloud/api${NC}"

echo ""
echo "View logs (realtime):"
echo "  docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  docker-compose -f docker-compose.prod.yml logs -f frontend"

echo ""
echo "Restart containers:"
echo "  docker-compose -f docker-compose.prod.yml restart"

echo ""
echo "Stop containers:"
echo "  docker-compose -f docker-compose.prod.yml down"
