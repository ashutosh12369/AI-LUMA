// Express library import kar rahe hain routing ke liye.
import express from "express";
// Controllers import kiye ja rahe hain jo in routes ke request handle karenge.
// Interview tip: Controllers me business logic rakha jata hai, aur routes me mapping hoti hai. Separation of concerns kehlata hai ye.
import { 
    createConversation, 
    getConversations, 
    getMessages, 
    saveMessage, 
    updateConversation, 
    deleteConversation, 
    deleteAllConversations, 
    togglePin, 
    shareArtifact, 
    getSharedArtifact, 
    moveToFolder 
} from "../controllers/chat.controller.js";

// Express ka router instance bana rahe hain, taaki routes module-wise define ho sake.
const router = express.Router();

// POST method use karte hain jab server par naya data create karna ho (Create naya conversation)
router.post("/create-conversation", createConversation);

// GET method use karte hain jab server se data padhna/fetch karna ho (Fetch all chats)
router.get("/get-conversations", getConversations);

// POST use kiya hai update ke liye (Aam taur par PUT/PATCH use hota hai standard REST API design me).
router.post("/update-conversation", updateConversation);

// Naya message DB me save karne ka route.
router.post("/save-message", saveMessage);

// '/:id' path parameter denote karta hai, yahan id dynamic hai conversation ki.
router.get("/get-messages/:id", getMessages);

// DELETE HTTP method ka istemal resource ko delete karne ke liye hota hai. Yahan single chat remove karenge.
router.delete("/delete-conversation/:id", deleteConversation);

// Saari chats bulk delete maarne ka route.
router.delete("/delete-all-conversations", deleteAllConversations);

// Pin / Unpin toggle state badal raha hai isliye POST request route use hua hai.
router.post("/toggle-pin", togglePin);

// Artifact shareable link gen karne ka endpoint.
router.post("/share-artifact", shareArtifact);

// Public route shared artifact laane ke liye (dynamic shareId param).
router.get("/shared/:shareId", getSharedArtifact);

// Chat ko kisi dusre folder me move karne ka endpoint.
router.post("/move-to-folder", moveToFolder);

// Is router ko export kiya, taaki main index.js app.use() me in sabhi endpoints ko register kar sake.
export default router;