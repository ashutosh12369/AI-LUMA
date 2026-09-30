# Agent controllers and graph nodes

**Code:** [agent.controller.js](../../backend/services/agent/controllers/agent.controller.js) · [agent index.js](../../backend/services/agent/index.js) (error handler) · graph: [supervisor.graph.js](../../backend/services/agent/graph/supervisor.graph.js), [state.js](../../backend/services/agent/graph/state.js), [router.node.js](../../backend/services/agent/graph/router.node.js), [planner.node.js](../../backend/services/agent/graph/planner.node.js) · nodes: [agents/](../../backend/services/agent/agents/chat.agent.js) · routes: [agent.routes.md](../routes/agent.routes.md) · overview: [05-agent-engine.md](../05-agent-engine.md)

A **controller** is the function that does the real work for one route. By the time it runs, the router has matched the URL and the middleware (here `multer`) has run. The controller reads the request, does the work, and sends back **one** reply (a status code + JSON).

The agent service has only **one** controller, `chat()`. Most of the real work happens in **graph nodes**. A graph node is a plain `async (state) => newState` function that LangGraph calls. It reads fields from the shared **state** object and returns the state with some fields changed. Every node here returns `{ ...state, ...changes }` (a full copy plus the changes).

**How to read "Takes":**

| Source | Meaning in this service |
|---|---|
| `req.body` | The text fields of the **multipart** form, parsed by `multer` ([agent.route.js:14](../../backend/services/agent/routes/agent.route.js#L14)). All values are **strings** (so `isAutonomous` is `"true"` or `"false"`). `express.json()` is also installed ([index.js:14](../../backend/services/agent/index.js#L14)) but does nothing for multipart bodies. |
| `req.file` | The uploaded file, if any: `{ fieldname, originalname, mimetype, path, size, ... }`. It is already saved on disk in `./temp` ([multer.js](../../backend/services/agent/config/multer.js)). |
| auth user | `req.headers["x-user-id"]`, set by the gateway from the Redis session. The service trusts it blindly ([S2](../08-known-issues-and-improvements.md#s2)). `x-github-token` comes from the browser's `localStorage` ([S9](../08-known-issues-and-improvements.md#s9)). |
| `req.params` / `req.query` | Not used. |
| state (for nodes) | The LangGraph state from [state.js](../../backend/services/agent/graph/state.js). Its fields: `prompt, conversationId, userId, agent, response, images, model, file, artifacts, searchResults, codeContext, pdfContext, githubToken, isAutonomous, taskPlan`. No field has a reducer, so **the last write wins**. `model`, `codeContext` and `pdfContext` are declared but **never used** by any node. |

**Errors:** `chat()` has one `try/catch` that calls `next(error)`. Some nodes throw (their errors reach the user as 429 / 400 / 500). Others catch everything and return a "Failed…" text with `200` ([F7](../08-known-issues-and-improvements.md#f7)). Each node below says which.

---

### `chat(req, res, next)`  *(login checked at the gateway)*

| | |
|---|---|
| **What it does** | Logs `req.body` and `req.file` to the console ([S11](../08-known-issues-and-improvements.md#s11)). Saves the user message into Redis with `addMessage` ([line 25](../../backend/services/agent/controllers/agent.controller.js#L25-L29)), then POSTs it to the **hard-coded** chat service URL `https://ailuma-chat-service.onrender.com/save-message` ([line 32](../../backend/services/agent/controllers/agent.controller.js#L32-L36)). Runs `graph.invoke(...)` with `recursionLimit: 150` ([line 40](../../backend/services/agent/controllers/agent.controller.js#L40-L48)). If `isAutonomous && result.taskPlan`, it puts "**Autonomous Mode Steps Taken:**" and the plan steps above the answer ([line 56](../../backend/services/agent/controllers/agent.controller.js#L56-L58); that check uses the *string*, [F30](../08-known-issues-and-improvements.md#f30)). Saves the answer in Redis and in the chat service (with `images` and `artifacts \|\| []`), then replies. It never checks that the conversation belongs to the user ([S5](../08-known-issues-and-improvements.md#s5)). It imports `redis` but never uses it ([line 1](../../backend/services/agent/controllers/agent.controller.js#L1)). |
| **Takes** | `req.body`: `prompt`, `conversationId`, `agent`, `isAutonomous` · `req.file` (optional) · headers `x-user-id`, `x-github-token`. They go into the graph as `{ prompt, conversationId, userId, agent, file, githubToken, isAutonomous: isAutonomous === "true" }`. |
| **Returns** | `200` + `{ success: true, answer, images, artifacts }` · on any throw, `next(error)` → the error handler below: `429` (rate limit, body = the limit details), `400` (Insufficient Credits), `500` "Server Waking Up" (auth call failed), the **upstream status** if the chat service answers a `save-message` call with an error (axios errors carry `status`), or `500` + `{ success: false, message }`. |

### Global error handler `(err, req, res, next)`  *(in [index.js:25-49](../../backend/services/agent/index.js#L25-L49))*

| | |
|---|---|
| **What it does** | Express knows it is an error handler because it has **4** arguments. It logs the error. If `err.status` is set, it replies with that status and `err.data` (or `{ success: false, message }` if there is no `data`). Otherwise it replies `500`. |
| **Takes** | `err`: anything passed to `next(err)`. That includes multer errors (no `status`, so 500, [F9](../08-known-issues-and-improvements.md#f9)), `checkAgentLimit` errors (`status 429` + `data`), `deductCredits` errors (`400`/`403`/`500` + `data`), and axios errors from `save-message` (they have `status` but no `data`). |
| **Returns** | `err.status` + `err.data` · `err.status` + `{ success: false, message: err.message or "Internal Server Error" }` · `500` + `{ success: false, message }`. |

---

## Graph nodes

### `routerNode(state)`  *([router.node.js](../../backend/services/agent/graph/router.node.js))*

| | |
|---|---|
| **What it does** | Picks the agent. Rule 1: if `state.agent` is set and not `"auto"`, keep it ([line 11-19](../../backend/services/agent/graph/router.node.js#L11-L19)). Rule 2: an `image/*` file → `vision`. Rule 3: `application/pdf` → `pdf_rag`. Rule 4: `text/csv`, or a name ending `.csv` / `.xlsx` → `data` ([line 49](../../backend/services/agent/graph/router.node.js#L49); `.xlsx` never gets past multer, [F9](../08-known-issues-and-improvements.md#f9)). Otherwise it asks the LLM for one word and uses `content.trim().toLowerCase()` with **no check** against the allowed names ([line 135-141](../../backend/services/agent/graph/router.node.js#L135-L141), [F29](../08-known-issues-and-improvements.md#f29)). The LLM call is not rate-limited or charged. |
| **Takes** | `agent`, `file.mimetype`, `file.originalname`, `prompt`. |
| **Returns** | Sets `agent`. Then the conditional edge sends it to that node (unknown words → `chat`). Throws only if the LLM call fails (→ 500). |

### `plannerNode(state)`  *([planner.node.js](../../backend/services/agent/graph/planner.node.js), Auto-Pilot only)*

| | |
|---|---|
| **What it does** | If `isAutonomous` is false it returns the state unchanged (never reached, because the graph only comes here in Auto-Pilot). Otherwise it calls `getModel("router")`, which is **not imported**, so it throws `ReferenceError` every time ([line 12](../../backend/services/agent/graph/planner.node.js#L12), [F3](../08-known-issues-and-improvements.md#f3)). The code after that (never reached today) joins the old steps with a literal `"\\n"` ([line 17](../../backend/services/agent/graph/planner.node.js#L17), [F30](../08-known-issues-and-improvements.md#f30)), asks the LLM for `DONE` or the next agent name, adds the step text `[Step] Used agent, got response length: N`, and sets `agent` to `"done"` or to the LLM's word (not checked). |
| **Takes** | `isAutonomous`, `taskPlan`, `prompt`, `response`. |
| **Returns** | Sets `agent` and `taskPlan`. `"done"` → the graph ends, anything else → back to the router. Today: throws → **500**, after the first agent already charged credits. |

### `chatAgent(state)`  *([chat.agent.js](../../backend/services/agent/agents/chat.agent.js))*

| | |
|---|---|
| **What it does** | `checkAgentLimit(userId, "chat")`, then `deductCredits(userId, "chat")` (1 credit). Loads the conversation history from Redis with `getMemory`. If there are `searchResults`, it pastes them as JSON into the system prompt ("Answer the user using only the above search results"). Builds `[SystemMessage, ...history as Human/AI messages, HumanMessage(prompt)]` and calls the LLM. The only node that uses memory. |
| **Takes** | `userId`, `conversationId`, `prompt`, `searchResults`. |
| **Returns** | Sets `response` (the LLM text) and `images` (`searchResults.images`, or `[]`). **Throws** the 429 / 400 / 500 from the checks (no `try`), and LLM errors. |

> ⚠️ **Interview point:** the controller adds the user's prompt to Redis **before** the graph runs, so `getMemory` already returns it as the last history item, and then [line 68-70](../../backend/services/agent/agents/chat.agent.js#L68-L70) adds it **again**. The model sees the current question twice. Also, when search failed and returned `[]`, `[]` is truthy, so the prompt still says "Web Search Results: []".

### `searchAgent(state)`  *([search.agent.js](../../backend/services/agent/agents/search.agent.js))*

| | |
|---|---|
| **What it does** | `checkAgentLimit(userId, "search")`, `deductCredits(userId, "search")` (5 credits), both **outside** the `try`. Then asks **Tavily** (a web-search API made for LLM apps; `maxResults: 5`, `includeImages: true`) with the prompt as the query, and logs the result. In manual mode the graph then always runs `chat`, which charges 1 more ([F8](../08-known-issues-and-improvements.md#f8)). |
| **Takes** | `userId`, `prompt`. |
| **Returns** | Sets `searchResults` (the Tavily result object, which includes `results` and `images`), or `[]` if Tavily fails. **Throws** 429 / 400 / 500 from the checks. |

### `codingAgent(state)`  *([coding.agent.js](../../backend/services/agent/agents/coding.agent.js))*

| | |
|---|---|
| **What it does** | `checkAgentLimit(userId, "coding")`, `deductCredits(userId, "coding")` (10). Sends **one big prompt** (intent detection; default stack plain HTML/CSS/JS; single page; output as `FILE: name` blocks, or Markdown for review / explain / debug). Parses the reply with the regex `FILE:\s*([^\n]+)\n([\s\S]*?)(?=\nFILE:...\|$)` ([line 268-272](../../backend/services/agent/agents/coding.agent.js#L268-L272)) into `files: [{ name, content }]`, and strips ```` ``` ```` fences with `cleanCode`. If the reply has no `"FILE:"`, it returns the Markdown as the answer. There is a block that guesses a file name (`main.js`, `index.html`, `style.css`, `main.py`, `Main.java`, `main.cpp`) from the prompt, but the value is **never used** ([line 291-318](../../backend/services/agent/agents/coding.agent.js#L291-L318), dead code). It imports `getMemory` and the message classes but uses neither. |
| **Takes** | `userId`, `prompt`. |
| **Returns** | Markdown case: `response` = the Markdown, `artifacts: []`. Project case: `response: "Code generated successfully."` and `artifacts: [{ id: Date.now(), type: "project", title: prompt, files, createdAt }]`. **Throws** 429 / 400 / 500 and LLM errors. |

### `pdfAgent(state)`  *([pdf.agent.js](../../backend/services/agent/agents/pdf.agent.js))*

| | |
|---|---|
| **What it does** | Inside one `try`: limit `pdf`, charge `pdf` (10). Asks the LLM for a plain-text document (no Markdown). The first line becomes the title if it is shorter than 120 characters, otherwise the prompt is used. Removes every `**`, ```` ``` ````, and `#` from the text. Draws an A4 PDF with **pdfkit** (margin 50): title, a "Generated on" date in the server's time zone ([Q15](../08-known-issues-and-improvements.md#q15)), the text, and a footer. Collects the stream chunks into a `Buffer`, uploads it to S3 as `pdf-<timestamp>.pdf` ([Q18](../08-known-issues-and-improvements.md#q18)), and signs a 24-hour link. |
| **Takes** | `userId`, `prompt`. |
| **Returns** | Sets `response` = Markdown with `# PDF Generated Successfully`, the title, `[Download PDF](url)` and "Link expires in 10 minutes" (wrong, it's 24 h, [F15](../08-known-issues-and-improvements.md#f15)). **Never throws:** any error, including 429 / 400, becomes `response: "Failed to generate PDF."` with `200` ([F7](../08-known-issues-and-improvements.md#f7)). |

### `pptAgent(state)`  *([ppt.agent.js](../../backend/services/agent/agents/ppt.agent.js))*

| | |
|---|---|
| **What it does** | Inside one `try`: limit `ppt`, charge `ppt` (10). Asks the LLM for a small text format: `TITLE:`, `SUBTITLE:`, then 8 `SLIDE:` blocks with `Type: bullets / stats / conclusion`, `Title:` and `- ` lines (stats as `Label \| Value`). `parseResponse` turns that into `{ title, subtitle, slides }`. Builds a **pptxgenjs** deck in `LAYOUT_WIDE` (16:9): a dark cover slide, then one slide per block (stat slide, conclusion slide, or bullet slide by default). Writes it to a `nodebuffer`, uploads `ppt-<timestamp>.pptx` to S3, signs a 24-hour link. It imports `fs` and `path` but never uses them. |
| **Takes** | `userId`, `prompt`. |
| **Returns** | Sets `response` = "# Presentation Generated Successfully", the title, `[Download PPT](url)`, "Link expires in 24 hours." **Never throws:** errors → `"Failed to generate presentation."` with `200` ([F7](../08-known-issues-and-improvements.md#f7)). |

### `imageAgent(state)`  *([imageGen.agent.js](../../backend/services/agent/agents/imageGen.agent.js))*

| | |
|---|---|
| **What it does** | Inside one `try`: limit `image`, charge `image` (10). The LLM rewrites the prompt into a detailed "photo" prompt. Then it calls `GET https://image.pollinations.ai/prompt/<encodeURIComponent(prompt)>` with `responseType: "arraybuffer"` (a free public image service with no key, [Q17](../08-known-issues-and-improvements.md#q17)), uploads the bytes to S3 as `image-<timestamp>.png`, and signs a 24-hour link. |
| **Takes** | `userId`, `prompt`. |
| **Returns** | Sets `response` = Markdown with `![Generated Image](url)`, `[Download Image](url)` and "Link expires in 10 minutes" ([F15](../08-known-issues-and-improvements.md#f15)). **Never throws:** errors → `"Failed to generate image.\nError: <error.message>"` with `200` (it shows the raw error text to the user, [S11](../08-known-issues-and-improvements.md#s11)). |

### `visionAgent(state)`  *([vision.agent.js](../../backend/services/agent/agents/vision.agent.js))*

| | |
|---|---|
| **What it does** | `try` / `finally` with **no** `catch`. Limit `image`, charge `image` (10). Reads the uploaded image, turns it into **base64** (bytes written as text), and sends a `HumanMessage` with a text part (the prompt, or "Describe this image.") and an `image_url` part (`data:<mimetype>;base64,...`), plus a system prompt ("analyze only the uploaded image…"). The model is the same text model as every other node ([F16](../08-known-issues-and-improvements.md#f16), likely). The `finally` block always deletes the temp file. |
| **Takes** | `userId`, `file.path`, `file.mimetype`, `prompt`. |
| **Returns** | Sets `response`. **Throws** 429 / 400 / 500 and LLM errors (so, unlike F7, a limit error reaches the user correctly). If it ever ran with no file, `state.file.path` would throw a `TypeError` → 500 after charging. |

### `pdfRagAgent(state)`  *([pdfRag.agent.js](../../backend/services/agent/agents/pdfRag.agent.js))*

| | |
|---|---|
| **What it does** | `try` / `finally` with no `catch`. **No rate limit and no charge** ([F4](../08-known-issues-and-improvements.md#f4)). Reads the PDF, extracts the text with `pdf-parse`, splits it with `RecursiveCharacterTextSplitter` (chunks of 1000 characters, 200 overlap), embeds the chunks and stores them in a **new Qdrant collection** `pdf-<timestamp>`, finds the 5 chunks closest to the question, and asks the LLM to answer only from those chunks. In `finally` it deletes the temp file, then tries `QdrantVectorStore.deleteCollection(collectionName)`, but `collectionName` was declared with `const` inside the `try`, so this line throws `ReferenceError` (caught and logged). The collection is **never** deleted. |
| **Takes** | `file.path`, `prompt`. |
| **Returns** | Sets `response`. It also returns `docs`, which is not a field in [state.js](../../backend/services/agent/graph/state.js), so it does not reach the controller. **Throws** any parse / embedding / Qdrant / LLM error → 500. |

### `dataAgent(state)`  *([data.agent.js](../../backend/services/agent/agents/data.agent.js))*

| | |
|---|---|
| **What it does** | Inside one `try`: limit `coding`, charge `coding` (10). Reads the CSV as UTF-8. If it is empty or missing, it replies "Please upload a valid CSV file" **after** charging. Keeps only the first 500 lines. Asks the LLM for raw JSON `{ artifacts: [{ title, type: "react", files: [index.html, style.css, script.js] }] }` using Chart.js from a CDN. Cuts the reply from the first `{` to the last `}` and runs `JSON.parse`. Never deletes the temp file ([F14](../08-known-issues-and-improvements.md#f14)). |
| **Takes** | `userId`, `file.path`, `prompt`. |
| **Returns** | Sets `response: "✅ Here is the data visualization based on your CSV file."` and `artifacts: parsed.artifacts`. Parse error → `response: "❌ Failed to generate visualization format. <message>"`. Other errors (including 429 / 400) → `"❌ Failed to analyze data."`. **Never throws** ([F7](../08-known-issues-and-improvements.md#f7)). |

### `githubAgent(state)`  *([github.agent.js](../../backend/services/agent/agents/github.agent.js))*

| | |
|---|---|
| **What it does** | Meant to: limit `coding`, charge `coding` (10), refuse if there is no `githubToken`, create an **Octokit** client (the official GitHub SDK), read the user's login, and ask the LLM for one JSON action: `reply` (just text), `list_repos` (10 most recently updated), `read_file` (`repos.getContent`, base64-decoded), or `commit` (get the file's `sha` if it exists, then `createOrUpdateFileContents`, with **no user confirmation**). **Today:** the file has **no import lines**, so the very first line (`checkAgentLimit`) throws `ReferenceError`, which is caught. Nothing is charged, and the user always sees the misleading "Token may be invalid or expired" ([F2](../08-known-issues-and-improvements.md#f2)). |
| **Takes** | `userId`, `githubToken`, `prompt`. |
| **Returns** | Sets `response` only. Today always `"❌ Failed to perform GitHub action. Token may be invalid or expired."`. **Never throws.** |

> ⚠️ **Interview point:** even with the imports restored, the `list_repos` and `read_file` replies use `"\\n"` (an escaped backslash) in their template strings ([line 98-99](../../backend/services/agent/agents/github.agent.js#L98-L99), [113](../../backend/services/agent/agents/github.agent.js#L113)), so the user would see literal `\n` text instead of new lines. It's the same escaping mistake as [F30](../08-known-issues-and-improvements.md#f30).

---

## Helpers used by these controllers and nodes

| Helper | File | What it does | Takes → Returns |
|---|---|---|---|
| `checkAgentLimit` | [config/agentRateLimit.js](../../backend/services/agent/config/agentRateLimit.js#L14-L71) | Fixed-window rate limit. `INCR rate:<agent>:<userId>`; on the first hit, `EXPIRE` 60 s (not atomic, [F28](../08-known-issues-and-improvements.md#f28)). Limits: chat 20, coding 5, pdf 5, ppt 5, image 3, search 5, anything else 20. | `(userId, agent)` → `{ remaining, limit }`, or throws `429` with `data = { success, agent, limit, remainingTime, retryAfter, message }` |
| `multer` (default export) | [config/multer.js](../../backend/services/agent/config/multer.js) | Disk storage in `./temp` (created at start-up), file name `Date.now()-originalname`, allows `application/pdf`, `image/*`, `text/csv` or a `.csv` name, 20 MB max. Used as `multer.single("file")`. | request → `req.file` + `req.body`, or `next(err)` (→ 500, [F9](../08-known-issues-and-improvements.md#f9)) |
| `connectDB` | [config/db.js](../../backend/services/agent/config/db.js) | `mongoose.connect(MONGO_URI or MONGODB_URL)`, logs and carries on if it fails ([F31](../08-known-issues-and-improvements.md#f31)). The agent service has no Mongo models, so this connection is unused ([Q4](../08-known-issues-and-improvements.md#q4)). | nothing → nothing |
| `AgentState` | [graph/state.js](../../backend/services/agent/graph/state.js) | `Annotation.Root` with 15 plain fields (no reducers). | → the state schema |
| `graph` | [graph/supervisor.graph.js](../../backend/services/agent/graph/supervisor.graph.js#L25-L114) | Adds 12 nodes, the `__start__ → router` edge, the router's switch, `routeAfterAgent` (Auto-Pilot → planner, else `__end__`), search → chat / planner, planner → `__end__` / router. Then `compile()`. | `graph.invoke(state, { recursionLimit })` → the final state |
| `deductCredits` | [utils/deductCredits.js](../../backend/services/agent/utils/deductCredits.js) | `PATCH https://ailuma-auth-service.onrender.com/internal/deduct-credits` (hard-coded, [F6](../08-known-issues-and-improvements.md#f6)) with `{ userId, agent }`. A 400/403 becomes an error with the same status and title "Insufficient Credits". **Any** other failure becomes `500` with title "Server Waking Up" (the frontend auto-retries on that title, [S13](../08-known-issues-and-improvements.md#s13)). | `(userId, agent)` → nothing, or throws `{ status, data: { success, title, message } }` |
| `getMemory` | [utils/memory.js](../../backend/services/agent/utils/memory.js#L5-L43) | `GET conversation:<id>` from Redis. On a miss, loads all messages from the chat service and caches them for 24 h. In practice the miss never happens ([F13](../08-known-issues-and-improvements.md#f13)). | `conversationId` → `[{ role, content }, ...]` |
| `addMessage` | [utils/memory.js](../../backend/services/agent/utils/memory.js#L46-L88) | Read, push `{ role, content }`, drop the oldest if there are more than 20, `SET ... EX 86400`. Read-modify-write, not atomic ([F13](../08-known-issues-and-improvements.md#f13)). | `(conversationId, role, content)` → nothing |
| `getConversationHistory` | [utils/getConv.js](../../backend/services/agent/utils/getConv.js) | `GET ${CHAT_SERVICE}/get-messages/<id>` (env variable `CHAT_SERVICE`). The chat service returns the full Mongo message documents. | `conversationId` → array of messages |
| `getModel` / `gemini` | [utils/model.js](../../backend/services/agent/utils/model.js) | One `ChatOpenRouter` object: model `deepseek/deepseek-chat`, `temperature: 0`, `maxTokens: 2500`. The key comes from the env variable `OPENROUTER_API_KEY` (read by the library). `getModel` **ignores its argument**, and the export named `gemini` is the same OpenRouter object ([Q8](../08-known-issues-and-improvements.md#q8)). | `agent` (ignored) → the chat model |
| `uploadToS3` | [utils/uploadToS3.js](../../backend/services/agent/utils/uploadToS3.js) | `PutObjectCommand` into `AWS_BUCKET_NAME`. | `(buffer, fileName, contentType)` → `fileName` |
| `getDownloadUrl` | [utils/getDownloadUrl.js](../../backend/services/agent/utils/getDownloadUrl.js) | Signs a **presigned** `GetObject` URL (a link that works without login until it expires). The default is 600 s, but every caller passes `24*60*60`. Signing is done locally. | `(fileName, expiresIn = 600)` → URL string |
| `s3` | [utils/s3.js](../../backend/services/agent/utils/s3.js) | `S3Client` built from `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` at import time ([Q14](../08-known-issues-and-improvements.md#q14)). | → client |
| `embeddings` | [utils/embedding.js](../../backend/services/agent/utils/embedding.js) | `GoogleGenerativeAIEmbeddings`, model `gemini-embedding-001`, key `GOOGLE_API_KEY`. Turns text into a vector (a list of numbers). | text(s) → vector(s) |
| `createVectorStore` | [utils/vectorStore.js](../../backend/services/agent/utils/vectorStore.js) | `QdrantVectorStore.fromDocuments(docs, embeddings, { url: QDRANT_URL, apiKey: QDRANT_API_KEY, collectionName })`: creates the collection, embeds and uploads every chunk. | `(collectionName, docs)` → a vector store with `similaritySearch` |
| `searchTool` | [utils/tavily.js](../../backend/services/agent/utils/tavily.js) | `TavilySearch({ maxResults: 5, topic: "general", includeImages: true })`. The key comes from `TAVILY_API_KEY` (read by the library). | `invoke({ query })` → `{ results, images, ... }` |
| `redis` | [shared/redis/redis.js](../../backend/shared/redis/redis.js) | One shared `ioredis` client from `REDIS_URL`. | Redis commands → promises |

**Small private helpers inside the node files:**

| Helper | File | What it does |
|---|---|---|
| `routeAfterAgent` | [supervisor.graph.js:84-87](../../backend/services/agent/graph/supervisor.graph.js#L84-L87) | `isAutonomous ? "planner" : "__end__"`. |
| `cleanCode` | [coding.agent.js:26-31](../../backend/services/agent/agents/coding.agent.js#L26-L31) | Removes ```` ```lang ```` and ```` ``` ```` fences, trims. |
| `parseResponse` | [ppt.agent.js:284-347](../../backend/services/agent/agents/ppt.agent.js#L284-L347) | `TITLE:` (default "Presentation"), `SUBTITLE:`, splits on `SLIDE:`, reads `Title:` (default "Slide"), `Type:` (default "bullets"), `- ` items, and `Label \| Value` stats. |
| `addCoverSlide` | [ppt.agent.js:28-75](../../backend/services/agent/agents/ppt.agent.js#L28-L75) | Dark background, two see-through circles, title, subtitle, "Generated by AI-LUMA". |
| `addBulletSlide` | [ppt.agent.js:79-156](../../backend/services/agent/agents/ppt.agent.js#L79-L156) | Number badge, title, divider, up to **6** striped cards. |
| `addStatSlide` | [ppt.agent.js:160-224](../../backend/services/agent/agents/ppt.agent.js#L160-L224) | Dark background, up to **4** stat cards (big value + label). |
| `addConclusionSlide` | [ppt.agent.js:228-280](../../backend/services/agent/agents/ppt.agent.js#L228-L280) | Blue background, "Key Takeaways", up to **4** points. |

## Formulas

**Rate-limit window and `retryAfter` text** ([agentRateLimit.js:17-59](../../backend/services/agent/config/agentRateLimit.js#L17-L59)):

```
count = INCR rate:<agent>:<userId>        (EXPIRE 60 only when count = 1)
ttl   = TTL of that key, in seconds
if count > max:
    minutes = floor(ttl / 60),  seconds = ttl mod 60
    retryAfter = minutes > 0 ? "<m>m <s>s" : "<s>s"
```

*Worked example:* a user makes image requests at 0 s, 10 s and 20 s (count 1, 2, 3; the limit is 3). At 45 s they try a 4th: `count = 4 > 3`, and the key has 15 s left, so the reply is `429` with `retryAfter: "15s"` and "You have reached the image limit (3 requests/minute). Try again in 15s.". This is a **fixed** window: the window starts at the first request and does not slide, and blocked requests still add to the count. The **vision** node uses the same `image` key, and **data** / **github** use the `coding` key, so they share counters. `ttl` is at most 60, so the "m" form only shows as `"1m 0s"` at the very first second.

**Credits per request** (auth's table: chat 1, search 5, coding / pdf / ppt / image 10, anything else 1):

| What the user does | Keys charged | Total |
|---|---|---|
| Chat (or Auto that routes to chat) | `chat` | 1 |
| Web search | `search` + `chat` (search always goes on to chat, [F8](../08-known-issues-and-improvements.md#f8)) | **6** |
| Coding | `coding` | 10 |
| PDF / PPT / image generation | `pdf` / `ppt` / `image` | 10 |
| Ask about an image (vision) | `image` | 10 |
| Data chart from a CSV | `coding` | 10 |
| GitHub | `coding` (today nothing, it crashes first, [F2](../08-known-issues-and-improvements.md#f2)) | 10 (0 today) |
| Ask about a PDF (pdf_rag) | none ([F4](../08-known-issues-and-improvements.md#f4)) | 0 |

*Worked example:* a user with 16 credits does one search (16 → 11 for `search`, then → 10 for the `chat` step after it), then one coding request (10 → 0), then one chat. The chat's `deductCredits` gets `400` from auth, so the user sees the "Insufficient Credits" banner. If they had asked for a PDF instead, the PDF node would have swallowed the same error and replied `200` "Failed to generate PDF." ([F7](../08-known-issues-and-improvements.md#f7)).

**PPT stat card width** ([ppt.agent.js:183-195](../../backend/services/agent/agents/ppt.agent.js#L183-L195)):

```
cols  = stats.length <= 3 ? stats.length : 4
cardW = 11.8 / cols                      (inches; LAYOUT_WIDE is 13.33 × 7.5)
x(i)  = 0.6 + i × cardW                  card drawn at x + 0.1, width cardW − 0.2
```

*Worked example:* 3 stats → `cardW = 3.933`. Cards start at x = 0.70, 4.63 and 8.57, each 3.73 wide, so the last one ends at 12.30. With 6 stats, `cols = 4`, `cardW = 2.95`, and only the first 4 are drawn (`slice(0, 4)`). A stat slide with **no** `- ` lines gives `cols = 0` and `cardW = Infinity`, but nothing is drawn, so it doesn't crash. Bullet cards use `y = 1.15 + i × (0.72 + 0.12)`, so the 6th card (i = 5) starts at y = 5.35.

**Data agent CSV cut** ([data.agent.js:49-55](../../backend/services/agent/agents/data.agent.js#L49-L55)):

```
lines = csv.split("\n")
if lines.length > 500:  csv = first 500 lines + "\n... (truncated)"
```

*Worked example:* a CSV with 1 header + 1,200 rows (1,201 lines) sends the header + the first 499 rows to the LLM. The chart is built only from those rows (the prompt tells the LLM to hard-code the data), so the chart silently covers less than half the file. A file ending with a newline has one extra empty "line", which also counts toward the 500.

**Memory cap** ([memory.js:69-73](../../backend/services/agent/utils/memory.js#L69-L73)):

```
messages.push(new)
if messages.length > 20:  messages.shift()      (drop the oldest one)
SET conversation:<id> ... EX 86400               (TTL reset to 24 h on every write)
```

*Worked example:* each request adds 2 items (user + assistant). After 10 exchanges the list holds 20. On the 11th question the user message makes 21, so the oldest (the 1st question) is dropped. The chat node then sees 20 items, and the last one is the current question (which it also adds again, see `chatAgent`). If nobody writes for 24 h, the key expires and the AI forgets the whole chat, even though Mongo still has it ([F13](../08-known-issues-and-improvements.md#f13)).
