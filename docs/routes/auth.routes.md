# Auth routes (login, logout, credits, plan)

**Code:** [auth.routes.js](../../backend/services/auth/routes/auth.routes.js) · [auth.controllers.js](../../backend/services/auth/controllers/auth.controllers.js) · [auth service index.js](../../backend/services/auth/index.js) · [gateway index.js](../../backend/gateway/index.js#L60)

The **auth service** is a small Express app. It checks a Google/GitHub login done through Firebase, creates the user in MongoDB the first time, and starts a **session** (a random ID saved in Redis and in a browser cookie). It also owns the user's **credits** (the "money" of the app) and **plan**.

The browser reaches it through the **gateway** at `/api/auth/...`. Two other services (billing and agent) call it **directly** on its public Render URL, skipping the gateway.

> **Mount path:** the gateway mounts the proxy at `/api/auth` ([index.js:60](../../backend/gateway/index.js#L60)). The proxy library (`express-http-proxy`) forwards `req.url`, and Express removes the mount prefix from `req.url`. So `/api/auth/login` arrives at the auth service as `/login`. The auth service mounts its router at `/` ([index.js:41](../../backend/services/auth/index.js#L41)).

---

## Router map

```mermaid
flowchart LR
    idx["gateway index.js<br/>cors → static /uploads → helmet → morgan → cookieParser"] --> base["/api/auth<br/>proxy, no login check"]
    base --> svc["auth service index.js<br/>express.json → authRouter"]
    svc --> r1["POST /login"] --> m1["public"] --> f1["login()"]
    svc --> r2["GET /logout"] --> m2["public"] --> f2["logout()"]
    svc --> r3["PATCH /internal/update-plan"] --> m3["public (no check at all)"] --> f3["updatePlan()"]
    svc --> r4["PATCH /internal/deduct-credits"] --> m4["public (no check at all)"] --> f4["deductCredits()"]
    svc --> r5["GET /"] --> m5["public"] --> f5["health check (inline)"]

    classDef idx fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef route fill:#f3f4f6,stroke:#6b7280,color:#000
    classDef pub fill:#ffffff,stroke:#9ca3af,color:#6b7280,stroke-dasharray:4 3
    classDef mw fill:#fef08a,stroke:#a16207,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    class idx,base,svc idx
    class r1,r2,r3,r4,r5 route
    class m1,m2,m3,m4,m5 pub
    class f1,f2,f3,f4,f5 fn
```

## Quick table

| # | Method | Full URL (through gateway) | Middleware | Controller | Login needed |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | none | `login()` | No (this *is* the login) |
| 2 | GET | `/api/auth/logout` | none | `logout()` | No |
| 3 | PATCH | `/api/auth/internal/update-plan` | none | `updatePlan()` | **No**, and it should be internal-only |
| 4 | PATCH | `/api/auth/internal/deduct-credits` | none | `deductCredits()` | **No**, and it should be internal-only |
| 5 | GET | `/api/auth/` | none | inline health handler | No |

> **How to read the diagrams**
> 🟦 request / router · 🟨 middleware · 🟩 controller step · 🟥 error reply · 🟢 success reply.
> The main (success) path goes straight down. Errors hang off to the **right** on dotted arrows. The gateway's global middleware (cors, helmet, morgan, cookieParser) is drawn **once**, in the router map above, and not repeated below.

---

## 1. POST /api/auth/login: log in with a Firebase token

**Called from:** [Home.jsx](../../frontend/src/pages/Home.jsx#L36-L47) `login()`, after `signInWithPopup` (Google or GitHub) · **Body:** `{ token }` (the Firebase **ID token**, a signed proof from Google/Firebase of who the user is)

**In simple words:** The browser first logs in with Google or GitHub through Firebase and gets a signed token. It sends that token here. The server asks the Firebase Admin SDK "is this token real?". If yes, it finds or creates the user in MongoDB, makes a random session ID, stores the user's basic info in Redis for 7 days, and puts the session ID in an `httpOnly` cookie.

```mermaid
flowchart TD
    A(["POST /api/auth/login"]) --> B["gateway proxy /api/auth<br/>then authRouter"]
    B --> C["login()"]
    C --> D["Firebase Admin verifyIdToken(token)"]
    D ~~~ P1[" "]
    D --> F["User.findOne by firebaseUid"]
    D -.->|missing / bad / expired token| E1["401 error.message"]
    F --> G["Not found: User.create<br/>email, name, avatar, provider"]
    G --> H["crypto.randomUUID() = sessionId"]
    H --> I["Redis SET user-session:userId = sessionId, 7 days"]
    I ~~~ P2[" "]
    I --> J["Redis SET session:sessionId = user JSON, 7 days"]
    I -.->|Mongo or Redis fails| E2["401 error.message<br/>(wrong code)"]
    J --> K["Set cookie session<br/>httpOnly, secure, sameSite none, 7 days"]
    K --> OK(["200 success + full user document"])

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class C,D,F,G,H,I,J,K fn
    class E1,E2 err
    class OK ok
    class P1,P2 ghost
```

**What is saved in the Redis session** ([auth.controllers.js:83-107](../../backend/services/auth/controllers/auth.controllers.js#L83-L107)): `userId, email, avatar, name, plan, credits, totalCredits`. This JSON becomes `req.user` in the gateway on every later request.

> ⚠️ **Interview point:** this is **not JWT**. The cookie holds an opaque random ID, and the real data lives in Redis. That is why logout *could* instantly kill a session (a JWT can't be revoked easily). The trade-off: every protected request costs one Redis read. See [02-architecture.md](../02-architecture.md#auth-in-one-picture).

> ⚠️ **Interview point:** the whole function is in one `try/catch` that always returns **401**. If MongoDB or Redis is down, the user sees "401 Unauthorized" instead of a 500 server error. See [F11](../08-known-issues-and-improvements.md#f11).

> ⚠️ **Interview point:** `console.log(decoded)` ([line 31](../../backend/services/auth/controllers/auth.controllers.js#L31)) prints the decoded token (email, name, uid) into server logs on every login. That is personal data in logs. See [S11](../08-known-issues-and-improvements.md#s11).

> ⚠️ **Interview point:** the reply sends the **full Mongo user** (with `_id`, `firebaseUid`). But `/api/me` sends the smaller **session object** (with `userId`, no `_id`). So the frontend's `userData` has two different shapes. See [F18](../08-known-issues-and-improvements.md#f18).

---

## 2. GET /api/auth/logout: end the session

**Called from:** [Sidebar.jsx](../../frontend/src/components/Sidebar.jsx#L45-L54) `logout()` (the sign-out button) · **Body/Params/Query:** none; it reads the `session` cookie

**In simple words:** It should delete the session from Redis and clear the cookie. It does clear the cookie in the browser. But the auth service never installs `cookie-parser` (a middleware that reads the `Cookie` header into `req.cookies`). So `req.cookies` is always `undefined`, and the Redis session is **never deleted**.

```mermaid
flowchart TD
    A(["GET /api/auth/logout"]) --> B["gateway proxy /api/auth<br/>then authRouter"]
    B --> C["logout()"]
    C --> D["Read req.cookies.session"]
    D --> BUG["Bug: no cookie-parser in auth service,<br/>so this is always undefined"]
    BUG --> F["Skip redis.del session:id"]
    F ~~~ P1[" "]
    F --> G["res.clearCookie session<br/>same flags as login"]
    F -.->|crash| E1["500 error.message"]
    G --> OK(["200 Logged out successfully"])

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef bug fill:#fff1f2,stroke:#b91c1c,color:#7f1d1d,stroke-dasharray:4 3
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class C,D,F,G fn
    class BUG bug
    class E1 err
    class OK ok
    class P1 ghost
```

> ⚠️ **Interview point:** the gateway *does* use `cookie-parser`, but the auth service doesn't ([auth index.js](../../backend/services/auth/index.js) only has `express.json()`). The package is even listed in auth's `package.json`, just never used. Result: a stolen session cookie keeps working for up to 7 days after the user logs out. **Fix:** add `app.use(cookieParser())` in the auth service, and also `DEL user-session:<userId>`. See [S6](../08-known-issues-and-improvements.md#s6).

> ⚠️ **Interview point:** logout is a **GET** that changes server state. GET should be safe (no side effects). A page could trigger it with `<img src=".../logout">`. Use POST. See [Q7](../08-known-issues-and-improvements.md#q7).

---

## 3. PATCH /api/auth/internal/update-plan: give a plan and credits after payment

**Called from:** [billing.controller.js](../../backend/services/billing/controllers/billing.controller.js#L114-L122) `verifyPayment()`, **directly** at the hard-coded URL `https://ailuma-auth-service.onrender.com/internal/update-plan` (not through the gateway) · **Body:** `{ userId, plan, credits }`

**In simple words:** After a successful payment, billing tells auth "give this user this plan and add these credits". Auth loads the user, sets the plan, **adds** the credits to both `credits` and `totalCredits`, and sets the plan to end in 30 days. Then it rewrites the cached Redis session so the new balance shows up without logging in again.

```mermaid
flowchart TD
    A(["PATCH /api/auth/internal/update-plan"]) --> B["gateway proxy /api/auth, or direct call<br/>then authRouter"]
    B --> BUG["No auth check: anyone can call this"]
    BUG --> C["updatePlan()"]
    C --> D["User.findById(userId)"]
    D ~~~ P1[" "]
    D --> F["plan = plan<br/>credits += credits, totalCredits += credits<br/>planExpiresAt = now + 30 days"]
    D -.->|no user| E1["404 User not found"]
    F --> G["user.save()"]
    G --> H["Redis GET user-session:userId"]
    H --> I["If found: rewrite session:sessionId JSON, 7 days"]
    I ~~~ P2[" "]
    I --> OK(["200 success true"])
    I -.->|any crash, bad id| E2["500 error.message"]

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef bug fill:#fff1f2,stroke:#b91c1c,color:#7f1d1d,stroke-dasharray:4 3
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class C,D,F,G,H,I fn
    class BUG bug
    class E1,E2 err
    class OK ok
    class P1,P2 ghost
```

> ⚠️ **Interview point (the most serious bug in the project):** the word "internal" is only in the URL. Nothing checks who is calling. The gateway proxies **everything** under `/api/auth` with no login check, so anyone on the internet can send `PATCH /api/auth/internal/update-plan` with `{ userId, plan: "pro", credits: 1000000 }` and get free credits. **Fix:** don't expose `/internal/*` through the gateway, and require a shared secret header or mTLS / a private network between services. See [S1](../08-known-issues-and-improvements.md#s1).

> ⚠️ **Interview point:** `user.credits += credits` with no check. If `credits` is missing, the balance becomes `NaN`. `planExpiresAt` is saved, but **no code ever reads it**, so plans never expire. See [F12](../08-known-issues-and-improvements.md#f12).

---

## 4. PATCH /api/auth/internal/deduct-credits: charge the user for an AI action

**Called from:** [agent utils/deductCredits.js](../../backend/services/agent/utils/deductCredits.js#L13-L25), which every paid agent calls before it does any work. It uses the direct URL `https://ailuma-auth-service.onrender.com/internal/deduct-credits` · **Body:** `{ userId, agent }`

**In simple words:** The agent service says "user X used agent Y". Auth looks up the price in a small table (chat 1, search 5, coding / pdf / ppt / image 10, anything else 1). If the balance is too low, it refuses with 400. Otherwise it subtracts the price, saves, updates the cached session, and returns the new balance.

```mermaid
flowchart TD
    A(["PATCH /api/auth/internal/deduct-credits"]) --> B["gateway proxy /api/auth, or direct call<br/>then authRouter"]
    B --> BUG["No auth check: anyone can call this"]
    BUG --> C["deductCredits()"]
    C --> D["User.findById(userId)"]
    D ~~~ P1[" "]
    D --> F["cost = COST[agent] or 1"]
    D -.->|no user| E1["404 User not found"]
    F --> G["Check: user.credits >= cost"]
    G ~~~ P2[" "]
    G --> H["user.credits -= cost, save()<br/>(read, change, write: not atomic)"]
    G -.->|too low| E2["400 Not enough credits."]
    H --> I["Rewrite Redis session JSON if user-session exists"]
    I ~~~ P3[" "]
    I --> OK(["200 success + credits"])
    I -.->|crash| E3["500 error.message"]

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef bug fill:#fff1f2,stroke:#b91c1c,color:#7f1d1d,stroke-dasharray:4 3
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class C,D,F,G,H,I fn
    class BUG bug
    class E1,E2,E3 err
    class OK ok
    class P1,P2,P3 ghost
```

**Price table** ([auth.controllers.js:374-388](../../backend/services/auth/controllers/auth.controllers.js#L374-L388)):

| agent value sent | Cost |
|---|---|
| `chat` | 1 |
| `search` | 5 |
| `coding`, `pdf`, `ppt`, `image` | 10 |
| anything else | 1 (fallback) |

The agent service sends `coding` for the data and GitHub agents, and `image` for the vision agent. So those cost 10.

> ⚠️ **Interview point (race condition):** it reads the balance, checks it in JavaScript, then saves. Two requests at the same moment can both read `credits = 10`, both pass the check, and both save `0`. The user gets two paid actions for one charge. **Fix:** one atomic query: `User.findOneAndUpdate({ _id, credits: { $gte: cost } }, { $inc: { credits: -cost } }, { new: true })`. If it returns `null`, the balance was too low. See [S10](../08-known-issues-and-improvements.md#s10).

> ⚠️ **Interview point:** the same price table exists again in [billing/config/credits.js](../../backend/services/billing/config/credits.js), which nothing imports. Two copies of pricing will drift apart. See [Q3](../08-known-issues-and-improvements.md#q3).

> ⚠️ **Interview point:** this route is also public ([S1](../08-known-issues-and-improvements.md#s1)). Here that means anyone can **drain** another user's credits if they know the user's Mongo `_id`, and a shared-artifact link leaks that `_id` ([S7](../08-known-issues-and-improvements.md#s7)).

---

## 5. GET /api/auth/: health check

**Called from:** nothing in the frontend. [wakeup.js](../../frontend/src/utils/wakeup.js) tries to ping auth, but at a different host name and a `/health` path that doesn't exist ([F23](../08-known-issues-and-improvements.md#f23)). [WakeUp.html](../../WakeUp.html) pings the real root URL · **Body/Params/Query:** none

**In simple words:** It returns `{ service: "auth", status: "ok" }` so a person or a monitor can see the service is awake. On Render's free plan, services go to sleep, and this is used to wake them.

```mermaid
flowchart TD
    A(["GET /api/auth/"]) --> B["gateway proxy /api/auth<br/>then auth app"]
    B --> C["inline handler in index.js"]
    C --> OK(["200 service auth, status ok"])

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    class A,B req
    class C fn
    class OK ok
```

---

## End-to-end: the login journey

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser (Home.jsx)
    participant FB as Firebase Auth
    participant GW as Gateway
    participant AU as Auth service
    participant DB as MongoDB
    participant R as Redis
    U->>FB: signInWithPopup (Google or GitHub)
    FB-->>U: Firebase user + ID token (and GitHub access token)
    U->>GW: POST /api/auth/login with token
    GW->>AU: proxy POST /login (body streamed as-is)
    AU->>FB: verifyIdToken(token) via Admin SDK
    alt token valid
        FB-->>AU: decoded uid, email, name, picture
        AU->>DB: findOne firebaseUid, create if missing
        AU->>R: SET user-session:userId and session:sessionId (7 days)
        AU-->>GW: 200 user + Set-Cookie session
        GW-->>U: 200 + cookie stored for the gateway domain
        U->>U: dispatch setUserData(user)
    else token bad or DB error
        AU-->>U: 401 error.message
        U->>U: alert Backend Login Error
    end
```

## End-to-end: a logged-in request, then logout

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser
    participant GW as Gateway
    participant R as Redis
    participant S as Chat service
    participant AU as Auth service
    U->>GW: GET /api/chat/get-conversations + cookie session
    GW->>R: GET session:sessionId
    alt session found
        R-->>GW: user JSON
        GW->>S: proxy with header x-user-id
        S-->>U: 200 conversations
    else missing
        GW-->>U: 401 Session Expired
    end
    U->>GW: GET /api/auth/logout + cookie
    GW->>AU: proxy GET /logout (Cookie header passed on)
    AU->>AU: req.cookies is undefined, so no redis.del
    AU-->>U: 200 + clear cookie
    Note over R: session key still alive for up to 7 days
```

## End-to-end: how credits get charged

```mermaid
sequenceDiagram
    autonumber
    participant AG as Agent node (e.g. chatAgent)
    participant RL as Redis rate limit
    participant AU as Auth service
    participant DB as MongoDB
    participant R as Redis session
    AG->>RL: INCR rate:agent:userId (EXPIRE 60s on first hit)
    alt over the per-minute limit
        RL-->>AG: count > limit
        AG-->>AG: throw 429 with retryAfter
    else under the limit
        AG->>AU: PATCH /internal/deduct-credits userId + agent
        AU->>DB: findById, check, subtract, save
        alt enough credits
            AU->>R: rewrite session JSON with new credits
            AU-->>AG: 200 credits
            AG->>AG: now call the LLM
        else not enough
            AU-->>AG: 400 Not enough credits.
            AG-->>AG: throw 400 Insufficient Credits
        end
    end
```
