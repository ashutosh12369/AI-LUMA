# Section 13 — Production & DevOps (211–225)

## 211. How do you deploy this project?
The React frontend is deployed on Vercel, which provides a fast global CDN and automatic CI/CD from GitHub. The Node.js backend microservices are deployed on Render. We configure Render to pull from specific branches, install dependencies, and run the Express servers. The databases (MongoDB, Redis, Qdrant) are hosted on their respective managed cloud providers.

## 212. Have you containerized it? Why Docker?
Yes, the backend microservices can be containerized using Docker. We use Docker to ensure environment parity across development, staging, and production. A `Dockerfile` encapsulates the Node.js runtime, dependencies, and code, eliminating the "it works on my machine" problem and making it easy to deploy to any cloud provider supporting containers.

## 213. How would you use Kubernetes?
Kubernetes would be used to manage our containerized microservices at scale. It would handle service discovery (routing traffic between Gateway, Auth, Chat, etc.), automatic load balancing, self-healing (restarting failed pods), and scaling deployments up or down based on resource usage metrics.

## 214. How do you manage environment variables?
In production, environment variables are securely injected into the runtime environment via the hosting provider's dashboard (Render/Vercel settings). They are never hardcoded. We also use validation libraries on app startup to ensure all required environment variables are present before the server boots.

## 215. How do you implement CI/CD?
We implement CI/CD using GitHub Actions. Upon a push or pull request to the `main` branch, the CI pipeline triggers. It installs dependencies, runs linters, and executes unit/integration tests. If all checks pass, the CD pipeline triggers deployments: Vercel automatically deploys the frontend, and we trigger Render deployment hooks for the backend services.

## 216. How do you monitor production?
We monitor production using platform dashboards (Render logs, Vercel analytics) and external observability tools. We track uptime, CPU/Memory usage, and set up alerts for elevated error rates or API downtime.

## 217. How do you collect logs?
Our Express apps use logging libraries like `Winston` or `Pino`. These format logs in JSON. In production, logs from all microservices are aggregated using a centralized logging solution (like Datadog, ELK stack, or Render's native log streams) so we can search and filter logs in one place.

## 218. How do you trace requests across services?
We implement distributed tracing. The API Gateway generates a unique `X-Request-ID` or trace ID and attaches it to the header of incoming requests. As the request is proxied to Auth, Chat, or Agent services, they log this trace ID. This allows us to track the complete lifecycle of a single user action across the distributed system.

## 219. How do you handle service discovery?
Currently, our API Gateway maps requests to static internal Render URLs for our microservices. In a more advanced Kubernetes setup, we would use K8s built-in DNS for service discovery, allowing microservices to communicate using internal service names (e.g., `http://auth-service:3000`) without hardcoding IPs.

## 220. How do you perform rolling updates?
Render handles zero-downtime deployments natively. It spins up a new instance with the updated code, waits for the health check endpoint to return 200 OK, and then seamlessly routes traffic from the old instance to the new one before shutting down the old instance.

## 221. How do you rollback a bad deployment?
If a bad deployment slips through CI, we can use the "Rollback" feature in Vercel and Render. This instantly reverts the active environment to point to the previous successful build artifact, minimizing downtime while we debug the issue locally.

## 222. How do you ensure high availability?
We ensure high availability by removing single points of failure. The frontend is on a CDN. Backend services are deployed with multiple instances behind a load balancer. Databases like MongoDB Atlas and Upstash Redis are inherently distributed and highly available with automated failover mechanisms.

## 223. How do you recover from failures?
We rely on automated backups and self-healing. MongoDB Atlas takes automated snapshots. If a microservice crashes, the container orchestration (Docker/Render) automatically restarts it. The frontend's Axios interceptor automatically retries failed 502/503 requests, masking brief recovery windows from the user.

## 224. What would you change for production at large scale?
At a massive scale, I would:
1. Migrate from Render to AWS (EKS) for finer granular control over Kubernetes.
2. Implement an asynchronous event-driven architecture using Kafka for non-blocking tasks.
3. Introduce a strict GraphQL or gRPC layer between microservices for typed, efficient communication.
4. Setup multi-region active-active deployment to reduce latency globally and survive region-wide outages.
5. Implement a robust Tiered Caching strategy using Redis Cluster and Edge computing.
