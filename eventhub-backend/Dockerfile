# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies
COPY eventhub-backend/package*.json ./eventhub-backend/
RUN cd eventhub-backend && npm ci --only=production

# Copy backend and client
COPY eventhub-backend ./eventhub-backend
COPY eventhub-client ./eventhub-client

# Configure runtime
WORKDIR /app/eventhub-backend
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]