# Section 4: Multi-Agent System (Questions 46-70)

### 46. What is an AI agent?
An AI agent is a specialized AI program that uses a Large Language Model (LLM) as its reasoning engine to determine what actions to take, and uses external tools to perform those actions. In AI-LUMA, agents are designed to execute specific tasks, such as generating code, parsing documents, or searching the web, by autonomously planning steps and leveraging APIs.

### 47. What is a multi-agent system?
A multi-agent system (MAS) is an architecture where multiple specialized agents collaborate to solve complex problems. Instead of relying on a monolithic system, AI-LUMA breaks down user requests into specialized tasks. A central component coordinates these agents, ensuring the right expert handles the right part of the workflow.

### 48. Why not use one LLM?
A single LLM approach struggles with context bloat, hallucination, and conflicting instructions when trying to handle everything from coding to image generation. By using a multi-agent system, AI-LUMA gives each agent a focused system prompt, specific tools, and the most suitable model (e.g., Groq for speed, a reasoning model for coding), resulting in higher accuracy and modularity.

### 49. What agents have you implemented?
In AI-LUMA, I've implemented a suite of agents: Chat, Search, Coding, Vision, Document Parsing (PDF RAG), PPT Generator, PDF Generator, and CSV Visualization agents. These are coordinated by a central Supervisor Agent using LangGraph.

### 50. Explain Chat Agent.
The Chat Agent is the generalist agent in AI-LUMA. It handles standard conversational queries, chit-chat, and basic factual questions. It leverages a sliding window of 20 messages cached in Redis (Upstash) to maintain conversational context without exceeding token limits.

### 51. Explain Search Agent.
The Search Agent specializes in retrieving real-time information from the web. When the user asks for up-to-date data, the Supervisor routes the request here. It uses search APIs as tools and synthesizes the search results into a concise answer.

### 52. Explain Coding Agent.
The Coding Agent is optimized for writing, debugging, and explaining code. It uses models strong in reasoning (accessed via OpenRouter) and is given system prompts tailored for software development. It formats outputs in markdown blocks and can iteratively refine code.

### 53. Explain Vision Agent.
The Vision Agent uses multimodal LLMs to analyze and describe images. When a user uploads an image, the Vision Agent receives the image context and can extract text, identify objects, or answer questions based on the visual input.

### 54. Explain Document Parsing Agent.
This agent handles PDF RAG (Retrieval-Augmented Generation). It uses LangChain for document loading and chunking, embeds the text, and stores it in Qdrant Vector DB. When queried, it performs semantic search on Qdrant and generates answers strictly grounded in the document context.

### 55. Explain PPT Generator.
The PPT Generator is specialized in structuring presentations. It plans the slides, generates content for each slide, and interfaces with a library (like `pptxgenjs` or a backend python script) to compile the content into a downloadable `.pptx` file.

### 56. Explain PDF Generator.
Similar to the PPT Generator, the PDF Generator takes a prompt, structures a well-formatted document (e.g., reports, summaries), and uses HTML-to-PDF conversion or specialized libraries on the backend to return a downloadable PDF file.

### 57. Explain CSV Visualization Agent.
This agent analyzes CSV data. It first generates a statistical summary, then decides on the best chart type (bar, line, pie), and outputs structured JSON data that the React/Recharts frontend can render natively as interactive visualizations.

### 58. Explain Auto Mode.
Auto Mode is a feature where the Supervisor Agent automatically decides which specialized agent should handle the user's prompt based on intent classification. The user doesn't need to manually select a tool; the system routes the request intelligently.

### 59. Explain Auto Pilot.
Auto Pilot represents an advanced agentic loop where an agent or a set of agents autonomously execute a multi-step task without constant user intervention. It can plan, execute tools, evaluate the output, and iteratively correct itself until the goal is met.

### 60. What is the Supervisor Agent?
The Supervisor Agent is the central orchestrator built using LangGraph. It doesn't perform the tasks itself; instead, it acts as a router. It evaluates the user's query, considers the conversation history, and decides which specialized worker agent to invoke.

### 61. How does the Supervisor work?
The Supervisor uses an LLM to analyze the input and outputs the name of the next agent to call. In LangGraph, the Supervisor is a node connected to worker nodes via conditional edges. Once a worker finishes, control returns to the Supervisor or ends the graph, depending on the workflow.

### 62. How does the Supervisor choose an agent?
The Supervisor is prompted with a list of available agents and their descriptions. It uses function calling or structured output (e.g., JSON) to reliably output the specific agent name that best matches the intent of the user's prompt.

### 63. Can multiple agents work together?
Yes, using LangGraph, agents can work sequentially. For example, the Search Agent can gather information, pass it to the Coding Agent to write a script based on that information, and then return the final result.

### 64. How do agents communicate?
Agents communicate through the LangGraph State. The State is a shared object (usually a dictionary containing the message history and context) that is passed from node to node. When an agent finishes, it appends its response to the State.

### 65. How do agents share context?
Context is shared via the centralized State object in LangGraph. As the execution flows through the graph, each agent reads the current State, performs its task, and updates the State, allowing downstream agents to see the accumulated context.

### 66. How do agents remember previous steps?
Within a single execution, LangGraph's State maintains the steps. Across the broader conversation, AI-LUMA uses Redis (Upstash) to cache a sliding window of the last 20 messages, injecting this history into the context before the graph execution begins.

### 67. How do you prevent unnecessary agent execution?
The Supervisor's system prompt strictly instructs it to route to the 'FINISH' node when the user's request has been fulfilled. Additionally, conditional edges ensure that only the selected agent is invoked.

### 68. What if the Supervisor chooses the wrong agent?
If an incorrect agent is chosen, it might fail to complete the task or return an irrelevant response. AI-LUMA mitigates this through highly specific tool descriptions for the Supervisor. If a worker fails, LangGraph can be configured to route back to the Supervisor with an error message to try an alternative approach.

### 69. Can an agent call another agent?
While hierarchical setups allow this, AI-LUMA primarily uses the Supervisor pattern. Workers return their output to the Supervisor (or the main graph state), and the Supervisor decides if another agent needs to be called, keeping the orchestration clean and preventing cyclic loops.

### 70. How would you add a new agent?
Adding a new agent involves three steps:
1. Create the worker agent node using LangChain/LangGraph.
2. Add the agent's name and description to the Supervisor's system prompt so it knows when to route to it.
3. Add a conditional edge in the LangGraph definition mapping the Supervisor's output to the new worker node.
