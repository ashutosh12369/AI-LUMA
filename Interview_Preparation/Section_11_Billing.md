# Section 11 — Billing (186–195)

## 186. Why Razorpay?
Razorpay was chosen for AI-LUMA because it offers robust developer documentation, excellent support for Indian payment methods (UPI, cards, net banking), and seamless webhook integrations. It provides a highly customizable checkout experience and robust subscription management, which fits perfectly with our SaaS business model.

## 187. How does the payment flow work?
1. The user selects a plan on the React frontend.
2. The frontend calls the Billing microservice via the Gateway.
3. The Billing service calls the Razorpay API to create an `order` and returns the `order_id` to the frontend.
4. The frontend initializes the Razorpay Checkout widget using the `order_id`.
5. The user completes the payment.
6. Razorpay sends a webhook asynchronously to our Billing service to confirm the payment status.

## 188. How do you verify payments?
We never trust the frontend for payment confirmation. When Razorpay hits our webhook endpoint, it includes an `x-razorpay-signature` header. We use the Node `crypto` module to generate an HMAC SHA256 hash of the raw request body using our webhook secret. If our generated hash matches the header, the payment is verified as authentic.

## 189. What if payment succeeds but webhook fails?
If the webhook fails (e.g., due to a temporary server outage on Render), Razorpay's retry policy will attempt to resend it. Additionally, we implement a manual status check fallback. If a user returns to the app and their account hasn't updated, the frontend can request the Billing service to actively query the Razorpay API for the specific `order_id` status and update the database accordingly.

## 190. How are subscriptions managed?
We utilize Razorpay's Subscriptions API. We define 'Plans' in Razorpay and map them to our application tiers (e.g., Pro, Enterprise). When a user subscribes, a Razorpay subscription entity is created. Webhooks (like `subscription.charged` or `subscription.halted`) keep our MongoDB database in sync with the user's active billing status.

## 191. How do you upgrade a plan?
When a user upgrades, we call the Razorpay API to update their existing subscription to the new Plan ID. Razorpay handles the proration logic automatically based on our configuration. Once the upgrade charge is successful, a webhook notifies our Billing service to update the user's tier and token/credit limits in MongoDB.

## 192. How do you cancel a subscription?
Cancellation is handled by sending a cancellation request to the Razorpay Subscriptions API. We typically cancel the subscription at the end of the current billing cycle. The webhook `subscription.cancelled` will eventually fire, at which point we downgrade the user's permissions in the Auth/Billing databases.

## 193. How do you prevent duplicate payments?
We ensure idempotency. Each order created has a unique ID, and our webhook handler checks if an order has already been processed before updating the database. Crucially, when updating user credits upon payment, we use MongoDB's `$inc` operator. This atomic operation prevents race conditions that could occur if multiple webhooks for the same event arrive simultaneously, ensuring credits are strictly added once.

## 194. How do you handle refunds?
Refunds are typically initiated through a secure admin dashboard that communicates with the Billing service. The service calls the Razorpay Refunds API for the specific `payment_id`. Upon success, we log the refund and adjust the user's account status or credits accordingly, and a webhook confirms the refund processing.

## 195. How do you secure billing APIs?
Billing APIs are secured at multiple levels:
1. **Authentication**: All endpoints require a valid JWT.
2. **Authorization**: Only users with an 'Admin' role can access global billing stats or issue refunds.
3. **Webhooks**: Strictly verified using HMAC SHA256 signatures.
4. **Validation**: Strict schema validation ensures prices or IDs cannot be tampered with in request bodies.
