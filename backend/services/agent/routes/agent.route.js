import express from "express"; // Express framework import kar rahe hain routing ke liye (What)
import { chat } from "../controllers/agent.controller.js"; // Controller se chat logic import kar rahe hain taki routes clean rahe (Why)
import multer from "../config/multer.js"; // File uploads handle karne ke liye multer middleware (What)

// Naya router instance create kar rahe hain, ye modular routes banane me madad karta hai (Why)
const router =
express.Router();

// POST request define kar rahe hain '/chat' endpoint par.
// Interview prep: 'post' use hota hai kyuki user data/file bhej raha hai jo state change karega (Why)
router.post(
 "/chat",
 // multer.single("file"): Request se single file (jiska key "file" ho) intercept/process karega before controller (What)
 multer.single("file"),
 // chat: Ye hamara main controller logic hai jo request process karega (What)
 chat
);

// Router ko export kar rahe hain taki index.js me isko use kiya ja sake (Why)
export default router;