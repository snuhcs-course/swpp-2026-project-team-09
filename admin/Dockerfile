################################################################################
# AI-generated with Claude
#
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# The admin site as Production runs it: Next.js's standalone output on Node.js.
FROM node:24-slim AS build
WORKDIR /app

# corepack runs the pnpm version declared in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, so that a source change does not reinstall them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Written into the browser's code by the build, so they are fixed per image.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY
# The site has no public folder yet; an empty one keeps the copy below working until it does.
RUN mkdir -p public && pnpm build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
# The standalone server binds to HOSTNAME, which a container runtime may set to the container's name.
ENV HOSTNAME=0.0.0.0
ENV PORT=3100

# server.js serves public and .next/static only when they sit beside it, and the build leaves both out.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3100
CMD ["node", "server.js"]
