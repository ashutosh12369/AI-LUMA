# Auth controllers

**Code:** [auth.controllers.js](../../backend/services/auth/controllers/auth.controllers.js) · model: [user.model.js](../../backend/services/auth/models/user.model.js) · routes: [auth.routes.md](../routes/auth.routes.md)

A **controller** is the function that does the real work for one route. By the time a controller runs, the router has already matched the URL and any middleware has already run. The controller reads the request, talks to the database or other services, and sends back **one** reply (a status code + JSON).

**How to read "Takes":**

| Source | Meaning in this service |
|---|---|
| `req.body` | JSON sent by the caller. The auth service parses it with `express.json()` ([index.js:20](../../backend/services/auth/index.js#L20)). |
| `req.params` / `req.query` | Not used by any auth controller. |
| `req.cookies` | **Never filled in.** The auth service has no `cookie-parser`, so this is always `undefined` ([S6](../08-known-issues-and-improvements.md#s6)). |
| auth user | The auth service does **not** use `x-user-id`. It trusts the `userId` in the body for the internal routes ([S1](../08-known-issues-and-improvements.md#s1)). |
| file | None. |

Every function has its own `try/catch` and puts `error.message` in the reply.

---

### `login(req, res)`  *(public)*

| | |
|---|---|
| **What it does** | Checks a Firebase ID token with the Firebase Admin SDK. Finds the user by `firebaseUid`, or creates them (email, name, avatar, sign-in provider). Makes a random session ID, saves `user-session:<userId>` → sessionId and `session:<sessionId>` → user JSON in Redis for 7 days, and sets the `session` cookie (`httpOnly`, `secure`, `sameSite: "none"`, 7 days). It also logs the decoded token to the console. |
| **Takes** | `req.body.token`: the Firebase ID token from `result.user.getIdToken()` in [Home.jsx](../../frontend/src/pages/Home.jsx#L54). |
| **Returns** | `200` + `{ success: true, user }` (the full Mongo user document) · `401` + `{ message }` on **any** error: a bad token, but also a Mongo or Redis failure ([F11](../08-known-issues-and-improvements.md#f11)). |

### `logout(req, res)`  *(public)*

| | |
|---|---|
| **What it does** | Meant to delete `session:<id>` from Redis and clear the cookie. Because `req.cookies` is always `undefined` here, the Redis delete is **skipped**. Only the browser cookie is cleared. `user-session:<userId>` is never deleted either. |
| **Takes** | The `session` cookie (tries `req.cookies?.session`). |
| **Returns** | `200` + `{ success: true, message: "Logged out successfully" }` · `500` + `{ success: false, message }` on crash. |

### `updatePlan(req, res)`  *(no check at all; meant to be internal)*

| | |
|---|---|
| **What it does** | Loads the user, sets `plan`, **adds** `credits` to both `credits` and `totalCredits`, and sets `planExpiresAt` to now + 30 days. Saves. If `user-session:<userId>` exists in Redis, it rewrites that session's JSON so the new balance shows up without a new login. Called by billing after a payment. |
| **Takes** | `req.body`: `userId` (Mongo `_id`), `plan` (e.g. `"starter"`, `"pro"`), `credits` (number). |
| **Returns** | `200` + `{ success: true }` · `404` + `{ success: false, message: "User not found" }` · `500` + `{ success: false, message }` (e.g. an invalid ObjectId). |

### `deductCredits(req, res)`  *(no check at all; meant to be internal)*

| | |
|---|---|
| **What it does** | Looks up the price of the agent, refuses if the balance is too low, otherwise subtracts it, saves, and rewrites the cached Redis session. The check-then-save is not atomic ([S10](../08-known-issues-and-improvements.md#s10)). Called by every paid agent before it does its work. |
| **Takes** | `req.body`: `userId`, `agent` (`chat`, `search`, `coding`, `pdf`, `ppt`, `image`; anything else costs 1). |
| **Returns** | `200` + `{ success: true, credits }` (new balance) · `400` + `{ success: false, message: "Not enough credits." }` · `404` + `{ success: false, message: "User not found" }` · `500` + `{ success: false, message }`. |

---

## Helpers used by these controllers

| Helper | File | What it does | Takes → Returns |
|---|---|---|---|
| `getAuth(app).verifyIdToken` | [config/firebase.js](../../backend/services/auth/config/firebase.js) + `firebase-admin` | Checks the token's signature, expiry and project. | ID token → decoded claims (`uid`, `email`, `name`, `picture`, `firebase.sign_in_provider`), or throws |
| `redis` | [shared/redis/redis.js](../../backend/shared/redis/redis.js) | One shared `ioredis` client, built from `REDIS_URL`. | Redis commands → promises |
| `connectDB` | [config/db.js](../../backend/services/auth/config/db.js) | `mongoose.connect(MONGO_URI or MONGODB_URL)`. Logs the error and carries on if it fails. | nothing → nothing |
| `crypto.randomUUID` | Node built-in | Makes the session ID (122 random bits). | nothing → UUID string |

## Formulas

**Credits after a purchase** ([auth.controllers.js:262-276](../../backend/services/auth/controllers/auth.controllers.js#L262-L276)):

```
credits      = credits + plan.credits
totalCredits = totalCredits + plan.credits
planExpiresAt = now + 30 × 24 × 60 × 60 × 1000 ms
```

*Worked example:* a new user starts with `credits = 100`, `totalCredits = 100`. They use 30 credits (now 70), then buy **Starter** (₹199, 500 credits). After `updatePlan`: `credits = 570`, `totalCredits = 600`, `plan = "starter"`. The billing drawer shows `570/600` and a bar at 95%. It only shows this after a page reload ([F19](../08-known-issues-and-improvements.md#f19)).

**Charge per action** (`COST[agent] || 1`):

*Worked example:* a user with 12 credits runs one **search**. The search agent charges `search` = 5 (12 → 7). Then the graph always sends search results on to the chat agent, which charges `chat` = 1 more (7 → 6). So one search really costs **6** ([F8](../08-known-issues-and-improvements.md#f8)). A **PDF** next would cost 10, which is more than 6, so it's refused with 400 ("Not enough credits."). The PDF agent then catches that error and replies `200` "Failed to generate PDF." instead ([F7](../08-known-issues-and-improvements.md#f7)).
