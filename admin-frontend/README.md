# 캠퍼스 운영

Next.js 15 / React 19, Node 22. Independent application and lockfile.

```sh
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3100`. Set `NEXT_PUBLIC_API_URL=http://localhost:3001` (main-admin, without `/v1`) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the Google web OAuth client ID. Register the browser origin in Google Cloud and `CORS_ORIGINS` on main-admin. Server `ADMIN_EMAILS` determines access; the client cannot assign an admin role.

Docker exposes port 3100. `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` are **build args** because Next.js embeds them at build time. Rebuild when they change. With no credentials the root page displays setup instructions and never creates a fake session.

Google Identity Services → server token verification → event creation/editing with draft, published, cancelled state → integrations status and refresh requests for events/meals/shuttle. Cancellation is the initial contract's event removal mechanism; there is no unsupported hard-delete endpoint. Integration refresh may enqueue work; reload to see completion. Status JSON is intentionally displayed verbatim for this initial operational prototype.

Browser access tokens are held only in component memory. Reloading the page requires signing in again. No provider secrets are used in browser code. `pnpm build` verifies production compilation and types; configured Google OAuth/admin flows require actual school credentials.
