################################################################################
# AI-generated with Claude
#
# 2026-10-17  Opus 5.5   prompted by TaeHyun79
################################################################################

# The Caddyfile is part of the image, so that a change to it changes the image and Compose recreates the proxy. A
# mounted file would keep the routes the proxy started with.
FROM caddy:2.11.7

COPY Caddyfile /etc/caddy/Caddyfile
# A broken Caddyfile fails the build, and the running proxy stays.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
