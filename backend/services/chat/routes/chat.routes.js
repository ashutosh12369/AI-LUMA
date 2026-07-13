import express from "express";
import { createConversation, getConversations, getMessages, saveMessage, updateConversation, deleteConversation, deleteAllConversations, togglePin } from "../controllers/chat.controller.js";



const router =
express.Router();

router.post("/create-conversation",createConversation);
router.get("/get-conversations",getConversations);
router.post("/update-conversation",updateConversation);
router.post("/save-message",saveMessage);
router.get("/get-messages/:id",getMessages);
router.delete("/delete-conversation/:id",deleteConversation);
router.delete("/delete-all-conversations",deleteAllConversations);
router.post("/toggle-pin",togglePin);

export default router;