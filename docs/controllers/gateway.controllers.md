# Gateway controllers

**Code:** [user.controller.js](../../backend/gateway/controllers/user.controller.js) · middleware: [auth.middleware.js](../../backend/gateway/middlewares/auth.middleware.js) · proxy helper: [proxyWithHeaders.js](../../backend/gateway/utils/proxyWithHeaders.js) · routes: [gateway.routes.md](../routes/gateway.routes.md)

A **controller** is the function that does the real work for one route. By the time a controller runs, the router has already matched the URL and any middleware has already run. The controller reads the request and sends back **one** reply (a status code + JSON).

The gateway is almost all forwarding, so it has only **one** controller, `getCurrentUser`. The two pieces that do the gateway's real work are the `protect` middleware (the login check) and the `proxyWithUser` helper (forwarding with the user's ID). They are described in the helpers table below.

**How to read "Takes":**

| Source | Meaning in the gateway |
|---|---|
| `req.body` | **Never parsed.** The gateway has no `express.json()` (removed in commit `49e88fa`). Bodies are streamed to the services unread (`parseReqBody: false`). |
| `req.params` / `req.query` | Not used. |
| `req.cookies` | Filled in by `cookieParser()` ([index.js:41](../../backend/gateway/index.js#L41)). `protect` reads `req.cookies.session`. |
| auth user | `req.user`, set by `protect` to the parsed Redis session JSON: `userId, email, avatar, name, plan, credits, totalCredits`. |
| file | None. |

---

### `getCurrentUser(req, res)`  *(login needed: runs after `protect`)*

| | |
|---|---|
| **What it does** | Sends back `req.user` as it is. No database call and no call to another service. It is `async` and has a `try/catch`, but nothing inside can really fail. Mounted with `app.use("/api/me", protect, getCurrentUser)`, so it answers any method and any sub-path under `/api/me`. |
| **Takes** | `req.user` (from `protect`). Called by [useCurrentUser.jsx](../../frontend/src/hooks/useCurrentUser.jsx#L40) once on page load. |
| **Returns** | `200` + `{ success: true, user }` where `user` is the session object (`userId`, not `_id`, so a different shape from the login reply, [F18](../08-known-issues-and-improvements.md#f18)) · `500` + `{ success: false, message }` in theory. Before it runs, `protect` can already have replied `401` or `500`. |

---

## Helpers used by the gateway

| Helper | File | What it does | Takes → Returns |
|---|---|---|---|
| `protect` (middleware) | [auth.middleware.js](../../backend/gateway/middlewares/auth.middleware.js) | Reads `req.cookies.session`. None → `401 { message: "Unauthorized" }`. Then `redis.get("session:" + id)`. Nothing → `401 { message: "Session Expired" }`. Found → `req.user = JSON.parse(session)` and `next()`. Any thrown error (Redis down, bad JSON) → `500 { message: error.message }`. It does not refresh the session's time to live. | `req` with cookie → sets `req.user`, or replies 401 / 500 |
| `proxyWithUser(serviceUrl)` | [proxyWithHeaders.js](../../backend/gateway/utils/proxyWithHeaders.js) | Returns an `express-http-proxy` middleware with `parseReqBody: false` (body streamed as raw bytes). Its `proxyReqOptDecorator` (a hook that edits the outgoing request before it is sent) sets `x-user-id = req.user.userId`, and `x-user-email` / `x-user-avatar` **only if** they have a value. Before commit `4ac41a3` ("Fix Gateway crash on undefined email/avatar headers") they were always set, and an `undefined` value crashed the gateway, because Node refuses a header with no value. It also copies the browser's `x-github-token` ([S9](../08-known-issues-and-improvements.md#s9)). No service reads `x-user-email` or `x-user-avatar`. | service URL → middleware |
| `proxy(url, { parseReqBody: false })` | `express-http-proxy@2.1.2` | Plain forwarding, used for `/api/auth` and `/api/chat/shared` (no user headers). Forwards `req.url` (mount prefix already stripped, [F5](../08-known-issues-and-improvements.md#f5)) and the browser's headers, including `Cookie`, and passes the reply back, including `Set-Cookie`. | URL → middleware |
| `getServiceUrl(name)` | [index.js:44-53](../../backend/gateway/index.js#L44-L53) | `nameMap[name] \|\| process.env[name]`. The hard-coded Render URL always wins, so env is never used ([F6](../08-known-issues-and-improvements.md#f6)). | `"AUTH_SERVICE"` etc. → URL string |
| `redis` | [shared/redis/redis.js](../../backend/shared/redis/redis.js) | One shared `ioredis` client built from `REDIS_URL`. It calls `dotenv.config()` itself, which is why it works even though the gateway's `dotenv.config()` runs after the imports ([Q14](../08-known-issues-and-improvements.md#q14)). Also imported in `index.js`, where it isn't used directly. | Redis commands → promises |
| `cookieParser()` | `cookie-parser` | Turns the `Cookie` header into `req.cookies`. | request → `req.cookies` |

## Formulas

**The Redis key `protect` reads** ([auth.middleware.js:17-29](../../backend/gateway/middlewares/auth.middleware.js#L17-L29)):

```
key = "session:" + req.cookies.session
```

*Worked example:* the browser sends `Cookie: session=7f3c...e1`. `protect` runs `GET session:7f3c...e1`. Auth wrote that key at login with a 7-day expiry (`EX 604800`, i.e. 60 × 60 × 24 × 7 seconds). On day 8 the key is gone, so the reply is `401 Session Expired`, even if the browser still has the cookie.

**Session → headers** ([proxyWithHeaders.js:24-42](../../backend/gateway/utils/proxyWithHeaders.js#L24-L42)):

| Session field (`req.user`) | Header sent to the service | When |
|---|---|---|
| `userId` | `x-user-id` | always (after `protect`) |
| `email` | `x-user-email` | only if truthy |
| `avatar` | `x-user-avatar` | only if truthy |
| (browser header) `x-github-token` | `x-github-token` | only if the browser sent it |

*Worked example:* a GitHub user whose session is `{ userId: "66a1…", email: null, avatar: "https://…/u/1.png", … }` calls `POST /api/agent/chat`. The agent service receives `POST /chat` with `x-user-id: 66a1…`, `x-user-avatar: https://…/u/1.png`, no `x-user-email`, and the browser's `x-github-token` if it is in `localStorage`.

**Forwarded path:**

```
path at the service = original URL − mount prefix   (the query string is kept)
```

*Worked example:* `GET /api/chat/get-messages/65f0?x=1` → chat gets `GET /get-messages/65f0?x=1`. `GET /api/chat/shared/abc123` → chat gets `GET /abc123`, which has no route, so 404 ([F5](../08-known-issues-and-improvements.md#f5)).
