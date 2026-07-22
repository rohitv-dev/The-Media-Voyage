# Build must run with the repo root as context, e.g.:
#   docker build -f apps/backend/Dockerfile .
# This is required because the backend depends on packages/shared,
# which only exists inside the pnpm workspace.

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

# Install every workspace's dependencies first, in their own layer,
# so Docker can reuse this layer on rebuilds as long as no package.json changed.
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Bring in the actual source and bundle the backend into one JS file.
FROM deps AS build
COPY apps/backend apps/backend
COPY packages/shared packages/shared
RUN pnpm --filter @media-voyage/backend build

# Final image: just Node plus the built app. No dev tools, no source.
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "apps/backend/dist/index.cjs"]
