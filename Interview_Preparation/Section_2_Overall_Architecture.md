# Section 2 — Overall Architecture

## 11. Explain the complete architecture.
The architecture is a modern, decoupled microservices ecosystem.
- **Frontend:** React, Vite, Redux Toolkit, and Tailwind CSS. It communicates with the backend via Axios, which includes an interceptor for auto-retrying failed requests (to handle 502 cold starts on Render). Hosted on Vercel.
- **Backend (Microservices):** Built with Node.js and Express. There are 5 distinct services:
  1. **Gateway Service:** The single entry point utilizing `express-http-proxy` to route requests.
  2. **Auth Service:** Manages user registration, login, and JWT issuance.
  3. **Chat Service:** Manages conversation metadata and historical context, heavily utilizing Redis (Upstash) for caching recent messages.
  4. **Agent Service:** The AI engine. Uses LangGraph (Supervisor pattern) and LangChain to route queries to specialized agents (Code, PDF RAG, etc.), interfacing with Groq, OpenRouter, and Qdrant (Vector DB).
  5. **Billing Service:** Handles Razorpay integrations, webhook processing, and subscription tiers.
- **Data Layer:** MongoDB (via Mongoose) serves as the primary persistent database for all services. Redis handles ephemeral, fast-access state (chat history sliding window). Qdrant handles high-dimensional vector embeddings for RAG.

## 12. Walk me through a request from frontend to response.
Let's take a user asking a question in a chat:
1. **Frontend:** User hits "Send". React dispatches a Redux action. Axios sends a POST request with the user's JWT token to the Gateway Service (e.g., `api.ai-luma.com/chat/message`).
2. **Gateway:** The Gateway intercepts the request. It does not validate the JWT itself but proxies the request to the `Chat Service` based on the `/chat` route using `express-http-proxy`.
3. **Chat Service:** Receives the request. It extracts the JWT, verifies the user's identity (perhaps by decoding the JWT locally using a shared secret or calling Auth if strictly needed), and fetches the last 20 messages from the Redis cache to build the context window.
4. **Agent Service Interaction:** The Chat Service forwards the user's prompt + Redis context to the **Agent Service**.
5. **Agent Execution:** The LangGraph Supervisor evaluates the prompt. If it's a general query, it handles it. If it asks about a PDF, it routes via conditional edges to the RAG Agent, which queries Qdrant, gets context, and generates a response via OpenRouter/Groq.
6. **Response Path:** The Agent Service returns the generated text to the Chat Service. The Chat Service updates the Redis cache (sliding window) and async saves to MongoDB.
7. **Gateway to Frontend:** The Chat service returns the HTTP response back through the Gateway to the Frontend, where Redux updates the UI.

## 13. Why did you choose microservices?
I chose microservices to ensure **separation of concerns, independent scalability, and fault isolation**. AI processing (Agent Service) is highly CPU/Memory intensive and requires different scaling metrics compared to the Billing Service, which handles low-frequency but highly critical transactional data. By separating them, I can scale the Agent Service independently without over-provisioning the Auth or Billing services. Furthermore, it allows for independent deployments—I can deploy an update to the LangGraph logic without risking downtime to user authentication.

## 14. Why not a monolith?
While a monolith would have been simpler to build initially, it becomes a bottleneck in an AI-heavy application. The Agent service holding heavy LangChain dependencies, vector DB clients, and long-running AI generation processes could block the Node.js event loop, causing delays in simple tasks like fetching user profile data or validating a webhook. A monolith also increases the blast radius; a crash in the experimental Image Gen agent would take down the entire application, including Billing.

## 15. How do your microservices communicate?
Currently, communication is primarily synchronous using HTTP REST over internal network routing (or via the Gateway). For example, the Chat service makes an HTTP POST request to the Agent service to process a prompt. (In a future iteration, I would implement an asynchronous message broker like RabbitMQ for non-blocking operations, such as Billing notifying Chat about a subscription upgrade).

