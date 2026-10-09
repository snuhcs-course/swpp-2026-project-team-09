################################################################################
# AI-generated with Claude
#
# 2026-09-28  Opus 5.5   prompted by TaeHyun79
# 2026-09-29  Opus 5.5   prompted by fyoon46
################################################################################

# The socket server as compose.yaml at the repository root runs it.
FROM node:24-slim
WORKDIR /app

# corepack runs the pnpm version declared in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, so that a source change does not reinstall them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3001
# Node runs directly, not through pnpm, so that it receives SIGTERM and shuts down gracefully.
CMD ["node", "dist/main"]
