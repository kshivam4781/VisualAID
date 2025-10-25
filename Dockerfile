# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Expose port
EXPOSE 3000

# Start the backend server
CMD ["node", "src/server.js"]
