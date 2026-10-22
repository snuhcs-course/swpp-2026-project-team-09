################################################################################
# AI-generated with Claude
#
# 2026-09-28  Opus 5.5   prompted by TaeHyun79
# 2026-09-29  Opus 5.5   prompted by TaeHyun79
# 2026-09-29  Opus 5.5   prompted by fyoon46
# 2026-10-22  Opus 5.5   prompted by fyoon46
################################################################################

# The match server as compose.yaml at the repository root runs it.
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

# Production's database on RDS presents a certificate from Amazon's own CAs, which Node does not trust by itself. Set
# after the install, because pnpm would trust only this bundle and fail to reach the registry.
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem

EXPOSE 3003
# Bring the database up to the current schema, then start the server.
# Node runs directly, not through pnpm, so that it receives SIGTERM and shuts down gracefully.
CMD ["sh", "-c", "pnpm db:migrate && exec node dist/main"]
