# TextDigest - Docker Image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm install typescript && npm run build && npm uninstall typescript

# Clean up source files
RUN rm -rf src/ tsconfig.json

# Set up volumes
VOLUME ["/data", "/output"]

# Environment variables
ENV NODE_ENV=production

# CLI entry point
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
