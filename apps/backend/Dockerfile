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

# Dokploy passes "Environment" tab values to Dockerfile-type apps as build
# args, not as real container runtime env — each one has to be declared here
# and re-exposed as ENV or it's silently dropped and never reaches the app.
ARG HOST
ARG PORT
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG FRONTEND_URL
ARG AUTH_COOKIE_SAME_SITE
ARG AUTH_COOKIE_DOMAIN
ARG SIGNUP_INVITE_CODE
ARG IGDB_CLIENT_ID
ARG IGDB_CLIENT_SECRET
ARG OMDB_API_KEY

ENV HOST=$HOST
ENV PORT=$PORT
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV FRONTEND_URL=$FRONTEND_URL
ENV AUTH_COOKIE_SAME_SITE=$AUTH_COOKIE_SAME_SITE
ENV AUTH_COOKIE_DOMAIN=$AUTH_COOKIE_DOMAIN
ENV SIGNUP_INVITE_CODE=$SIGNUP_INVITE_CODE
ENV IGDB_CLIENT_ID=$IGDB_CLIENT_ID
ENV IGDB_CLIENT_SECRET=$IGDB_CLIENT_SECRET
ENV OMDB_API_KEY=$OMDB_API_KEY

COPY --from=build /app .
EXPOSE 3000
CMD ["node", "apps/backend/dist/index.cjs"]
