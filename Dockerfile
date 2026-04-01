# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --workspace=client
COPY client/ ./client/
RUN npm run build --workspace=client

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm install --workspace=server
COPY server/ ./server/
RUN npm run build --workspace=server

# Stage 3: Production
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install --workspace=server --omit=dev && \
    apk del python3 make g++

# Copy built backend
COPY --from=backend-builder /app/server/dist ./server/dist

# Copy built frontend to server public directory
COPY --from=frontend-builder /app/client/dist ./server/public

ENV NODE_ENV=production
ENV DB_PATH=/data/finance.db
ENV PORT=3000

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
