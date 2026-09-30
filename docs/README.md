# AI-LUMA: project documentation

These docs explain how AI-LUMA works, from the real code. They are written so you can **explain any part of it in an interview**, with diagrams to draw and honest notes about the weak spots.

The docs describe commit `4ac41a3` (the latest on `main` when written). Line links point to that version.

---

## The project in 10 lines

1. AI-LUMA is a chat app where one input box reaches **10 AI agents**: chat, web search, coding, PDF, PPT, image, vision, PDF Q&A, CSV charts and GitHub.
2. The frontend is **React 19 + Vite + Redux Toolkit** (on Vercel). It only talks to one **API gateway**.
3. The backend is **5 Node/Express 5 services** on Render: gateway, auth, chat, billing, agent.
4. Login is **Firebase** (Google / GitHub). The auth service then creates an **opaque session** in **Redis** (7 days) and sets an `httpOnly` cookie.
5. The gateway's `protect` middleware checks that session on every call and forwards the user as an `x-user-id` header.
6. The **chat** service stores conversations, messages (with embedded code artifacts) and share links in **MongoDB**.
7. The **agent** service runs a **LangGraph**: a router picks the agent (user choice → file type → LLM), and each agent rate-limits (Redis), charges credits (auth), then calls **DeepSeek via OpenRouter**.
8. Extras: **Tavily** search, **Gemini embeddings + Qdrant** for PDF Q&A, **pdfkit / pptxgenjs + S3** for files, **Pollinations** for images, **Octokit** for GitHub.
9. **Billing** sells credits with **Razorpay** (₹199 → 500 credits, ₹499 → 1000), checked with an HMAC signature. Auth then adds the credits.
10. It works end to end in design, but has real bugs worth knowing: public "internal" credit routes, payment replay, chat IDOR, broken imports from an auto-commenting script, and a frontend build that fails. See [08](08-known-issues-and-improvements.md).

---

## Reading order

| # | File | What's inside |
|---|---|---|
| 1 | [01-tech-stack.md](01-tech-stack.md) | Every library and service: what it does here, why, the alternatives, hosting, env variable names, versions |
| 2 | [02-architecture.md](02-architecture.md) | Big picture, folder tree, one request traced, gateway start-up, router index, auth in one picture, where state lives |
| 3 | [03-database-models.md](03-database-models.md) | 5 Mongoose models, ER diagrams, the Redis / Qdrant / S3 keys, embed vs reference, indexes |
| 4 | [04-middleware.md](04-middleware.md) | cors / helmet / morgan / cookieParser, `protect`, `proxyWithUser`, multer, the agent error handler, why order matters |
| 5 | [05-agent-engine.md](05-agent-engine.md) | The LangGraph graph, the router rules, the 10 agents, output parsing, RAG, memory, Auto-Pilot, costs |
| 6 | [06-frontend.md](06-frontend.md) | Start-up hooks, guards, Redux state shape, the screen → API map, the retry interceptor |
| 7 | [routes/](routes/) | One file per router. Every route has a flowchart, plus end-to-end sequence diagrams |
| 8 | [controllers/](controllers/) | One file per controller. Each function: What it does / Takes / Returns, plus formulas |
| 9 | [07-interview-questions.md](07-interview-questions.md) | 14 "explain with a diagram" answers + 100+ Q&A + quick-fire facts |
| 10 | [08-known-issues-and-improvements.md](08-known-issues-and-improvements.md) | Every bug and gap checked against the code (IDs S1…, F1…, Q1…), with fixes |

**Routes:** [gateway](routes/gateway.routes.md) · [auth](routes/auth.routes.md) · [chat](routes/chat.routes.md) · [billing](routes/billing.routes.md) · [agent](routes/agent.routes.md)
**Controllers:** [gateway](controllers/gateway.controllers.md) · [auth](controllers/auth.controllers.md) · [chat](controllers/chat.controllers.md) · [billing](controllers/billing.controllers.md) · [agent](controllers/agent.controllers.md)

> **About slot 05:** the standard layout has a "real-time" doc here, for sockets, SSE, queues or cron. This project has **none of those**: every answer is one HTTP reply. So slot 05 covers the part that does the "moving work" instead, the **LangGraph agent engine**.

---

## How to read the diagrams

All diagrams are [Mermaid](https://mermaid.js.org/). They render on GitHub and in the VS Code Markdown preview (with a Mermaid extension).

**Colour key** (the same everywhere):

| Colour | Meaning |
|---|---|
| 🟦 blue | a request / entry point / router |
| 🟨 yellow | middleware (or a guard like the rate limit) |
| 🟩 light green | a controller step |
| 🟪 purple | an outside service or event |
| 🟥 red | an error reply |
| 🟢 dark green | a success reply |
| dashed red box | a known bug, noted where it happens |
| dashed grey box (router maps) | "public": no middleware on this route |

**Route flowcharts** keep the success path as **one straight column** going down. Errors branch off to the **right** on dotted arrows, labelled with the reason. The gateway's global middleware is drawn **once**, in each router map, not in every route diagram.

**Sequence diagrams** read top to bottom in time. `alt / else` boxes show success vs failure.

**ER diagrams:** `||` exactly one · `o|` zero or one · `o{` zero or many · `|{` one or many.

**⚠️ Interview point** callouts mark a real bug, a trade-off, or something an interviewer is likely to ask. Most link to an issue ID in [08](08-known-issues-and-improvements.md).

---

## What these docs deliberately leave out

- **Secret values.** No keys, passwords or connection strings are copied. The env files are described by variable **name** only.
- **Guesses.** Where something couldn't be proved from the code alone (e.g. dashboard settings on Render or Vercel, or runtime model behaviour), it is marked **(likely)**.
- [Masterclass.md](../Masterclass.md) in the repo root is older. It describes JWT, hashed passwords and roles, which don't exist in the code ([Q13](08-known-issues-and-improvements.md#q13)). Trust these docs where they differ.