## 16. Why an API Gateway?
An API Gateway acts as a reverse proxy and the single point of entry for the frontend client. It abstracts the complexity of the backend topology. The frontend only needs to know one URL (the Gateway URL). The Gateway handles routing requests to the appropriate underlying service based on the URL path. It also provides a centralized place to implement cross-cutting concerns like rate limiting, CORS configuration, and SSL termination.

## 17. What responsibilities does the Gateway have?
- **Request Routing:** Forwarding `/auth` to Auth Service, `/billing` to Billing Service, etc. using `express-http-proxy`.
- **Load Balancing:** (If configured) distributing requests among multiple instances of a service.
- **Cross-Origin Resource Sharing (CORS):** Handling pre-flight requests globally.
- **Rate Limiting/Throttling:** Protecting backend services from DDoS or abuse before the request reaches them.

## 18. What responsibilities should NOT belong to the Gateway?
The Gateway should be "dumb" when it comes to business logic. It should **not**:
- Connect to MongoDB or process database transactions.
- Contain AI orchestration logic.
- Execute heavy data transformations.
- Store state. It must remain stateless to scale horizontally easily.

## 19. How does the Gateway route requests?
It uses `express-http-proxy`. I have route definitions setup in the Express app. For example:
`app.use('/auth', proxy('http://auth-service:port'))`
`app.use('/chat', proxy('http://chat-service:port'))`
When a request comes in matching the prefix, the proxy strips/forwards the URL and streams the request payload directly to the target service.

## 20. How does authentication work across services?
We use stateless JSON Web Tokens (JWT). The Auth Service verifies credentials and issues a signed JWT containing the user's ID and roles. The frontend includes this JWT in the `Authorization: Bearer <token>` header of every subsequent request. When the Gateway routes the request to a microservice (e.g., Chat or Billing), that specific microservice contains middleware to verify the JWT signature using a shared secret. Since the token is self-contained, services don't need to ping the Auth Service continuously.

## 21. How do services identify users?
Through the decoded payload of the JWT. When the Gateway forwards a request, the receiving service's authentication middleware intercepts it, verifies the JWT signature, decodes it, and attaches the user payload (typically `req.user = { id: '123', role: 'pro' }`) to the Express request object. The service then uses `req.user.id` to query its own database collections or perform authorized actions.

## 22. How do services remain independent?
By strictly adhering to the database-per-service pattern (or at least logical separation of collections). The Auth Service "owns" the User collection, Chat owns Conversations, Billing owns Subscriptions. They do not do cross-database joins. If Chat needs user details, it relies on the data provided in the JWT or makes an explicit API call to Auth. They also have independent CI/CD pipelines and deployment environments on Render.

## 23. How does one service know another is available?
In the current HTTP-based synchronous model, services rely on environment variables defining the internal URLs of other services. If a service is unavailable, the HTTP request will time out or return a 5xx error. To handle this gracefully on the frontend, I implemented an Axios interceptor that automatically retries 502 Bad Gateway errors, which commonly occur during Render's cold starts when a service is spinning up. In a more advanced setup, I would use a Service Registry (like Consul or Eureka).

## 24. How would you deploy all services?
I utilize cloud PaaS providers. The Frontend is deployed to Vercel for fast edge CDN delivery. The backend microservices are deployed on Render as separate Web Services. Each service has its own repository (or a monorepo setup) connected to Render. Pushing code to the main branch triggers an automatic build and deployment of that specific container/service. Environment variables (like MongoDB URIs, JWT Secrets, API Keys for Groq/OpenRouter) are configured securely in the Render dashboard for each service.

## 25. What happens if one service goes down?
Because of microservices isolation, the system experiences graceful degradation rather than total failure. 
- If the **Agent Service** goes down, users can still log in (Auth), view their subscription (Billing), and see past chat history (Chat), but new AI queries will fail. 
- If **Billing** goes down, core chat functionality remains unaffected for existing users, though new upgrades might fail. 
- However, if the **Gateway** goes down, the entire application becomes inaccessible from the outside, which is why the Gateway must be kept lightweight, highly available, and easily scalable.
