# Section 6: LLM Integration (Questions 91-110)

### 91. Which LLMs have you integrated?
In AI-LUMA, I've integrated models from Groq (Llama 3, Mixtral), Gemini (Google), DeepSeek, and various models accessed via OpenRouter to provide a flexible and powerful AI backend.

### 92. Why multiple LLM providers?
Using multiple providers prevents vendor lock-in, increases reliability (fallback options if one provider goes down), and allows us to use the best model for a specific task. For example, we use Groq for ultra-low latency tasks and DeepSeek/Gemini for heavy reasoning or coding.

### 93. Why Gemini?
Gemini is integrated for its strong multimodal capabilities, particularly for the Vision Agent, and its generous context windows which are useful for processing large documents in the PDF RAG system.

### 94. Why Groq?
Groq is used because of its LPU (Language Processing Unit) architecture, which provides incredibly fast inference speeds. We use Groq for the Supervisor Agent to ensure routing decisions happen in milliseconds, reducing the overall latency of the multi-agent system.

### 95. Why DeepSeek?
DeepSeek (e.g., DeepSeek Coder) provides exceptional performance for coding tasks and logical reasoning at a highly cost-effective price point. It is the primary engine for our Coding Agent.

### 96. Why OpenRouter?
OpenRouter acts as an aggregator. Instead of managing dozens of API keys and separate integrations, OpenRouter provides a unified API endpoint to access a vast array of open-source and proprietary models. This simplifies the Agent microservice architecture.

### 97. Which model is fastest?
Models hosted on Groq (such as Llama 3 8B) are the fastest due to their specialized hardware (LPUs), achieving hundreds of tokens per second.

### 98. Which model is cheapest?
Smaller open-source models accessed via OpenRouter or Groq (like Llama 3 8B or certain Mistral variants) are highly cost-effective. DeepSeek is also known for aggressive pricing while maintaining high reasoning quality.

### 99. Which model gives best reasoning?
For heavy reasoning and coding, large models like DeepSeek Coder V2, GPT-4o (via OpenRouter), or Claude 3.5 Sonnet (via OpenRouter) provide the best logical deduction and zero-shot capabilities.

### 100. How do you select the model?
Model selection is handled at the agent level. The Agent microservice initializes different LangChain `ChatModels` for different nodes. The Supervisor uses Groq for speed, the Vision agent uses Gemini, and the Coding agent uses OpenRouter/DeepSeek.

### 101. Do users choose the model?
While Auto Mode handles model selection under the hood by routing to specialized agents, AI-LUMA can also expose a UI dropdown allowing advanced users to manually select their preferred model for standard chat interactions.

### 102. How do you handle API failures?
API failures are handled gracefully using LangChain's built-in fallbacks. If a primary model fails, the system can automatically retry with a secondary model. On the network side, the frontend Axios interceptor automatically retries 502 errors.

### 103. What if Gemini is unavailable?
If Gemini is unavailable, the backend microservice catches the error and can fall back to using an alternative multimodal model via OpenRouter, ensuring the Vision Agent remains functional.

### 104. What if rate limits are exceeded?
We implement exponential backoff on the backend to handle 429 Too Many Requests errors. To mitigate hitting limits, we distribute traffic across multiple providers (Groq, OpenRouter, Gemini) and monitor usage.

### 105. How do you handle timeouts?
Timeouts are managed by setting strict timeout configurations on the backend Axios/fetch clients communicating with LLM APIs. If a timeout occurs, a fallback model is triggered, or a user-friendly error is returned immediately rather than hanging indefinitely.

### 106. How do you normalize responses?
LangChain standardizes responses via its `BaseMessage` and `ChatGeneration` classes. Regardless of whether the response comes from Groq, Gemini, or OpenRouter, the output is parsed into a unified format before being sent to the React frontend.

### 107. How do you manage API keys?
API keys are strictly managed as environment variables (`.env`) in the backend microservices. They are never exposed to the React frontend. The Express servers inject these keys securely when initializing the LangChain models.

### 108. How do you control AI costs?
Costs are controlled by using Redis caching to prevent redundant API calls, using cheaper/faster models (Groq) for routing and simple tasks, and restricting token limits. The Billing microservice (Razorpay) ensures users are charged appropriately for premium model usage.

### 109. How do you reduce latency?
Latency is minimized through several strategies:
1. Using Groq for the Supervisor Agent.
2. Streaming responses via Server-Sent Events (SSE) to the frontend.
3. Caching recent context in Redis (Upstash) to avoid querying MongoDB on every turn.
4. Using lightweight system prompts where possible.

### 110. How do you monitor model performance?
We can integrate tools like LangSmith or Helicone to trace LLM calls. These tools log latency, token usage, cost, and output quality, allowing us to identify bottlenecks in the LangGraph execution and optimize prompts.
