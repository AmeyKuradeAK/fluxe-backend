# --- Stage 1: Build dependencies and Flutter SDK ---
FROM node:18-bullseye AS builder

# Install git, unzip, curl, xz-utils for Flutter SDK
RUN apt-get update && apt-get install -y git unzip curl xz-utils && rm -rf /var/lib/apt/lists/*

# Install Flutter SDK
RUN git clone https://github.com/flutter/flutter.git /opt/flutter
ENV PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:${PATH}"
RUN flutter doctor
RUN flutter config --enable-web

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY ./src ./src

# Create a directory for generated Flutter projects
RUN mkdir -p /usr/src/app/flutter_projects

# --- Stage 2: Final image ---
FROM node:18-slim

# Install runtime dependencies and Flutter SDK
RUN apt-get update && apt-get install -y git unzip curl xz-utils && rm -rf /var/lib/apt/lists/*
RUN useradd -ms /bin/bash appuser

# Copy Flutter SDK from builder
COPY --from=builder /opt/flutter /opt/flutter
ENV PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Set working directory
WORKDIR /usr/src/app

# Copy node_modules and app from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY package*.json ./

# Create a directory for generated Flutter projects
RUN mkdir -p /usr/src/app/flutter_projects && chown -R appuser:appuser /usr/src/app

# Use non-root user
USER appuser

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the app
CMD ["node", "src/server.js"]
