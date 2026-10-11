# ── Build the Vite frontend ───────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime: Express multi-agent server + static dist ─────────────
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 8080
CMD ["node", "server.mjs"]
