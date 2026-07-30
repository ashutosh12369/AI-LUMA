# Section 3 — Microservices Deep Dive

## 26. Explain Gateway Service.
The Gateway Service is the central entry point for the frontend. Built with Express and `express-http-proxy`, its sole responsibility is routing incoming external HTTP requests to the correct internal microservice based on the URL path (e.g., `/api/auth` -> Auth Service, `/api/agent` -> Agent Service). It acts as a shield, hiding the internal architecture, and is the ideal place to implement global rate-limiting, CORS, and logging.

## 27. Explain Auth Service.
The Auth Service handles identity management. It is responsible for user registration, login, password hashing (e.g., bcrypt), and issuing JSON Web Tokens (JWTs). It interacts with the User collection in MongoDB. By isolating Auth, we ensure that sensitive operations involving passwords and token generation are kept completely separate from the heavy computational loads of the AI agents.

## 28. Explain Agent Service.
The Agent Service is the "brain" of AI-LUMA. It does not handle user sessions or chat history directly; instead, it receives a prompt and context, and executes AI workflows. It leverages LangGraph to implement a Supervisor pattern with conditional edges. The Supervisor analyzes the query and routes it to specialized sub-agents (Code, Search, Image Gen, PPT). For RAG tasks, it interfaces with Qdrant vector database. It uses OpenRouter and Groq to access various LLMs at high speeds (LPUs).

## 29. Explain Chat Service.
The Chat Service acts as the conversational memory manager. When a user chats, this service handles storing and retrieving the conversation history. Because LLM context windows are limited and expensive, the Chat Service uses a Redis (Upstash) sliding window to cache only the last 20 messages for ultra-fast retrieval, while permanently persisting the full conversation in MongoDB. It acts as the intermediary, fetching context, sending it to the Agent Service, and storing the response.

## 30. Explain Billing Service.
The Billing Service manages subscriptions and payments. It integrates with Razorpay to generate checkout sessions and, crucially, listens for Razorpay webhooks (e.g., `payment.captured`). It validates these webhooks using HMAC SHA256 signatures to ensure authenticity. To prevent race conditions (where multiple simultaneous webhooks might credit a user multiple times), it uses MongoDB's atomic `$inc` operator and tracks processed webhook IDs for idempotency.

## 31. Why separate Chat and Agent services?
Separation of concerns and scalability. The Chat Service is heavily I/O bound (reading/writing to Redis and MongoDB). The Agent Service is computationally and memory intensive (managing LangChain instances, running LangGraph nodes, embedding data). If they were combined, a surge in complex AI queries could block the event loop and prevent users from even loading their past chat histories. Separating them allows us to scale the Agent Service instances heavily while keeping the Chat Service lean.

## 32. Why separate Billing from Auth?
While Auth handles *who* the user is, Billing handles *what they paid for*. Billing integrations (like Razorpay webhooks) introduce complex, highly critical logic and third-party dependencies. If the Billing service crashes due to an unhandled webhook error or a Razorpay API change, users should still be able to log in (Auth) and use their free tier. Security-wise, minimizing the code that has access to payment credentials is a best practice.

## 33. Which service has the highest traffic?
The **Gateway Service** has the highest traffic because 100% of frontend requests pass through it. After the Gateway, the **Chat Service** typically sees the highest traffic, as every user prompt, history retrieval, and session update hits it.

## 34. Which service is most CPU intensive?
The **Agent Service**. Managing LangGraph execution states, formatting dense prompts, parsing outputs for conditional edge routing, handling vector embeddings for Qdrant, and managing WebSocket/HTTP streams with LLM providers (Groq/OpenRouter) requires significant CPU and memory overhead compared to standard CRUD operations.

## 35. Which service is most latency sensitive?
The **Gateway Service** and **Auth Service** (for initial load). However, in terms of user experience, the **Agent Service** is critical. Since LLM generation is inherently slow, any additional latency in our Agent Service's routing logic or vector DB querying (Qdrant) will compound and result in a poor UX. Using Groq (LPU) mitigates LLM latency, so our internal architecture must match that speed.

## 36. Which service stores conversations?
The **Chat Service**. It stores ephemeral/recent context in Redis (Upstash) via a sliding window (last 20 messages) for fast LLM context building, and it stores the complete, permanent conversation history in MongoDB.

## 37. Which service talks to LLMs?
The **Agent Service**. It holds the integration keys for Groq and OpenRouter. It contains the LangChain/LangGraph logic required to format prompts, handle tool calling, and parse the raw LLM responses back into structured data for the platform.

## 38. Which service validates JWT?
Technically, **all backend services** (except the Gateway) that protect private routes validate the JWT. The Gateway proxies the `Authorization` header. The receiving service (e.g., Chat or Billing) runs a lightweight middleware that uses the shared JWT secret to verify the signature locally before processing the request. This avoids making a network call to the Auth service for every single request.

## 39. Which service handles subscriptions?
The **Billing Service**. It communicates with Razorpay, validates the HMAC SHA256 signatures of incoming webhooks, updates the user's subscription status, and manages tier allocations in the database safely using atomic operators.

## 40. Which service is easiest to scale?
The **Gateway Service** and **Auth Service**. They are completely stateless. They rely entirely on the DB or JWTs for state, meaning you can spin up 100 instances of the Gateway or Auth behind a load balancer, and they will operate perfectly without any synchronization issues.

## 41. Which service is hardest to scale?
The **Agent Service** and to some extent the **Chat Service**. The Agent Service might manage long-running workflows or maintain state temporarily during a complex LangGraph execution. The Chat Service relies on Redis for state; scaling it requires ensuring that Redis itself doesn't become a bottleneck and that cache-invalidation strategies remain consistent across multiple Chat instances.

## 42. Can services have independent databases?
Yes, in a strict microservices pattern, they *should*. While they might share the same MongoDB *cluster* to save costs on the free tier, they should use logically separated collections (or entirely different databases). Auth owns `users`, Chat owns `conversations`, Billing owns `transactions`. They should not perform cross-collection `.populate()` joins. If Chat needs user data, it uses the JWT payload or makes an HTTP request to the Auth service.

## 43. What if Chat Service crashes?
Users will not be able to load their conversation histories, create new chats, or send messages, because the Gateway will return 502/504 errors for `/chat` routes. However, users can still log in (Auth), manage subscriptions (Billing), and the UI will continue to function (though it will display error states for chat components).

## 44. What if Billing crashes?
Existing premium users can continue to use the AI services because their subscription status is already verified (often cached in the JWT or the local DB replica). However, new users will not be able to upgrade, and Razorpay webhooks will fail (though Razorpay automatically retries webhooks, so no data is permanently lost once the service recovers).

## 45. What if Gateway crashes?
This is a single point of failure (SPOF). If the Gateway crashes, the frontend cannot communicate with *any* backend service. All API calls will fail. To mitigate this, the Gateway must be deployed with high availability (multiple instances behind a cloud load balancer) and kept extremely lightweight to prevent memory leaks or blocking operations.
