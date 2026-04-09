# ========================
# Stage 1: Build Stage (React + Vite)
# ========================
# We use node:22-slim instead of alpine to avoid SIGBUS and memory issues with Vite/esbuild
FROM node:22-slim AS build

# Set working directory inside the container
WORKDIR /app

# ========================
# Step 1: Install dependencies (with good caching)
# ========================
# Copy only package files first so Docker can cache the npm ci layer
# This makes rebuilds much faster when only source code changes
COPY package.json package-lock.json ./

# Use 'npm ci' for clean and reproducible installs in Docker (better than 'npm install')
# --ignore-scripts prevents running risky post-install scripts
RUN npm ci --ignore-scripts

# ========================
# Step 2: Copy source code and build the app
# ========================
# Now copy the rest of the application code
COPY . .

# Set important environment variables for the build
# NODE_OPTIONS: Increases memory limit to prevent SIGBUS / out-of-memory errors during vite build
# NODE_ENV=production: Enables production optimizations
# GENERATE_SOURCEMAP=false: Reduces memory usage and final bundle size (recommended for production)
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096" \
    GENERATE_SOURCEMAP=false

# Run the Vite build command
# This will generate the optimized static files in the /app/dist folder
RUN npm run build

# ========================
# Stage 2: Production Stage (Nginx)
# ========================
# Use a lightweight Nginx image for serving static files
FROM nginx:stable-alpine AS production

# ========================
# Copy custom Nginx configuration (if you have one)
# ========================
# This overrides the default nginx config to properly serve your React app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ========================
# Copy built files from the build stage
# ========================
# Copy the dist folder (built React app) to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# ========================
# Security & Permissions
# ========================
# Set proper ownership and permissions for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80 (default for Nginx)
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]