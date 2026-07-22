# Build must run with the repo root as context, e.g.:
#   docker build -f apps/frontend/Dockerfile .
# This is required because the frontend depends on packages/shared,
# which only exists inside the pnpm workspace.

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Vite bakes VITE_* values into the built JS at this step, so they must be
# passed in as build args (--build-arg / Dokploy "build arguments"), not
# as runtime environment variables on the running container.
FROM deps AS build
COPY apps/frontend apps/frontend
COPY packages/shared packages/shared
ARG VITE_API_URL
ARG VITE_AUTH_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_URL=$VITE_AUTH_URL
RUN pnpm --filter @media-voyage/frontend build

# Final image: nginx serving the static build output. No Node at all here.
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
