FROM node:20-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci || npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the server port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]