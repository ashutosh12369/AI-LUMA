# 🚀 AI-LUMA: Ultimate Interview Masterclass

This document is your **cheat sheet** to completely dominate any technical interview discussing AI-LUMA. It covers the architecture, data flow, and advanced concepts you implemented.

---

## 1. The Elevator Pitch (What is AI-LUMA?)
**"AI-LUMA is a highly scalable, multi-agent AI workspace built on a Microservices architecture. It features a Supervisor-based AI routing system that delegates tasks to specialized agents (Coding, Vision, Data, etc.) and supports fully Autonomous workflows. The backend is powered by Node.js, Express, and LangGraph, while the frontend is a responsive React application."**

---

## 2. System Architecture: Microservices & API Gateway
AI-LUMA is NOT a simple monolithic app. It uses an enterprise-grade **Microservices Architecture**.

### Why Microservices?
*   **Separation of Concerns:** Each service has one responsibility. If the AI service crashes due to heavy load, the Auth and Chat services remain unaffected.
*   **Independent Scaling:** You can scale the heavy `Agent Service` independently from the lightweight `Auth Service`.

### The API Gateway Pattern
Instead of the frontend talking to 5 different servers, it talks to **ONE** server: The API Gateway.
*   **Role:** Acts as a reverse proxy using `express-http-proxy`.
*   **Authentication:** The Gateway verifies the JWT cookie. If valid, it extracts the user ID and passes it as a custom header (`x-user-id`) to the downstream microservices.
*   **Benefit:** Downstream services (like Chat or Agent) don't need to worry about JWT verification; they blindly trust the Gateway's `x-user-id` header. This is a massive flex in interviews!

---

## 3. The 5 Microservices
1.  **Gateway Service:** The entry point. Handles security, CORS, JWT parsing, and proxies requests.
2.  **Auth Service:** Handles Sign Up, Login, JWT generation, and manages User Credits.
3.  **Chat Service:** A CRUD service for storing Conversations, Messages, and Shared Artifacts in MongoDB.
4.  **Billing Service:** Integrates with **Razorpay** to handle payments and credit top-ups securely.
5.  **Agent Service (Core Engine):** The brain of the app. Powered by **LangGraph**, it handles the AI logic, tool calling, and autonomous loops.

---

## 4. AI Engine: LangGraph & The Supervisor Pattern
When an interviewer asks how the AI works, explain the **Supervisor Pattern**.

*   **The Flow:** When a prompt comes in, it doesn't go straight to a generic LLM. It hits the **Router Node (Supervisor)**.
*   **Routing:** The Supervisor evaluates the prompt and decides which specialized Agent is best suited (e.g., `CodingAgent`, `VisionAgent`, `PdfRagAgent`, `GitHubAgent`).
*   **Autonomous Mode:** If enabled, the prompt hits a **Planner Node**. The Planner breaks the goal into sub-tasks and loops through the agents until all tasks are completed, then returns the final output.

---

## 5. Database Architecture (MongoDB)
*   **Users:** Stores `email`, `hashed password`, `credits`, and `role`.
*   **Conversations:** Stores `userId`, `title`, and `isPinned`.
*   **Messages:** Stores `conversationId` (Foreign Key), `role` (user/assistant), `content`, and any generated `artifacts`.
*   *(Interview Tip: Mention that you used MongoDB because AI chat data is unstructured and flexible, making a NoSQL document database perfect for storing varying message sizes and artifacts).*

---

## 6. Pro Interview Questions & Master Answers

> [!IMPORTANT] 
> **Q: How do your microservices communicate with each other?**
> **Answer:** "They communicate synchronously via REST HTTP calls using Axios. For example, when the Agent Service answers a prompt, it makes an internal `axios.post` call to the Chat Service to save the message to MongoDB, and another call to the Auth Service to deduct user credits."

> [!TIP]
> **Q: How did you handle authentication across multiple services?**
> **Answer:** "I implemented an API Gateway. The Gateway extracts the JWT from HTTP-only cookies, verifies the signature, and injects the user's ID into a custom header (`x-user-id`). It then forwards the request. This keeps my downstream services completely stateless and decoupled from authentication logic."

> [!WARNING]
> **Q: What was the biggest technical challenge you faced, and how did you solve it?**
> **Answer:** "Handling cold starts and proxying `multipart/form-data` in a microservices environment. 
> 
> *Challenge 1 (Proxy Bug):* When sending image files to the AI, the Gateway's proxy was corrupting the multipart boundary because it was trying to parse the body. I solved this by configuring `express-http-proxy` with `parseReqBody: false`, turning the gateway into a pure transparent TCP pipe.
> 
> *Challenge 2 (Cold Starts):* Because the services were deployed on free tiers, they would go to sleep. I implemented a robust **Auto-Retry Axios Interceptor** on the frontend. If it detects a 502 Bad Gateway (Server Sleep timeout), it silently catches the error, waits 12 seconds, and retries in the background. The user just sees a loading spinner instead of a crash."

> [!NOTE]
> **Q: Why use LangGraph instead of standard LangChain?**
> **Answer:** "Standard LangChain chains are linear (Step A -> Step B). LangGraph allows for cyclical graphs and state machines. I needed this cyclical capability for my **Autonomous Mode**, where the AI can loop back and forth between a Planner and an execution agent until a complex task is fully solved."

---

## 7. Data Flow (Request Lifecycle)
Memorize this flow for when they ask "What happens when I click send?":
1. Frontend creates a `FormData` object (text + optional files) and `axios` POSTs it.
2. Request hits the **API Gateway**.
3. Gateway `protect` middleware verifies JWT, adds `x-user-id: 123` header.
4. Gateway proxies raw stream to **Agent Service**.
5. Agent Service `multer` parses the multipart form.
6. Agent Service runs LangGraph Router -> Specialized Agent.
7. Agent generates response.
8. Agent Service calls **Chat Service** internally to save the message.
9. Agent Service calls **Auth Service** internally to deduct 1 credit.
10. Agent Service returns JSON to Gateway, Gateway returns to Frontend.
11. Frontend updates Redux/State and renders the UI.
