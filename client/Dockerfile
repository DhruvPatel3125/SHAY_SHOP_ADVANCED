# React client Dockerfile (multi-stage)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the production bundle
RUN npm run build

# Serve with nginx
FROM nginx:alpine AS runtime
# Copy built assets to nginx html dir
COPY --from=build /app/build /usr/share/nginx/html
# Expose port 80
EXPOSE 80
# Default nginx start command
CMD ["nginx", "-g", "daemon off;"]