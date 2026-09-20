# Stage 1: Build the Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and configuration
COPY . .

# VITE_API_BASE_URL can be provided at build time to hardcode the backend URL
# If absent, it defaults to /api/v1 (relative to the serving domain)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the production bundle
RUN npm run build

# Stage 2: Serve the static assets using Nginx (Unprivileged)
FROM nginxinc/nginx-unprivileged:alpine-slim

# Copy the generated bundle
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Replace the default Nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
