# Multi-stage build for React + Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment configuration
ARG VITE_API_BASE=http://localhost:8080
ARG VITE_CLIENT_ID=dev
ARG VITE_CLIENT_NAME="Dev Environment"
ARG VITE_LOGTO_ENABLED=false
ARG VITE_LEGACY_AUTH_ENABLED=true
ARG VITE_APP_ENV=development

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create .env file for build (overrides any copied .env)
RUN echo "VITE_API_BASE=${VITE_API_BASE}" > .env && \
    echo "VITE_API_BASE_URL=${VITE_API_BASE}/api" >> .env && \
    echo "VITE_CLIENT_ID=${VITE_CLIENT_ID}" >> .env && \
    echo "VITE_CLIENT_NAME=${VITE_CLIENT_NAME}" >> .env && \
    echo "VITE_LOGTO_ENABLED=${VITE_LOGTO_ENABLED}" >> .env && \
    echo "VITE_LEGACY_AUTH_ENABLED=${VITE_LEGACY_AUTH_ENABLED}" >> .env && \
    echo "VITE_APP_ENV=${VITE_APP_ENV}" >> .env

# Build the application
RUN npm run build

# Runtime stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check (use 127.0.0.1 — alpine wget can fail on localhost/IPv6)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
