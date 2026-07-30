# Section 5: LangGraph & LangChain (Questions 71-90)

### 71. Why LangGraph?
LangGraph is essential for AI-LUMA's Agent Service because it allows for the creation of cyclical, stateful multi-agent workflows. Unlike standard linear chains, LangGraph models agent interactions as graphs, enabling complex loops, supervisor patterns, and reliable state management across agent turns.

### 72. Why LangChain?
LangChain provides the foundational abstractions for interacting with LLMs. It standardizes model inputs/outputs, handles prompt templating, integrates with vector databases (like Qdrant for our PDF RAG), and provides utility classes for document loading and chunking.

### 73. Difference between LangGraph and LangChain?
LangChain is a framework for building LLM applications, primarily focusing on linear pipelines (Chains) and standardizing integrations. LangGraph is an extension of LangChain specifically designed for building stateful, multi-actor, and cyclical applications using graph theory, which is necessary for complex agentic workflows.

### 74. What is a node?
In LangGraph, a node represents a function or an agent. It receives the current global State, executes its logic (e.g., calling an LLM or an API), and returns an updated State. In AI-LUMA, the Supervisor and the individual specialized agents (Chat, Code, Vision) are all nodes.

### 75. What is an edge?
An edge defines the execution flow between nodes. A standard edge dictates a direct transition from Node A to Node B. A conditional edge dynamically determines the next node based on the output of the current node (e.g., the Supervisor choosing which worker to call).

### 76. What is state?
The State is a shared data structure (often a typed dictionary) that gets passed along the nodes in LangGraph. It typically contains the conversation history, user query, and accumulated agent outputs. Nodes read from the State and return updates to it.

### 77. What is graph execution?
Graph execution is the process of traversing the defined nodes and edges starting from an entry point. LangGraph compiles the nodes and edges into a runnable application. Execution continues until a terminal node (like `END`) is reached.

### 78. How does conditional routing work?
In AI-LUMA, the Supervisor node outputs a decision (e.g., "route to CodingAgent"). A conditional edge uses a function to read this decision from the updated state and maps it to the corresponding node. If the decision is "FINISH", it routes to the `END` node.

### 79. How is memory maintained?
During graph execution, memory is maintained in the LangGraph State. Across different API calls, conversation history is maintained using Redis (Upstash). When a new request arrives, AI-LUMA fetches the sliding window of the last 20 messages from Redis and initializes the LangGraph State with them.

### 80. What is the execution flow?
The user sends a request to the Gateway -> Chat/Agent Microservice. The service fetches Redis history, initializes the LangGraph State, and invokes the graph. Execution starts at the Supervisor node, which uses conditional edges to route to a specialized worker. The worker updates the state, and execution finishes. The updated state is sent back to the user and saved to Redis/MongoDB.

### 81. Why not build orchestration manually?
Manual orchestration with standard `if/else` statements becomes unmanageable as the number of agents and complexity of workflows increase. LangGraph provides built-in persistence, cyclical loop handling, streaming support, and a visualization of the architecture, making the system scalable and robust.

### 82. How are loops handled?
LangGraph naturally supports cyclic graphs. A worker agent can route back to the Supervisor, creating a loop. A maximum recursion depth is configured to prevent infinite loops, throwing an error if the system gets stuck.

### 83. Can graphs execute in parallel?
Yes, LangGraph supports parallel execution. If multiple edges fan out from a single node without conditions, LangGraph can execute those target nodes concurrently. However, AI-LUMA primarily uses the Supervisor pattern where routing is typically sequential.

### 84. How are failures handled?
Failures within nodes can be caught using standard try-catch blocks. If a tool call fails, the node can append an error message to the State and route back to an LLM node to retry or ask for human intervention. The frontend also implements Axios auto-retry for 502 errors.

### 85. What are checkpoints?
Checkpoints (or Checkpointers in LangGraph) allow saving the state of the graph at every step. This enables features like "time travel" (reverting to a previous state) or Human-in-the-Loop (pausing execution to wait for user approval).

### 86. How does retry work?
At the LangGraph level, retry logic can be implemented by looping back to an agent if the output validation fails. At the network level, AI-LUMA handles transient issues using Axios interceptors that automatically retry 502 Bad Gateway errors.

### 87. What is the execution state?
Execution state refers to the exact values held in the LangGraph State schema at any given step. It includes `messages` (list of human, AI, and tool messages), `current_agent`, and potentially scratchpads for intermediate thoughts.

### 88. How do tools integrate?
Tools are integrated using LangChain's `@tool` decorator or `StructuredTool`. Agents are bound to these tools using `.bind_tools()`. When the LLM decides to use a tool, it outputs a tool call, and a dedicated ToolNode in the graph executes the actual function.

### 89. How are prompts passed?
System prompts are passed to the LLM during initialization or dynamically constructed within the node function by reading the State. The LangChain `ChatPromptTemplate` is used to format the system instructions along with the message history from the State.

### 90. How is conversation history managed?
Long-term storage uses MongoDB via Mongoose in the backend. For fast retrieval during active conversations, a sliding window of the latest 20 messages is cached in Redis using Upstash. The Gateway routes requests, and the Agent Service pulls this Redis cache to populate the LangGraph state.
