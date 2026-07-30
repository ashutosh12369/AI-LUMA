# Section 10 — Security (171–185)

## 171. How is authentication implemented?
In AI-LUMA, authentication is handled by the dedicated Auth microservice. We use standard JWT (JSON Web Token) based authentication. When a user logs in or signs up, the Auth service hashes the password using `bcryptjs`, stores the user record in MongoDB, and generates a JWT. This JWT contains the user ID and role. The token is sent to the client and included in the `Authorization: Bearer <token>` header for subsequent requests. The API Gateway intercepts all incoming traffic and validates this JWT before proxying the request to downstream services.

## 172. How is authorization implemented?
Authorization is implemented at the API Gateway level and within specific microservices. The Gateway decodes the JWT to extract user roles and permissions. It can block requests to protected endpoints (e.g., admin panels or billing configurations) if the user lacks the required role. Additionally, microservices perform resource-level authorization (e.g., the Chat service verifies that the `userId` in the JWT matches the owner of the requested chat history).

## 173. How do you secure JWTs?
We keep JWT expiration times short (e.g., 15-60 minutes) to minimize the window of opportunity if a token is compromised. For longer sessions, we implement a Refresh Token rotation strategy. We store the refresh token in an `HttpOnly`, `Secure`, and `SameSite=Strict` cookie to protect against Cross-Site Scripting (XSS) attacks. 

## 174. How do you store secrets?
During development, secrets (DB URIs, API keys for Groq/OpenRouter, JWT secrets) are stored in local `.env` files which are strictly added to `.gitignore`. In production on Render and Vercel, we use their built-in Environment Variables management systems. This ensures secrets are injected at runtime and never hardcoded in the repository.

## 175. How do you prevent API abuse?
We implement Rate Limiting at the API Gateway using Redis (Upstash). By tracking the IP address or User ID, we restrict the number of requests a user can make within a time window (e.g., 100 requests per 15 minutes). For AI inference endpoints, we apply stricter rate limits and deduct credits/tokens in the Billing service to prevent excessive cost accumulation.

## 176. How do you prevent prompt injection?
We prevent prompt injection in our LangGraph agent service by using strict System Prompts that clearly delineate instructions from user input. We use LangChain's built-in prompt templates to safely interpolate user input as variables rather than concatenating strings. We also employ input sanitization and optionally a lightweight LLM guardrail step to classify if the prompt contains malicious override instructions before passing it to the main generation model.

## 177. How do you validate user input?
We use schema validation libraries like `Zod` or `Joi` in Express middleware across our microservices. Every incoming request payload (body, query params) is validated against a predefined schema. If the data is invalid, the middleware immediately returns a 400 Bad Request with details, preventing malformed data from reaching the core business logic.

## 178. How do you prevent SQL/NoSQL injection?
Since we use MongoDB via Mongoose, we are protected against traditional SQL injection. To prevent NoSQL injection, Mongoose strictly enforces the schema types. Furthermore, we never blindly pass `req.body` or `req.query` into database queries. We specifically extract the required fields and sanitize them to prevent attackers from injecting MongoDB operators like `$ne` or `$gt` in the payload.

## 179. How do you prevent XSS?
Cross-Site Scripting (XSS) is mitigated primarily by our React frontend. React automatically escapes string variables in JSX, preventing arbitrary JavaScript execution. Additionally, we avoid using `dangerouslySetInnerHTML`. On the backend, we validate and sanitize all text inputs.

## 180. How do you prevent CSRF?
Since we use `Authorization: Bearer <token>` headers instead of relying solely on cookies for stateless API calls, we are naturally resilient to Cross-Site Request Forgery (CSRF). For any sensitive actions that might rely on cookies (like refresh tokens), we ensure the cookies are marked `SameSite=Strict`.

## 181. How do you handle CORS?
We configure Cross-Origin Resource Sharing (CORS) in our Express Gateway to only accept requests from our trusted frontend domains (e.g., our Vercel URL and `localhost` during development). We explicitly define allowed HTTP methods (GET, POST, PUT, DELETE) and headers to restrict cross-origin access.

## 182. How do you secure payment APIs?
Our Billing service integrates with Razorpay. To secure the webhook endpoints that Razorpay calls on payment success, we implement signature verification using HMAC SHA256. We generate a hash using the webhook payload and our secret key, and compare it against the `x-razorpay-signature` header. This guarantees the request legitimately originated from Razorpay.

## 183. How do you secure file uploads?
File uploads (like PDFs for RAG or images for vision) are secured by strictly validating the file extension and MIME type. We limit the maximum file size in our Express middleware (e.g., `multer`). Instead of saving files directly to the Node.js server, we process them in memory or upload them securely to cloud storage (like AWS S3) using presigned URLs, avoiding execution of malicious scripts.

## 184. How do you encrypt sensitive data?
Passwords are encrypted (hashed) using `bcrypt` with a secure salt round before storing in MongoDB. If we store sensitive user API keys (e.g., for custom BYOK setups), we use symmetric encryption like AES-256-GCM using Node's native `crypto` module, and store the initialization vector (IV) alongside the encrypted payload, keeping the master key securely in environment variables.

## 185. How would you perform a security audit?
I would start with static analysis using tools like `npm audit` or Snyk to check for vulnerable dependencies. I would review the architecture, ensuring all communication between microservices within the VPC is secure and external endpoints have proper auth. I would also perform dynamic testing, attempting basic OWASP Top 10 exploits (injection, broken auth) against the staging environment, and review logs to ensure no sensitive PII or secrets are being logged.
