# ========================
# Stage 1: Build Stage (React + Vite)
# ========================
FROM node:22-slim AS build

WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json ./

# Clean install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Strong settings to prevent Bus error
ENV NODE_ENV=production \
    GENERATE_SOURCEMAP=false

# Run build with very high memory limit directly on the command (most reliable way)
RUN NODE_OPTIONS="--max-old-space-size=8192" npm run build

# ========================
# Stage 2: Production Stage
# ========================
FROM nginx:stable-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]