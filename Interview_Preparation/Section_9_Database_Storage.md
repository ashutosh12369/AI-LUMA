# Section 9 — Database & Storage (156–170)

**156. Which database do you use?**
AI-LUMA utilizes a polyglot persistence strategy.
1. **MongoDB**: The primary database for persistent data (Users, Billing, long-term Chat History).
2. **Redis (Upstash)**: An in-memory data store used for caching the sliding window of recent chat messages and rate limiting.
3. **Qdrant**: A specialized Vector Database used for storing document embeddings for the PDF RAG (Retrieval-Augmented Generation) feature.

**157. Why this database?**
- **MongoDB**: Its document-oriented, schema-less nature is perfect for storing varying structures of chat histories, user profiles, and transaction logs. Mongoose provides a robust modeling layer.
- **Redis**: Offers sub-millisecond read/write speeds, essential for retrieving conversational context before querying the LLM and for fast rate-limiting.
- **Qdrant**: Built specifically for high-performance vector similarity search, which is the core mechanism of semantic RAG.

**158. What data is stored?**
We store User Profiles, Authentication credentials (hashed), Billing Information (credits, Razorpay subscription details), Chat Sessions, Message Histories, System Prompts, and Vector Embeddings of uploaded documents.

**159. How are chats stored?**
Chats are stored permanently in MongoDB under a `Conversations` collection, with embedded or referenced `Messages`. However, active conversational context (the last 20 messages) is maintained in Redis as a List or sliding window to provide instantaneous access to the LangGraph Agent service.

**160. How are users stored?**
Users are stored in a MongoDB `Users` collection. This includes fields like `email`, `hashedPassword`, `role`, `creationDate`, and a reference to their `Billing` or `Credits` document.

**161. How are subscriptions stored?**
Subscriptions and billing credits are stored in MongoDB. When a Razorpay webhook is received and verified, we update the user's billing document. We use atomic operators like `$inc` to increment or decrement credits to prevent race conditions during concurrent usage.

**162. How are uploaded files stored?**
Uploaded files (like PDFs or Images) are typically pushed to an object storage service like AWS S3 or Cloudinary. The database only stores the URL reference to the file and metadata (like filename, upload date, and owner ID).

**163. How do you index data?**
In MongoDB, we create indexes on frequently queried fields. For instance, `userId` in the Conversations collection is indexed to quickly retrieve a user's chat history. In Qdrant, data is indexed using HNSW (Hierarchical Navigable Small World) algorithms for fast nearest-neighbor vector search.

**164. How do you optimize queries?**
Queries are optimized by:
1. Ensuring proper indexing in MongoDB.
2. Using `.lean()` in Mongoose for read-only queries to bypass hydration overhead.
3. Paginating large datasets (like full chat history) using limit and skip.
4. Utilizing the Redis cache to avoid hitting MongoDB entirely for active context.

**165. How do you handle large chat histories?**
Large chat histories are paginated in the frontend and backend. For the LLM context, passing the entire history is expensive and exceeds context windows. We utilize Redis to keep a sliding window of only the last 20 messages. Older messages are stored in MongoDB and can be fetched if the user scrolls up, but aren't sent to the LLM by default.

**166. How do you backup data?**
Database backups depend on the hosting provider. Managed services like MongoDB Atlas handle automated, continuous backups with point-in-time recovery. For vector databases and custom storage, scheduled snapshots are taken and stored in a secure secondary location like AWS S3.

**167. How do you restore data?**
Data restoration is performed using the management console of the database provider (e.g., MongoDB Atlas). In a disaster recovery scenario, a backup snapshot is deployed to a new or existing cluster, ensuring minimal downtime and data loss.

**168. What is database normalization?**
Normalization is the process of structuring a relational database to reduce data redundancy and improve data integrity. While MongoDB is a NoSQL database, we apply similar principles (like referencing a User document from a Conversation document rather than embedding the entire user profile in every chat) to prevent update anomalies.

**169. What consistency guarantees matter here?**
Eventual consistency is generally acceptable for chat messages. However, **Strong Consistency** is absolutely critical for the Billing service. When a user spends credits to generate an image or when Razorpay processes a payment, we must ensure atomic updates (using MongoDB's `$inc`) so that concurrent requests don't bypass credit limits or double-spend.

**170. How would you shard the database?**
If the database grows massively, we would shard MongoDB based on a shard key, likely `userId` or a `tenantId`. This distributes the data across multiple physical servers, ensuring that all chats and metadata for a specific user reside on the same shard, optimizing read/write performance for user-specific queries.
