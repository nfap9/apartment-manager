FROM node:22-slim AS build

WORKDIR /repo
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy whole monorepo (controlled by .dockerignore)
COPY . .

# Install deps for the whole workspace (simple & reliable)
RUN pnpm install --frozen-lockfile

# Prisma 7 requires DATABASE_URL to load prisma.config.ts.
# It doesn't need to be reachable for generate, only present.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apartment_manager?schema=public

RUN pnpm -C apps/api prisma:generate
RUN pnpm -C apps/api build


FROM node:22-slim AS runner

WORKDIR /repo
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api /repo/apps/api

EXPOSE 3000

WORKDIR /repo/apps/api
CMD ["node", "dist/server.js"]

