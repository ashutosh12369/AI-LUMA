# Chat controllers

**Code:** [chat.controller.js](../../backend/services/chat/controllers/chat.controller.js) · models: [conversation.model.js](../../backend/services/chat/models/conversation.model.js), [message.model.js](../../backend/services/chat/models/message.model.js), [sharedArtifact.model.js](../../backend/services/chat/models/sharedArtifact.model.js) · routes: [chat.routes.md](../routes/chat.routes.md)

A **controller** is the function that does the real work for one route. By the time a controller runs, the router has already matched the URL and any middleware has already run. The controller reads the request, talks to the database, and sends back **one** reply (a status code + JSON).

In the chat service, all 11 controllers live in one file. Each one is a thin wrapper around one or two Mongoose calls. None of them validates input, and only five of them look at who the user is.

**How to read "Takes":**

| Source | Meaning in this service |
|---|---|
| `req.body` | JSON sent by the caller. The chat service parses it with `express.json()` ([index.js:19](../../backend/services/chat/index.js#L19)), default limit 100 kb. |
| `req.params` | The `:id` or `:shareId` part of the URL (e.g. `/get-messages/:id`). |
| `req.query` | Not used by any chat controller. |
| `x-user-id` header | Added by the gateway's `proxyWithUser` after `protect` has checked the session ([proxyWithHeaders.js:28](../../backend/gateway/utils/proxyWithHeaders.js#L28)). The chat service believes it without any check ([S2](../08-known-issues-and-improvements.md#s2)). Only `createConversation`, `getConversations`, `shareArtifact`, `deleteConversation` and `deleteAllConversations` read it. |
| file | None. The chat service has no file upload. |

Every function has its own `try/catch` and replies `500` + `{ message: error.message }` on any error. So a bad ID (a Mongoose **CastError**, "this is not a valid ObjectId") or a failed validation also comes back as 500, not 400. Sending raw error text to the client is [S11](../08-known-issues-and-improvements.md#s11). All success replies are `200`, including creates.

---

### `createConversation(req, res)`  *(login via gateway)*

| | |
|---|---|
| **What it does** | Reads `x-user-id`, logs it with `console.log`, and creates a conversation with only `userId` set. The model fills the defaults: `title: "New Chat"`, `folder: ""`, `isPinned: false`, plus `createdAt` / `updatedAt`. |
| **Takes** | `x-user-id` header. The body (`{}` from [conversation.api.js:28](../../frontend/src/features/conversation.api.js#L28)) is ignored. |
| **Returns** | `200` + the new conversation document · `500` + `{ message }` (e.g. no `x-user-id`, because `userId` is `required`). |

### `getConversations(req, res)`  *(login via gateway)*

| | |
|---|---|
| **What it does** | `Conversation.find({ userId })`, sorted by `isPinned: -1` (pinned first), then `updatedAt: -1` (newest first). No limit, no pagination ([Q6](../08-known-issues-and-improvements.md#q6)), no index on `userId` ([Q5](../08-known-issues-and-improvements.md#q5)). |
| **Takes** | `x-user-id` header. |
| **Returns** | `200` + an array of conversations (can be empty) · `500` + `{ message }`. |

### `saveMessage(req, res)`  *(no owner check; called directly by the agent)*

| | |
|---|---|
| **What it does** | Creates one message: `Message.create({ conversationId, role, images, content, artifacts: artifacts \|\| [] })`. It does not check that the conversation exists or who owns it ([S4](../08-known-issues-and-improvements.md#s4)), and it does not touch the conversation, so the conversation's `updatedAt` stays the same. Called twice per prompt by [agent.controller.js](../../backend/services/agent/controllers/agent.controller.js#L32-L36) ([and here](../../backend/services/agent/controllers/agent.controller.js#L68-L77)) on the public Render URL. |
| **Takes** | `req.body`: `conversationId` (Mongo `_id` string), `role` (`"user"` or `"assistant"`), `content` (text), `images` (array of URLs, optional), `artifacts` (optional array of `{ id, type, title, files: [{ name, content }], createdAt }`). |
| **Returns** | `200` + the saved message document · `500` + `{ message }` (e.g. a role outside the enum, or a `conversationId` that isn't a valid ObjectId). |

### `getMessages(req, res)`  *(no owner check)*

| | |
|---|---|
| **What it does** | `Message.find({ conversationId: req.params.id })`, sorted by `createdAt: 1` (oldest first, the natural chat order). It never reads `x-user-id`, so anyone who is logged in can read any chat ([S4](../08-known-issues-and-improvements.md#s4)). Also used by the agent's memory fallback ([getConv.js](../../backend/services/agent/utils/getConv.js#L9)). |
| **Takes** | `req.params.id`: the conversation `_id`. |
| **Returns** | `200` + an array of messages (empty if the ID is valid but unknown) · `500` + `{ message }` if the ID is not a valid ObjectId (for example the string `"undefined"`, which the frontend sends when no chat is selected). |

### `updateConversation(req, res)`  *(no owner check)*

| | |
|---|---|
| **What it does** | `Conversation.findByIdAndUpdate(conversationId, { title })` **without** `{ new: true }`, so Mongoose returns the document as it was **before** the change. Used for both the auto-title and a manual rename. No owner check ([S4](../08-known-issues-and-improvements.md#s4)), no title check. |
| **Takes** | `req.body`: `conversationId`, `title`. |
| **Returns** | `200` + the **old** document, or `200` + `null` if the ID is unknown · `500` + `{ message }` (invalid ID). |

### `shareArtifact(req, res)`  *(login via gateway)*

| | |
|---|---|
| **What it does** | Makes `shareId = crypto.randomBytes(8).toString("hex")` (16 hex characters, 64 random bits) and saves a **copy** of the artifact with `createdBy = x-user-id`. There is no route to revoke or expire a share. |
| **Takes** | `req.body`: `title`, `type`, `files` (array of `{ name, content }`). `x-user-id` header. |
| **Returns** | `200` + `{ shareId }` · `500` + `{ message }`. |

### `getSharedArtifact(req, res)`  *(public)*

| | |
|---|---|
| **What it does** | `SharedArtifact.findOne({ shareId: req.params.shareId })` and returns the **whole** document, including `createdBy` (the owner's Mongo `_id`), `_id`, timestamps and `__v` ([S7](../08-known-issues-and-improvements.md#s7)). Through the gateway this function is never reached, because the path arrives as `/<shareId>` ([F5](../08-known-issues-and-improvements.md#f5)). |
| **Takes** | `req.params.shareId`. |
| **Returns** | `200` + the shared artifact document · `404` + `{ message: "Artifact not found" }` · `500` + `{ message }`. |

### `deleteConversation(req, res)`  *(owner check on the conversation only)*

| | |
|---|---|
| **What it does** | Step 1: `Conversation.findOneAndDelete({ _id: conversationId, userId })`, which only deletes your own conversation. Step 2: `Message.deleteMany({ conversationId })`, which has no owner filter and runs even when step 1 found nothing. So another user's messages can be wiped ([S4](../08-known-issues-and-improvements.md#s4)). The two steps are not in a transaction. |
| **Takes** | `req.params.id`: the conversation `_id`. `x-user-id` header. |
| **Returns** | `200` + `{ message: "Conversation deleted" }` always, even if nothing was deleted (should be 404) · `500` + `{ message }` (invalid ID). |

### `deleteAllConversations(req, res)`  *(login via gateway)*

| | |
|---|---|
| **What it does** | Loads all of the user's conversations, maps them to an `_id` list, deletes all messages with `conversationId: { $in: ids }`, then deletes the conversations with `{ userId }`. Every step is limited to the caller's data. Not atomic, but children are deleted before parents. |
| **Takes** | `x-user-id` header. |
| **Returns** | `200` + `{ message: "All conversations deleted" }` (also when there was nothing to delete) · `500` + `{ message }`. |

### `togglePin(req, res)`  *(no owner check)*

| | |
|---|---|
| **What it does** | `Conversation.findById(conversationId)`, then `isPinned = !isPinned`, then `save()`. There is no null check, so an unknown ID throws a `TypeError` ([F10](../08-known-issues-and-improvements.md#f10)). There is no owner check ([S4](../08-known-issues-and-improvements.md#s4)). The `save()` also bumps `updatedAt`, which moves the chat up in the sort. |
| **Takes** | `req.body.conversationId`. |
| **Returns** | `200` + the updated conversation · `500` + `{ message }` for an unknown ID ("Cannot read properties of null") or an invalid ID. |

### `moveToFolder(req, res)`  *(no owner check)*

| | |
|---|---|
| **What it does** | `Conversation.findByIdAndUpdate(conversationId, { folder }, { new: true })`. A folder is just a string on the conversation; `""` means "no folder". No owner check ([S4](../08-known-issues-and-improvements.md#s4)). |
| **Takes** | `req.body`: `conversationId`, `folder` (string; the Sidebar trims it). |
| **Returns** | `200` + the **updated** document, or `200` + `null` if the ID is unknown · `500` + `{ message }` (invalid ID). |

---

## Helpers used by these controllers

| Helper | File | What it does | Takes → Returns |
|---|---|---|---|
| `Conversation` | [conversation.model.js](../../backend/services/chat/models/conversation.model.js) | Mongoose model for one chat in the sidebar. | Mongoose queries → documents |
| `Message` | [message.model.js](../../backend/services/chat/models/message.model.js) | Mongoose model for one line in a chat. It is imported in the **middle** of the controller file ([line 60](../../backend/services/chat/controllers/chat.controller.js#L60)); that still works because ES module imports are hoisted (loaded before any code runs). | Mongoose queries → documents |
| `SharedArtifact` | [sharedArtifact.model.js](../../backend/services/chat/models/sharedArtifact.model.js) | Mongoose model for a public copy of an artifact. | Mongoose queries → documents |
| `crypto.randomBytes` | Node built-in | Makes the share ID (8 random bytes → 16 hex characters). | byte count → Buffer |
| `connectDB` | [config/db.js](../../backend/services/chat/config/db.js) | `mongoose.connect(MONGO_URI or MONGODB_URL)`, called inside `app.listen`. Logs the error and carries on if it fails ([F31](../08-known-issues-and-improvements.md#f31)). | nothing → nothing |

## Models in short

| Model | Fields | Notes |
|---|---|---|
| **Conversation** | `userId` (String, required), `title` (default `"New Chat"`), `folder` (default `""`), `isPinned` (default `false`), `createdAt`, `updatedAt` | `userId` is a **string**, not an ObjectId ref to a user. No index on it ([Q5](../08-known-issues-and-improvements.md#q5)). |
| **Message** | `conversationId` (ObjectId, ref `Conversation`), `role` (enum `user` / `assistant`), `content`, `images` ([String]), `artifacts` ([artifact]), `createdAt`, `updatedAt` | `conversationId` is not `required` and has no index. Each artifact is `{ id: Number, type, title, files: [{ name, content }], createdAt: String }`, stored with `_id: false` (no sub-document IDs). |
| **SharedArtifact** | `shareId` (String, required, unique), `title`, `type`, `files` ([{ name, content }]), `createdBy` (String), `createdAt`, `updatedAt` | The `unique` option creates a unique index on `shareId`. |

**How the pieces link:** one user (by `userId` string) → many conversations → many messages (by `conversationId`). Artifacts live **inside** messages as an embedded array. A shared artifact is a separate **copy**, not a reference to the message. MongoDB does not enforce any of these links, which is why the code has to delete child messages by hand.
