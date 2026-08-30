// Interview Prep (What & Why):
// What: Humara custom axios instance import ho raha hai jisme backend se connect karne ki settings hain.
// Why: Isse sabhi API calls me consistent configuration (jaise base URL, auth headers) automatically apply ho jaati hai.
import api from "../utils/axios";

// Interview Prep (What & Why):
// What: `getConversations` function backend se user ki pichli chats/conversations list fetch karta hai.
// Why: Ek GET request bheji ja rahi hai kyunki server se sirf data retrieve (read) karna hai, state change nahi karni.
export const getConversations = async () => {
  const response = await api.get("/api/chat/get-conversations");
  return response.data;
};

// Interview Prep (What & Why):
// What: `updateConversations` kisi specific conversation ka title update karta hai (rename feature).
// Why: Server pe existing record ko modify karna hai, isliye request body me `conversationId` aur naya `title` bheja ja raha hai.
export const updateConversations = async (conversationId, title) => {
  const response = await api.post("/api/chat/update-conversation", {
    conversationId, title
  });
  return response.data;
};

// Interview Prep (What & Why):
// What: `createConversation` ek naya, khali conversation/chat session initiate karta hai.
// Why: Khali object `{}` as payload bheja ja raha hai kyunki backend sirf us request par naya id/record generate karke return karega.
export const createConversation = async () => {
  const response = await api.post("/api/chat/create-conversation", {});
  return response.data;
};

// Interview Prep (What & Why):
// What: `deleteConversation` specific conversation ko remove karta hai server se.
// Why: DELETE HTTP method ka use karna RESTful conventions ke according sahi practice hai (kisi resource ko udane/remove karne ke liye). ID ko URL params me pass kiya gaya hai (Template literals backticks ka use karke).
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/api/chat/delete-conversation/${conversationId}`);
  return response.data;
};

// Interview Prep (What & Why):
// What: `deleteAllConversations` user ki saari chat history ek hi baar me mita deta hai.
// Why: Bulk delete operation ke liye alag endpoint banaya hai taaki ek-ek karke delete ki jagah server ek hi database query me saara data uda de (better performance).
export const deleteAllConversations = async () => {
  const response = await api.delete("/api/chat/delete-all-conversations");
  return response.data;
};

// Interview Prep (What & Why):
// What: `togglePinConversation` chat ko list ke top par pin ya unpin karne ke kaam aata hai.
// Why: POST request ka use hua hai jisme sirf ID bheji hai, baaki ki toggling logic (agar true hai to false, false hai to true) backend khud handle karta hai taaki frontend simple rahe.
export const togglePinConversation = async (conversationId) => {
  const response = await api.post("/api/chat/toggle-pin", { conversationId });
  return response.data;
};

// Interview Prep (What & Why):
// What: `shareArtifact` kisi generate hue output/artifact (jaise code snippet ya doc) ko share karne ka endpoint hai.
// Why: Pura `artifact` object as payload ja raha hai taaki backend usko as a sharable entity (e.g. public link) convert/store kar sake.
export const shareArtifact = async (artifact) => {
  const response = await api.post("/api/chat/share-artifact", artifact);
  return response.data;
};

// Interview Prep (What & Why):
// What: `moveToFolder` ek specific chat ko kisi category/folder me organize karne ke kaam aata hai.
// Why: ID ke sath destination `folder` ka naam bheja ja raha hai taaki server database me relationship update kar sake.
export const moveToFolder = async (conversationId, folder) => {
  const response = await api.post("/api/chat/move-to-folder", { conversationId, folder });
  return response.data;
};