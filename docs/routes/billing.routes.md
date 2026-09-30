# Billing routes (buy a plan with Razorpay)

**Code:** [billing.routes.js](../../backend/services/billing/routes/billing.routes.js) · [billing.controller.js](../../backend/services/billing/controllers/billing.controller.js) · [billing service index.js](../../backend/services/billing/index.js) · [plans.js](../../backend/services/billing/config/plans.js) · [payment.model.js](../../backend/services/billing/models/payment.model.js) · [gateway index.js](../../backend/gateway/index.js#L73) · controllers: [billing.controllers.md](../controllers/billing.controllers.md)

The **billing service** is a small Express app that sells credit packs. It uses **Razorpay**, an Indian payment company. Razorpay shows the card / UPI popup and takes the money. Billing only does two things:

1. **Create an order**: tell Razorpay "this user wants to pay ₹199", and save a `Payment` row in MongoDB with status `created`.
2. **Verify a payment**: after the user pays, check that Razorpay really signed the result, mark the row `paid`, and ask the **auth service** to add the credits.

The browser reaches billing through the **gateway** at `/api/billing/...`. Unlike `/api/auth`, this mount **needs a login**: the gateway runs `protect` (the session check) first. Billing then calls auth **directly** on auth's hard-coded public Render URL, skipping the gateway.

> **Mount path:** the gateway mounts `protect` + `proxyWithUser` at `/api/billing` ([index.js:73](../../backend/gateway/index.js#L73)). The proxy library (`express-http-proxy`) forwards `req.url`, and Express removes the mount prefix from `req.url`. So `/api/billing/create-order` arrives at billing as `/create-order`. Billing mounts its router at `/` ([index.js:34-37](../../backend/services/billing/index.js#L34-L37)). The gateway does **not** parse the body (`parseReqBody: false`); it streams it through untouched, and billing's own `express.json()` ([index.js:24](../../backend/services/billing/index.js#L24)) turns it into `req.body`.

---

## Router map

```mermaid
flowchart LR
    idx["gateway index.js<br/>cors → static /uploads → helmet → morgan → cookieParser"] --> gmw["protect<br/>session cookie → Redis"]
    gmw --> base["/api/billing<br/>proxyWithUser<br/>adds x-user-id"]
    base --> svc["billing index.js<br/>express.json → helmet → morgan → router"]
    svc --> r1["POST /create-order"] --> m1["no route middleware"] --> f1["createOrder()"]
    svc --> r2["POST /verify-payment"] --> m2["no route middleware"] --> f2["verifyPayment()"]
    svc --> r3["GET /"] --> m3["no route middleware"] --> f3["health check (inline, after router)"]

    classDef idx fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef route fill:#f3f4f6,stroke:#6b7280,color:#000
    classDef pub fill:#ffffff,stroke:#9ca3af,color:#6b7280,stroke-dasharray:4 3
    classDef mw fill:#fef08a,stroke:#a16207,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    class idx,base,svc idx
    class gmw mw
    class r1,r2,r3 route
    class m1,m2,m3 pub
    class f1,f2,f3 fn
```

## Quick table

| # | Method | Full URL (through gateway) | Middleware | Controller | Login needed |
|---|---|---|---|---|---|
| 1 | POST | `/api/billing/create-order` | `protect` (gateway) | `createOrder()` | Yes |
| 2 | POST | `/api/billing/verify-payment` | `protect` (gateway) | `verifyPayment()` | Yes, but it never checks that the order belongs to the caller |
| 3 | GET | `/api/billing/` | `protect` (gateway) | inline health handler | Yes through the gateway. Billing's own Render URL is public. |

> **How to read the diagrams**
> 🟦 request / router · 🟨 middleware · 🟩 controller step · 🟥 error reply · 🟢 success reply.
> The main (success) path goes straight down. Errors hang off to the **right** on dotted arrows. The gateway's global middleware (cors, helmet, morgan, cookieParser) is drawn **once**, in the router map above, and not repeated below. `protect` is drawn as **one** yellow node with one merged error arrow: `401 Unauthorized` (no cookie), `401 Session Expired` (no Redis key) or `500` (Redis error).

---

## 1. POST /api/billing/create-order: start a payment

**Called from:** [billing.api.js](../../frontend/src/features/billing.api.js#L9-L22) `createOrder(plan)`, called by [BillingDrawer.jsx](../../frontend/src/components/BillingDrawer.jsx#L21-L24) `handleUpgrade("starter")` or `handleUpgrade("pro")` (the two **Upgrade** buttons) · **Body:** `{ plan }` (`"free"`, `"starter"` or `"pro"`) · **Header used:** `x-user-id` (added by the gateway)

**In simple words:** The user clicks **Upgrade**. Billing looks up the plan's price in a fixed table. It asks Razorpay to create an **order** (a "bill" with an ID, waiting to be paid) for that price in **paise** (1 rupee = 100 paise). It saves a `Payment` row with status `created`, and returns the order to the browser. The browser needs the order ID to open the Razorpay popup.

```mermaid
flowchart TD
    A(["POST /api/billing/create-order"]) --> MW["protect<br/>cookie session → Redis session:id"]
    MW ~~~ P0[" "]
    MW --> B["proxyWithUser<br/>adds x-user-id<br/>then billing express.json → router"]
    MW -.->|no / bad session| E0["401 / 500"]
    B --> C["createOrder()"]
    C --> D["plan from body<br/>userId from x-user-id header"]
    D --> F["Check: PLANS[plan] exists"]
    F ~~~ P1[" "]
    F --> G["razorpay.orders.create<br/>amount × 100 paise, INR, receipt_timestamp"]
    F -.->|unknown plan| E1["400 Invalid plan"]
    G --> H["Payment.create<br/>userId, orderId, amount, credits, plan, status created"]
    H ~~~ P2[" "]
    H --> OK(["200 success + order + plan"])
    H -.->|Razorpay or Mongo fails| E2["500 error.message"]

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef mw fill:#fef08a,stroke:#a16207,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class MW mw
    class C,D,F,G,H fn
    class E0,E1,E2 err
    class OK ok
    class P0,P1,P2 ghost
```

**The plan table** ([plans.js](../../backend/services/billing/config/plans.js)):

| `plan` sent | Price (`amount`, rupees) | Sent to Razorpay (paise) | Credits added | `validity` |
|---|---|---|---|---|
| `free` | 0 | 0 (Razorpay refuses it, see [F25](../08-known-issues-and-improvements.md#f25)) | 100 | 30 (never read) |
| `starter` | 199 | 19 900 | 500 | 30 (never read) |
| `pro` | 499 | 49 900 | 1000 | 30 (never read) |

**Worked example (paise):** the user clicks Upgrade on **Starter**. `amount = 199 × 100 = 19 900` paise, which is ₹199.00. Razorpay's order comes back with `amount: 19900`, and the browser passes that same number to the popup. But the `Payment` row stores `amount: 199` (rupees, [line 44](../../backend/services/billing/controllers/billing.controller.js#L44)). So the same field name holds two different units in two places.

**Reply shape:** `{ success: true, order, plan }`. `order` is Razorpay's order object as-is (it includes `id`, `amount`, `currency`, `receipt`, `status`). `plan` is the whole entry from the table above.

> ⚠️ **Interview point:** the `userId` comes from the `x-user-id` header, which billing trusts blindly. Through the gateway it is safe, because the gateway overwrites it from the session. But billing's own Render URL is public, so anyone can call it directly and send any `x-user-id`. See [S2](../08-known-issues-and-improvements.md#s2).

> ⚠️ **Interview point:** the plan check is only `if (!PLANS[plan])`. `"free"` passes it, and Razorpay then rejects an order of 0 paise, so the user gets a **500** instead of a clear 400. See [F25](../08-known-issues-and-improvements.md#f25). The same happens for names like `"constructor"`: `PLANS` is a plain object, so `PLANS["constructor"]` is inherited and truthy, the amount becomes `NaN`, and Razorpay fails. `Object.hasOwn(PLANS, plan)` plus a price check would fix both.

> ⚠️ **Interview point:** the order is created at Razorpay **before** the Mongo save. If the save fails, there is an order at Razorpay with no row in the database. Also, the axios interceptor retries a POST that gets a 502/503/504 or no response, up to 15 times. Each retry makes another order and another `created` row. See [S13](../08-known-issues-and-improvements.md#s13).

> ⚠️ **Interview point:** `orderId` has no index and no unique rule in the model, so `verifyPayment` does a full collection scan to find it, and duplicates are possible. See [Q5](../08-known-issues-and-improvements.md#q5).

---

## 2. POST /api/billing/verify-payment: confirm the payment and add credits

**Called from:** the Razorpay popup's `handler` in [BillingDrawer.jsx](../../frontend/src/components/BillingDrawer.jsx#L36-L48), which posts Razorpay's `response` object unchanged · **Body:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`

**In simple words:** When the user finishes paying, Razorpay gives the browser three values. The third one, the **signature**, is Razorpay's proof: it is an **HMAC** of the other two. (An **HMAC** is a "keyed fingerprint": you mix a message with a secret key using a hash function like SHA-256. Only someone who knows the key can make the right fingerprint.) Billing and Razorpay both know `RAZORPAY_KEY_SECRET`, and the browser doesn't. So billing makes the same fingerprint itself. If it matches, the payment is genuine. Billing then marks the row `paid` and tells auth to add the plan's credits.

```mermaid
flowchart TD
    A(["POST /api/billing/verify-payment"]) --> MW["protect<br/>cookie session → Redis session:id"]
    MW ~~~ P0[" "]
    MW --> B["proxyWithUser<br/>adds x-user-id<br/>then billing express.json → router"]
    MW -.->|no / bad session| E0["401 / 500"]
    B --> C["verifyPayment()"]
    C --> D["HMAC-SHA256 as hex<br/>key RAZORPAY_KEY_SECRET<br/>message order_id and payment_id"]
    D --> F["Check: it equals razorpay_signature<br/>plain !== compare"]
    F ~~~ P1[" "]
    F --> G["Payment.findOne by orderId"]
    F -.->|no match| E1["400 Payment verification failed"]
    G ~~~ P2[" "]
    G --> BUG["Bug: never checks status is created"]
    G -.->|no row| E2["404 Payment not found"]
    BUG --> H["status = paid<br/>paymentId = payment_id<br/>payment.save()"]
    H --> I["axios.patch auth<br/>/internal/update-plan<br/>hard-coded URL<br/>body userId, plan, credits"]
    I ~~~ P3[" "]
    I --> OK(["200 Payment verified successfully"])
    I -.->|auth fails or any crash| E3["500 error.message"]

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef mw fill:#fef08a,stroke:#a16207,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef bug fill:#fff1f2,stroke:#b91c1c,color:#7f1d1d,stroke-dasharray:4 3
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class MW mw
    class C,D,F,G,H,I fn
    class BUG bug
    class E0,E1,E2,E3 err
    class OK ok
    class P0,P1,P2,P3 ghost
```

**The signature formula** ([billing.controller.js:80-86](../../backend/services/billing/controllers/billing.controller.js#L80-L86)):

```
expected = HMAC_SHA256( key = RAZORPAY_KEY_SECRET,
                        message = razorpay_order_id + "|" + razorpay_payment_id ).hex
valid    = (expected === razorpay_signature)
```

*Worked example (made-up key, not the real one):* key `demo_secret`, `razorpay_order_id = order_ABC123`, `razorpay_payment_id = pay_XYZ789`. The message is `order_ABC123|pay_XYZ789`. Its HMAC-SHA256 in hex is `1cc492f1ab2b70adb65c857a944c35b582b08530b140ad2c53a60de8fcbb2934`. If the browser sends exactly that as `razorpay_signature`, the check passes. Change one letter of the payment ID and the hex is completely different, so a user can't invent a "paid" result without the secret.

**What auth then does** (see [auth.routes.md](auth.routes.md#3-patch-apiauthinternalupdate-plan-give-a-plan-and-credits-after-payment)): `plan = "starter"`, `credits += 500`, `totalCredits += 500`, `planExpiresAt = now + 30 days`, and it rewrites the Redis session so `/api/me` shows the new balance.

> ⚠️ **Interview point (money bug):** `verifyPayment` never checks `payment.status === "created"`. The same valid `{ order_id, payment_id, signature }` can be sent again and again, and every time auth adds the credits again. One ₹199 payment → unlimited credits. **Fix:** an atomic "claim": `Payment.findOneAndUpdate({ orderId, status: "created" }, { status: "paid", paymentId })`. Only call auth if it returned a document. Add a unique index on `orderId`. See [S3](../08-known-issues-and-improvements.md#s3) and the replay diagram below.

> ⚠️ **Interview point:** it also never checks that `payment.userId` equals the caller's `x-user-id`. Any logged-in user who has someone's valid triple can trigger the credit (it goes to the order's owner, not to the caller). An **idempotent** endpoint (one where sending the same request twice has the same effect as sending it once) would make both of these harmless.

> ⚠️ **Interview point:** the row is saved as `paid` **before** the call to auth, and a failed auth call is never retried. If auth is asleep or down, the user has paid, the record says `paid`, but no credits were added, and the reply is a 500. There is also no Razorpay **webhook** (a server-to-server call that Razorpay makes to your backend when a payment is captured). So if the user closes the tab before the `handler` runs, nothing is ever credited. See [S12](../08-known-issues-and-improvements.md#s12).

> ⚠️ **Interview point:** the auth URL is hard-coded to production (`https://ailuma-auth-service.onrender.com`, [line 114](../../backend/services/billing/controllers/billing.controller.js#L114)). `render.yaml` gives billing an `AUTH_SERVICE_HOSTPORT` variable that the code never reads. See [F6](../08-known-issues-and-improvements.md#f6).

> ⚠️ **Interview point:** the signature is compared with `!==`, which stops at the first different character. In theory that leaks timing. The standard fix is `crypto.timingSafeEqual` on two equal-length buffers. It's a small point, but interviewers like it.

> ⚠️ **Interview point:** on success the frontend only does `console.log(data)`. The credits on screen don't change until the page is reloaded. See [F19](../08-known-issues-and-improvements.md#f19). And because of the axios auto-retry ([S13](../08-known-issues-and-improvements.md#s13)), a verify call that gets a 502/503/504 or no response is sent **again**, which, with [S3](../08-known-issues-and-improvements.md#s3), can add the credits twice by accident.

---

## 3. GET /api/billing/: health check

**Called from:** nothing in the frontend through the gateway. [WakeUp.html](../../WakeUp.html#L48) pings billing's own root URL directly. [wakeup.js](../../frontend/src/utils/wakeup.js#L13) pings a different host and a `/api/billing/health` path that doesn't exist ([F23](../08-known-issues-and-improvements.md#f23)) · **Body/Params/Query:** none

**In simple words:** It returns `{ success: true, message: "Billing Service Running" }` so a person or a monitor can see the service is awake. It is registered **after** the router ([index.js:41-46](../../backend/services/billing/index.js#L41-L46)), but it still works, because the router has no `GET /` route and passes the request on.

```mermaid
flowchart TD
    A(["GET /api/billing/"]) --> MW["protect<br/>cookie session → Redis session:id"]
    MW ~~~ P0[" "]
    MW --> B["proxyWithUser<br/>path becomes /"]
    MW -.->|no / bad session| E0["401 / 500"]
    B --> C["billing router: no GET / route, passes on"]
    C --> D["inline handler in index.js"]
    D --> OK(["200 success, Billing Service Running"])

    classDef req fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef mw fill:#fef08a,stroke:#a16207,color:#000
    classDef fn fill:#dcfce7,stroke:#15803d,color:#000
    classDef err fill:#fee2e2,stroke:#b91c1c,color:#000
    classDef ok fill:#166534,stroke:#14532d,color:#fff
    classDef ghost fill:none,stroke:none,color:transparent
    class A,B req
    class MW mw
    class C,D fn
    class E0 err
    class OK ok
    class P0 ghost
```

> ⚠️ **Interview point:** through the gateway, the health check needs a login, because `protect` guards all of `/api/billing`. That is why the wake-up page skips the gateway and pings billing's public URL, which also shows that billing is reachable directly ([S2](../08-known-issues-and-improvements.md#s2)).

---

## End-to-end: the full payment flow

```mermaid
sequenceDiagram
    autonumber
    participant U as Browser (BillingDrawer)
    participant GW as Gateway
    participant R as Redis
    participant BI as Billing service
    participant RZ as Razorpay
    participant DB as MongoDB
    participant AU as Auth service
    U->>GW: POST /api/billing/create-order plan starter + cookie
    GW->>R: protect: GET session:sessionId
    GW->>BI: proxy POST /create-order + x-user-id
    BI->>RZ: orders.create amount 19900 paise, INR
    RZ-->>BI: order with id and amount
    BI->>DB: Payment.create status created
    BI-->>U: 200 order + plan (back through the gateway)
    U->>RZ: new window.Razorpay with key, order_id, then open()
    alt user pays
        RZ-->>U: handler gets order_id, payment_id, signature
        U->>GW: POST /api/billing/verify-payment + cookie (protect again)
        GW->>BI: proxy POST /verify-payment + x-user-id
        alt HMAC matches and the order row exists
            BI->>DB: status paid, paymentId, save
            BI->>AU: PATCH /internal/update-plan direct URL
            AU->>DB: plan starter, credits plus 500, save
            AU->>R: rewrite session:sessionId with new credits
            AU-->>BI: 200 success
            BI-->>U: 200 Payment verified successfully
            U->>U: console.log only, the screen still shows old credits
        else bad signature or no row
            BI-->>U: 400 or 404
        end
    else payment fails in the popup
        RZ-->>U: payment.failed event, alert shown
    end
```

## End-to-end: the replay attack (S3)

```mermaid
sequenceDiagram
    autonumber
    participant A as Attacker (logged in)
    participant GW as Gateway
    participant BI as Billing service
    participant DB as MongoDB
    participant AU as Auth service
    Note over A,GW: pays once for Starter (199 rupees) and keeps the Razorpay response
    loop send the same body again and again
        A->>GW: POST /api/billing/verify-payment same three values
        GW->>BI: proxy (session is valid)
        BI->>BI: HMAC matches, because the values are genuine
        BI->>DB: findOne orderId, status is already paid
        Note over BI: no status check, so it carries on
        BI->>DB: set paid again, save
        BI->>AU: PATCH /internal/update-plan credits 500
        AU->>DB: credits plus 500 again
        BI-->>A: 200 Payment verified successfully
    end
    Note over GW,AU: fix: findOneAndUpdate with status created, credit only if a row came back
```

*Worked example:* one real Starter payment, then the same body sent 9 more times. Credits added = 500 × 10 = **5 000** for ₹199. The `Payment` row still looks normal (one row, `paid`), so nothing in the database shows the fraud. See [S3](../08-known-issues-and-improvements.md#s3).
