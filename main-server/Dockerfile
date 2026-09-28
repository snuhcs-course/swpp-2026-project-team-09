# The main server as compose.yaml at the repository root runs it.
FROM node:24-slim
WORKDIR /app

# corepack runs the pnpm version declared in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, so that a source change does not reinstall them. Installing also generates Prisma Client.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000
# Bring the database up to the current schema, then start the server.
# Node runs directly, not through pnpm, so that it receives SIGTERM and shuts down gracefully.
CMD ["sh", "-c", "pnpm db:migrate && exec node dist/main"]
