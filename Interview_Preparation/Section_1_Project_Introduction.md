# Section 1 — Project Introduction

## 1. Explain your project.
AI-LUMA is a comprehensive multi-agent AI platform designed to consolidate multiple AI capabilities into a single, cohesive application. Built on a modern microservices architecture with Node.js and Express on the backend, and React/Vite on the frontend, it offers a suite of specialized AI agents. These include general chat, code generation, web search, PDF Retrieval-Augmented Generation (RAG), image and presentation generation, vision processing, and CSV data analysis. The core intelligence is orchestrated using LangGraph and LangChain, leveraging a Supervisor pattern to dynamically route tasks to the most appropriate specialized agent.

## 2. What problem does it solve?
Currently, users have to juggle multiple subscriptions and platforms for different AI tasks—ChatGPT for general chat, Claude for coding, Midjourney for images, and specialized tools for RAG or data analysis. AI-LUMA solves this fragmentation by providing an all-in-one ecosystem. It eliminates context switching, reduces subscription fatigue, and provides a unified interface where complex tasks spanning multiple domains (e.g., analyzing a CSV and then generating a presentation based on the data) can be handled seamlessly by specialized sub-agents working together under a supervisor agent.

## 3. Why did you build this project?
I built AI-LUMA to challenge myself with a complex, production-ready system that sits at the intersection of advanced AI engineering and scalable full-stack development. I wanted to move beyond simple CRUD apps and basic API wrappers to build a robust microservices architecture handling stateful AI interactions. It gave me hands-on experience with cutting-edge technologies like LangGraph for agentic workflows, Qdrant for vector search, Redis for high-speed caching, and handling real-world scenarios like concurrent billing webhook processing and cold-start mitigations on serverless platforms.

## 4. Who are the target users?
The primary target users are professionals, researchers, developers, and students who heavily utilize AI in their daily workflows but are frustrated by the fragmented ecosystem. This includes data analysts needing quick CSV insights, developers wanting code generation alongside architectural diagrams, and researchers needing to query long PDF documents without losing context.

## 5. What are the major features?
- **Specialized AI Agents:** Code, Web Search, PDF RAG (using Qdrant), Image Gen, PPT Gen, Vision, and CSV Data Analysis.
- **Supervisor Routing:** A LangGraph-powered supervisor that intelligently routes user queries to the correct specialized agent using conditional edges.
- **Microservices Architecture:** 5 distinct services (Gateway, Auth, Chat, Agent, Billing) ensuring decoupled, scalable, and maintainable code.
- **Robust Caching & State Management:** Redis (Upstash) sliding window cache (last 20 messages) for fast conversational context retrieval.
- **Secure Billing Integration:** Razorpay integration with HMAC SHA256 webhook signature validation and MongoDB `$inc` for race-condition prevention.
- **Resilient Frontend:** React frontend utilizing Redux Toolkit and an Axios interceptor configured for automatic 502 retries (crucial for handling Render cold starts).

## 6. Why is it called a multi-agent platform?
Unlike traditional LLM wrappers that rely on a single monolithic prompt or model to do everything, AI-LUMA utilizes multiple distinct "agents." Each agent has its own specific system prompt, tools, and sometimes underlying model (routed via OpenRouter or Groq for speed). A supervisor agent acts as a router, analyzing the user's intent and delegating the task to the specialized agent (e.g., the Code Agent or the RAG Agent). This separation of concerns at the AI level is what defines it as "multi-agent."

## 7. What makes it different from ChatGPT/Claude?
While ChatGPT and Claude are powerful general-purpose models, AI-LUMA is an orchestrated application layer built on top of multiple LLMs. 
1. **Model Agnosticism:** By using OpenRouter and Groq, AI-LUMA isn't tied to one provider; it can route tasks to the fastest or most capable model for a specific job (e.g., using LPU-powered Groq for rapid search routing, and a heavier model for complex coding).
2. **Specialized Agentic Workflows:** We use LangGraph to enforce specific workflows (like multi-step PDF parsing and vector retrieval) rather than relying purely on the LLM's internal reasoning.
3. **Custom Tooling Integration:** Native integrations for things like PPT generation or specialized CSV parsing that are tailored to the platform's UI/UX.

## 8. What were the biggest challenges?
- **Managing LLM Context Windows:** Keeping API costs down while maintaining conversational memory. I solved this by implementing a sliding window cache in Redis (Upstash) that keeps only the last 20 messages in high-speed memory.
- **Microservices Orchestration on Free Tiers:** Hosting on Render's free tier introduced significant cold-start issues resulting in 502 Bad Gateway errors. I mitigated this by implementing an Axios auto-retry interceptor on the frontend.
- **Race Conditions in Billing:** Handling Razorpay webhooks concurrently could lead to users being credited twice. I resolved this using MongoDB's atomic `$inc` operator and idempotent webhook processing.
- **LangGraph State Management:** Designing the state schema for the Supervisor pattern so that context could be passed between the user, the supervisor, and the sub-agents without state corruption.

## 9. Which feature are you most proud of?
I am most proud of the **LangGraph Supervisor Agent architecture integrated with Qdrant for RAG**. Building a conditional edge graph where a supervisor evaluates a query, decides it needs external knowledge, routes it to the RAG agent, which then queries Qdrant for vector embeddings, and finally synthesizes the response back to the user, was incredibly complex but highly rewarding. It truly demonstrates the power of agentic AI over simple API wrappers.

## 10. If given another month, what would you improve?
1. **Event-Driven Communication:** Currently, microservices communicate synchronously via the API Gateway. I would introduce a message broker like RabbitMQ or Apache Kafka for asynchronous, event-driven communication (e.g., Billing service emitting a "SubscriptionUpdated" event that Auth/Chat services consume).
2. **Enhanced Observability:** Implement a centralized logging and tracing system (like ELK stack or Datadog) to better trace requests as they propagate through the Gateway to backend services.
3. **WebSocket for Streaming:** Shift from HTTP-based polling/responses to WebSockets for real-time, low-latency streaming of LLM tokens and agent execution steps directly to the frontend.
