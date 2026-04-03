# ── Base ──────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9

# ── Dependências ──────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# ── Build ─────────────────────────────────────────────────
FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ── Produção ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]

# ── Desenvolvimento ───────────────────────────────────────
FROM base AS development
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3001 9229
CMD ["pnpm", "dev"]
