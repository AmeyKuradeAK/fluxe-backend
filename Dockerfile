# Use official Node.js LTS image
FROM node:18-bullseye

# Install git, unzip, and curl for Flutter SDK
RUN apt-get update && apt-get install -y git unzip curl xz-utils

# Install Flutter SDK
RUN git clone https://github.com/flutter/flutter.git /opt/flutter
ENV PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Enable Flutter web (optional, can remove if not needed)
RUN flutter config --enable-web

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY ./src ./src
COPY .env .env

# Create a directory for generated Flutter projects
RUN mkdir -p /usr/src/app/flutter_projects

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "src/server.js"]
