# ========================
# Stage 1: Build Stage (React + Vite)
# ========================
# Using node:22-slim (Debian-based) for better stability with Vite/esbuild compared to alpine
FROM node:22-slim AS build

WORKDIR /app

# ========================
# Step 1: Install dependencies (optimized caching)
# ========================
COPY package.json package-lock.json ./

# Use 'ci' for clean, locked, and reproducible dependency installation
RUN npm ci --ignore-scripts

# ========================
# Step 2: Copy source and build
# ========================
COPY . .

# Critical settings to prevent memory crashes (SIGBUS / exit 135)
# We increased to 6144 MB (6GB) because 4096 was still not enough in your case
# GENERATE_SOURCEMAP=false significantly reduces memory usage during build
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=6144" \
    GENERATE_SOURCEMAP=false

# Run the Vite build
# If this still fails, we will try even higher memory or other optimizations next
RUN npm run build

# ========================
# Stage 2: Production Stage (Nginx)
# ========================
FROM nginx:stable-alpine AS production

# Copy custom Nginx config (for SPA routing support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Security: Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]