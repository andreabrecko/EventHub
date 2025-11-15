Backend changes proposal: enforce email verification

- Add `requireVerifiedEmail` middleware in `src/middleware/authMiddleware.js`.
- Apply it to routes: `POST /api/events`, `POST /api/events/:id/register`, `DELETE /api/events/:id/register`.
- Update `src/utils/socketHandler.js` to check `email_verified` for `joinEventChat` and `chatMessage`.
- Enhance Socket.IO handshake in `server.js` to attach `{ email_verified, is_blocked }` to `socket.user`.
- Client: listen to `chatError` and show a toast message.

This file documents intended changes if tooling cannot apply patches.