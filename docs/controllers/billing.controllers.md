# Billing controllers

**Code:** [billing.controller.js](../../backend/services/billing/controllers/billing.controller.js) · model: [payment.model.js](../../backend/services/billing/models/payment.model.js) · config: [plans.js](../../backend/services/billing/config/plans.js), [razorpay.js](../../backend/services/billing/config/razorpay.js) · routes: [billing.routes.md](../routes/billing.routes.md)

A **controller** is the function that does the real work for one route. By the time a controller runs, the router has already matched the URL and any middleware has already run. The controller reads the request, talks to the database or other services, and sends back **one** reply (a status code + JSON).

Billing has two controllers. `createOrder` asks Razorpay for an order and records it. `verifyPayment` checks Razorpay's signature, marks the record paid, and asks the auth service to add the credits.

**How to read "Takes":**

| Source | Meaning in this service |
|---|---|
| `req.body` | JSON sent by the browser. The gateway streams it untouched, and billing parses it with `express.json()` ([index.js:24](../../backend/services/billing/index.js#L24)). Billing runs Express 5, where `req.body` stays `undefined` if no JSON body was sent. Then `const { plan } = req.body` throws, and the catch returns **500**. |
| `req.params` / `req.query` | Not used by any billing controller. |
| `req.cookies` | Not used. `cookie-parser` is in `package.json` but never installed as middleware ([Q4](../08-known-issues-and-improvements.md#q4)). |
| auth user | `req.headers["x-user-id"]`, set by the gateway's `proxyWithUser` from the Redis session. Billing trusts it blindly, and billing's own URL is public ([S2](../08-known-issues-and-improvements.md#s2)). Only `createOrder` reads it. |
| file | None. |

Every function has its own `try/catch`, logs the error with `console.log`, and puts `error.message` in a `500` reply.

---

### `createOrder(req, res)`  *(login needed, checked at the gateway)*

| | |
|---|---|
| **What it does** | Looks up `PLANS[plan]`. If it doesn't exist, stops with 400. Otherwise calls `razorpay.orders.create({ amount: plan.amount * 100, currency: "INR", receipt: "receipt_" + Date.now() })`. Razorpay works in **paise**, so rupees × 100. Then saves a `Payment` row: `userId`, `orderId: order.id`, `amount` (in **rupees**), `credits`, `plan: plan.id`, `currency: order.currency`, `status: "created"`. |
| **Takes** | `req.body.plan` (`"free"`, `"starter"`, `"pro"`) from [billing.api.js](../../frontend/src/features/billing.api.js#L13-L16) · `x-user-id` header. |
| **Returns** | `200` + `{ success: true, order, plan }` (`order` is Razorpay's order object: `id`, `amount` in paise, `currency`, `receipt`, `status`, …; `plan` is the whole plan entry) · `400` + `{ success: false, message: "Invalid plan" }` · `500` + `{ success: false, message }` (Razorpay refused, e.g. the 0-paise `free` plan [F25](../08-known-issues-and-improvements.md#f25); Mongo failed; or a missing `x-user-id` fails the model's `required` rule). |

### `verifyPayment(req, res)`  *(login needed, checked at the gateway)*

| | |
|---|---|
| **What it does** | Makes `HMAC-SHA256(RAZORPAY_KEY_SECRET, order_id + "\|" + payment_id)` as hex and compares it with `!==` to the signature (not a constant-time compare). If they differ, 400. Then `Payment.findOne({ orderId })`; if none, 404. Sets `status = "paid"` and `paymentId`, saves, then calls `axios.patch("https://ailuma-auth-service.onrender.com/internal/update-plan", { userId, plan, credits })` with the values **from the Payment row**. It never checks that the row is still `created`, so the same body can be replayed for more credits ([S3](../08-known-issues-and-improvements.md#s3)). It never compares the row's `userId` with the caller. The row is `paid` before auth is called, with no retry ([S12](../08-known-issues-and-improvements.md#s12)). |
| **Takes** | `req.body`: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, i.e. the `response` object from the Razorpay popup's `handler` ([BillingDrawer.jsx:36-43](../../frontend/src/components/BillingDrawer.jsx#L36-L43)). It does **not** read `x-user-id`. |
| **Returns** | `200` + `{ success: true, message: "Payment verified successfully" }` (no new credits in the reply, [F19](../08-known-issues-and-improvements.md#f19)) · `400` + `{ success: false, message: "Payment verification failed" }` · `404` + `{ success: false, message: "Payment not found" }` · `500` + `{ success: false, message }` (auth unreachable or returned an error, Mongo failed, or `RAZORPAY_KEY_SECRET` missing so `createHmac` throws). |

### Inline health handler  *(in [index.js:41-46](../../backend/services/billing/index.js#L41-L46), not in the controller file)*

| | |
|---|---|
| **What it does** | Answers `GET /`. It is registered after the router, and still reached because the router has no `GET /`. |
| **Takes** | Nothing. |
| **Returns** | `200` + `{ success: true, message: "Billing Service Running" }`. |

---

## Helpers used by these controllers

| Helper | File | What it does | Takes → Returns |
|---|---|---|---|
| `razorpay` | [config/razorpay.js](../../backend/services/billing/config/razorpay.js) + `razorpay` SDK | One Razorpay client built from `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Calls `dotenv.config()` itself. | `orders.create({ amount, currency, receipt })` → order object, or throws |
| `PLANS` | [config/plans.js](../../backend/services/billing/config/plans.js) | A fixed table: `free` ₹0 / 100 credits, `starter` ₹199 / 500, `pro` ₹499 / 1000, each with `validity: 30`, which nothing reads (auth hard-codes 30 days). The prices are typed again in [BillingDrawer.jsx](../../frontend/src/components/BillingDrawer.jsx#L165-L187). | plan name → plan object or `undefined` |
| `Payment` | [models/payment.model.js](../../backend/services/billing/models/payment.model.js) | Mongoose model: `userId` (String, required), `orderId` (String, required, **no index, not unique** [Q5](../08-known-issues-and-improvements.md#q5)), `paymentId`, `amount`, `currency` (default `"INR"`), `credits`, `plan`, `status` (`created` / `paid` / `failed`, default `created`), plus `createdAt` / `updatedAt`. Nothing ever sets `failed`. | `create`, `findOne`, `save` → documents |
| `crypto.createHmac` | Node built-in | Makes the expected signature. The npm package `crypto` in `package.json` is an empty placeholder; `import crypto from "crypto"` loads Node's built-in module ([Q4](../08-known-issues-and-improvements.md#q4)). | key + message → hex string |
| `axios.patch` | `axios` | The call to auth's `/internal/update-plan`, at a hard-coded production URL ([F6](../08-known-issues-and-improvements.md#f6)). No timeout, no retry, no secret header ([S1](../08-known-issues-and-improvements.md#s1)). | URL + JSON → response, or throws on non-2xx |
| `connectDB` | [config/db.js](../../backend/services/billing/config/db.js) | `mongoose.connect(MONGO_URI or MONGODB_URL)`, called inside `app.listen`. Logs the error and carries on if it fails ([F31](../08-known-issues-and-improvements.md#f31)). | nothing → nothing |
| `CREDIT_COST` | [config/credits.js](../../backend/services/billing/config/credits.js) | A copy of auth's price table. **Nothing imports it** ([Q3](../08-known-issues-and-improvements.md#q3)). | – |

## Formulas

**Order amount** ([billing.controller.js:33-38](../../backend/services/billing/controllers/billing.controller.js#L33-L38)):

```
razorpay amount (paise) = plan.amount (rupees) × 100
```

*Worked example:* **Pro** → `499 × 100 = 49 900` paise = ₹499.00. The popup is opened with `amount: 49900`. The `Payment` row stores `amount: 499`. **Free** → `0 × 100 = 0` paise; Razorpay's minimum is ₹1 (100 paise), so the order fails with 500 ([F25](../08-known-issues-and-improvements.md#f25)).

**Payment signature** ([billing.controller.js:80-86](../../backend/services/billing/controllers/billing.controller.js#L80-L86)):

```
expected = hex( HMAC_SHA256( RAZORPAY_KEY_SECRET, razorpay_order_id + "|" + razorpay_payment_id ) )
valid    = expected === razorpay_signature
```

*Worked example (made-up key):* key `demo_secret`, message `order_ABC123|pay_XYZ789` → `1cc492f1ab2b70adb65c857a944c35b582b08530b140ad2c53a60de8fcbb2934`. The browser can't compute this without the key, so it can't fake a payment. But it **can** re-send a real one, which is the replay bug.

**Credits after N verify calls for one payment** (because of [S3](../08-known-issues-and-improvements.md#s3)):

```
credits added = plan.credits × N
```

*Worked example:* a user with 100 credits pays once for **Starter** (500 credits) and sends the same verify body 3 times in total. Auth runs `updatePlan` 3 times: `credits = 100 + 500 × 3 = 1600`, `totalCredits = 1600`, for ₹199. With the fix (atomic claim on `status: "created"`), calls 2 and 3 find no `created` row and add nothing: `credits = 600`.
