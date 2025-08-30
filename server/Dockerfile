# Node server Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the server code
COPY . .

# Environment and ports
ENV NODE_ENV=production
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]