# Section 7 — Backend (111–135)

**111. Why Node.js?**
Node.js was chosen for AI-LUMA primarily due to its non-blocking, event-driven architecture, which is highly efficient for I/O-bound operations. Since AI-LUMA relies heavily on proxying requests to external LLM providers (OpenRouter, Groq) and streaming responses back to the client, Node.js excels at managing thousands of concurrent connections with minimal overhead compared to thread-per-request models.

**112. Why Express?**
Express is lightweight, unopinionated, and has a massive ecosystem. It allowed us to quickly set up our microservices architecture (Gateway, Auth, Chat, Agent, Billing). For the Gateway service, `express-http-proxy` seamlessly integrates with Express to route traffic to the respective downstream microservices.

**113. Why REST APIs?**
REST APIs provide a standard, stateless, and cacheable mechanism for communication. In our microservices architecture, REST over HTTP(s) ensures that our frontend (React) and services communicate consistently. While streaming LLM responses use Server-Sent Events (SSE) or chunked transfer encoding, standard CRUD operations (Auth, Billing, History) are perfectly suited for REST.

**114. How are APIs structured?**
AI-LUMA uses an API Gateway pattern. The frontend only communicates with the Gateway service. The Gateway service uses `express-http-proxy` to route requests to the underlying microservices (Auth, Chat, Agent, Billing). Each microservice follows an MVC-like or route-controller-service pattern where the controller handles HTTP concerns and the service handles business logic.

**115. How is request validation done?**
Request validation is typically done at the microservice level using middleware libraries like Joi or Zod. This ensures that incoming payloads (e.g., chat messages, user registration data) meet the required schema before reaching the business logic layer, preventing malformed data errors and injection attacks.

**116. How are errors handled?**
We use a centralized error-handling middleware in Express. Custom error classes (e.g., `ValidationError`, `UnauthorizedError`) are thrown within the services. The central middleware catches these, formats a consistent JSON response containing a success flag and message, and ensures the correct HTTP status code is sent.

**117. How do you log errors?**
Errors are logged using a structured logging library like Winston or Pino. Logs include timestamps, request IDs for tracing across microservices, stack traces (in development), and contextual data. This is crucial for debugging production issues, especially given Render's cold start behaviors.

**118. How is authentication implemented?**
Authentication is handled by the dedicated Auth microservice. It issues JSON Web Tokens (JWT) upon successful login. The API Gateway often verifies the token or passes it to the downstream services, which validate the signature and extract user context (like user ID) to authorize actions.

**119. How are JWTs verified?**
JWTs are verified using a secret key (or public key in an asymmetric setup) stored securely in environment variables. A middleware function intercepts incoming requests, extracts the Bearer token from the Authorization header, and uses a library like `jsonwebtoken` to decode and verify the signature and expiration.

**120. How is authorization handled?**
Once the JWT is verified, the user's role and ID are attached to the `req` object. Services like Billing or Chat check this user context against the requested resource (e.g., ensuring a user can only fetch their own chat history or checking if they have an active premium subscription to access advanced models).

**121. What middleware have you written?**
Key custom middlewares include:
- **Auth Middleware**: Verifies JWTs and attaches user context.
- **Proxy Middleware**: Gateway routing using `express-http-proxy`.
- **Razorpay Webhook Verifier**: Uses HMAC SHA256 to validate the signature of incoming webhooks to ensure they genuinely came from Razorpay.
- **Error Handler**: Catches and formats errors.

**122. How do you secure APIs?**
APIs are secured through HTTPS, JWT-based authentication, CORS configuration to only allow our Vite/React frontend, rate limiting (via Upstash Redis) to prevent abuse, input validation, and secure webhook verification for sensitive routes like billing.

**123. How do you prevent abuse?**
Abuse prevention involves rate limiting via Redis, enforcing usage quotas stored in MongoDB, and implementing a sliding window approach for context limits. API keys to external providers (Groq, OpenRouter) are securely kept server-side and never exposed.

**124. Why Redis?**
Redis (specifically Upstash for serverless/managed deployments) provides extremely fast, in-memory data structures. It is essential for low-latency operations where hitting MongoDB would be a bottleneck.

**125. How is Redis used?**
In AI-LUMA, Redis is primarily used to cache chat history. We implement a sliding window of the last 20 messages. This ensures that the Agent service (using LangGraph/LangChain) can rapidly retrieve the conversational context for the LLM without querying the permanent MongoDB store on every interaction.

**126. How does rate limiting work?**
Rate limiting uses Redis to track the number of requests from a specific IP or User ID within a time window. If the count exceeds the defined threshold, the middleware immediately rejects the request with a 429 Too Many Requests status, protecting backend resources and controlling API costs.

**127. Why not store everything in memory?**
Node.js memory is volatile and limited. If a service restarts (common with Render's free tier cold starts), all in-memory data is lost. Furthermore, in a horizontally scaled microservice architecture, in-memory data is isolated to a specific instance, leading to state inconsistencies. Redis solves this by providing a shared, fast, persistent-capable external cache.

**128. How do you cache responses?**
We cache frequently accessed, static, or semi-static data. However, dynamic AI responses aren't typically cached entirely. We cache user context, recent chat history (sliding window), and perhaps generic configuration data.

**129. What data should never be cached?**
Highly sensitive personal data, passwords, billing tokens, and dynamic, non-repeatable operations (like a specific Razorpay transaction creation) should never be cached.

**130. How do you invalidate cache?**
Cache invalidation is typically handled using TTL (Time To Live) settings in Redis (e.g., expiring chat context after inactivity). Additionally, explicit cache deletion occurs when underlying data is updated (e.g., clearing a user's cached profile when they update their details).

**131. How do you handle concurrent requests?**
Node.js handles concurrent requests natively via the Event Loop. However, for critical sections like billing, we use atomic operations in MongoDB (like `$inc` for decrementing credits) to prevent race conditions when multiple concurrent requests try to deduct credits simultaneously.

**132. How do you ensure scalability?**
The microservices architecture inherently supports scalability. Each service (Gateway, Chat, Agent) can be scaled independently based on load. Using a stateless backend design with Redis for shared state and MongoDB for persistence ensures instances can be spun up or down freely.

**133. How do you deploy backend services?**
Services are deployed to Render. While Render's free tier introduces cold starts, the microservice separation ensures that only inactive services sleep. CI/CD pipelines automate the build and deployment process via GitHub integrations.

**134. How do you monitor backend health?**
Health check endpoints (`/health`) are implemented in every microservice. These endpoints verify connections to the database, Redis, and essential third-party APIs. Logs and Render's built-in metrics provide visibility into memory and CPU usage.

**135. How would you horizontally scale?**
To horizontally scale, I would deploy multiple instances of high-traffic microservices (like the Agent or Gateway) behind a load balancer. Because the services are stateless (relying on Upstash Redis for cache and MongoDB for data), adding more instances will linearly increase the capacity to handle concurrent users.
