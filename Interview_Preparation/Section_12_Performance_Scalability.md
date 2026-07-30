# Section 12 — Performance & Scalability (196–210)

## 196. Where is the bottleneck?
In AI-LUMA, the primary bottlenecks are typically LLM inference time and database I/O for RAG operations. External API calls to OpenRouter or Groq dictate the floor for response latency. Another bottleneck is cold starts on Render's free tier, which can delay the first request to a microservice.

## 197. How do you reduce latency?
We drastically reduce latency by routing inference through Groq, which utilizes LPUs (Language Processing Units) that are significantly faster than traditional GPUs. We also implement caching with Redis for chat history and frequent queries, and we stream responses back to the frontend (using Server-Sent Events or chunked responses) so the user perceives immediate feedback rather than waiting for the entire generation.

## 198. How do you reduce LLM cost?
We use OpenRouter to access a wide variety of models, allowing us to route simpler tasks to cheaper, open-weights models (like Llama 3 8B or Mixtral) and reserve expensive models (like GPT-4o or Claude 3.5 Sonnet) only for complex reasoning tasks. LangGraph's conditional routing helps make this dynamic. We also use caching to serve repeated queries without hitting the LLM.

## 199. How do you cache AI responses?
We use a two-tiered caching approach. For exact string matches of user prompts, we check Redis. If there's a hit, we return immediately. For semantic caching, we can query our Qdrant Vector DB to find if a highly similar question (e.g., > 95% cosine similarity) was asked recently, and return the cached answer to save API calls.

## 200. How do you scale to 100k users?
To handle 100k users, we would move off free tiers. We'd deploy our microservices on scalable infrastructure (like AWS ECS or EKS). We would scale out the Express nodes horizontally behind a Load Balancer. We would ensure MongoDB is running on a managed cluster (MongoDB Atlas) with replica sets to handle read-heavy traffic, and provision a dedicated Redis instance (like ElastiCache) for session and chat cache.

## 201. How do you scale to 1 million users?
At 1 million users, we'd need a robust distributed architecture. We would implement Kubernetes for auto-scaling based on CPU/Memory and custom metrics (like queue length). Database sharding in MongoDB would distribute write loads. We might introduce Kafka or RabbitMQ for asynchronous processing of non-critical tasks (like PDF indexing for RAG or generating PPTs). Global CDN (Cloudflare) would serve frontend assets and cache static API responses at the edge.

## 202. How would you load balance services?
Currently, our API Gateway routes traffic. At scale, we would use a Cloud Load Balancer (like AWS ALB or NGINX ingress in Kubernetes) placed in front of the API Gateway, and internal service meshes to load balance traffic between microservices (e.g., Gateway -> Chat Service).

## 203. How do you handle traffic spikes?
We handle traffic spikes using Redis-based rate limiting to prevent the system from being overwhelmed. The auto-retry interceptor in our Axios frontend gracefully handles 502/503 errors during temporary overload. At a platform level, auto-scaling groups would spin up new instances based on utilization metrics.

## 204. How do you optimize Redis?
Our Redis (Upstash) is optimized by storing only necessary data. We manage the chat history context window tightly; instead of storing infinite context, we keep a sliding window of the last 20 messages per session. We set explicit TTLs (Time To Live) on cached items to ensure stale data is evicted and memory footprint stays low.

## 205. How do you monitor latency?
We use Application Performance Monitoring (APM) tools. By integrating tools like Datadog or New Relic into our Node.js services, we can trace requests from the Gateway down to the Agent service. We monitor the P95 and P99 latency metrics of our LLM API calls and database queries.

## 206. How do you benchmark your APIs?
We use tools like `Apache JMeter`, `k6`, or `Artillery` to simulate concurrent users hitting our endpoints. We benchmark the API Gateway to see how many RPS (Requests Per Second) it can route, and benchmark the Agent service with mock LLM responses to test our backend logic under load without incurring API costs.

## 207. How would you improve throughput?
We improve throughput by ensuring our Node.js microservices are entirely asynchronous and non-blocking. For CPU-bound tasks (like parsing massive CSVs or generating images), we would offload them to background worker threads or separate queue-based consumer services so the main event loop remains free to serve incoming HTTP requests.

## 208. How do you prevent memory leaks?
We strictly avoid global variables for storing request-specific state. We ensure database connections are pooled and closed properly. We run Node.js with the `--inspect` flag in staging and take heap snapshots under load to identify objects that aren't being garbage collected, and we use tools like `pm2` to auto-restart instances if memory consumption crosses a threshold.

## 209. How would you optimize LLM calls?
We optimize LLM calls by fine-tuning the system prompts to be concise, reducing the input token count. For RAG, we optimize chunk sizes and use hybrid search (keyword + semantic) in Qdrant to retrieve only the most relevant top-K documents, preventing context window bloat and improving generation speed.

## 210. What metrics would you monitor?
I would monitor:
- Infrastructure: CPU, Memory usage, network I/O per microservice.
- Application: Request error rates (4xx, 5xx), P95 Latency, RPS.
- Business: LLM token usage, API cost per user, successful payment rates.
- AI: Generation time, RAG retrieval latency, cache hit/miss ratio.
