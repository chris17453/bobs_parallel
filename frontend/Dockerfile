# Parallel frontend.
# Dev target: Vite dev server with HMR.
# Build target: produces static assets consumed by the prod backend image.

# ---- Dev (hot reload) ----
FROM node:22-slim AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- Build (static output) ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Result: /app/dist  (copied into the prod backend image by docker-compose.prod.yml)
