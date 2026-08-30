// API Gateway ka main file. Ye application ka single entry point hai.
import express from "express";
// Security: Cross-Origin Resource Sharing. React (frontend) se aane wali requests ko allow karne ke liye.
import cors from "cors";
// Security: HTTP headers ko secure karne ke liye Helmet ka use hota hai.
import helmet from "helmet";
// Logging: Har HTTP request ko terminal mein log (print) karne ke liye Morgan use hota hai.
import morgan from "morgan";
// Redis (Database): Gateway level par rate limiting ya session caching ke liye (agar aage zaroorat pade).
import redis from "../shared/redis/redis.js";
import dotenv from "dotenv";
// API Gateway ka Core Engine: express-http-proxy jo incoming requests ko doosri microservices par forward karta hai.
import proxy from "express-http-proxy";
// Custom Proxy function: Jab request aage forward ho, toh uske headers mein User ID inject karne ke liye (taaki backend microservice ko pata chal sake ki kaunsa user hai).
import { proxyWithUser } from "./utils/proxyWithHeaders.js";
// Middleware: Ye JWT token verify karta hai. Agar token valid nahi hai toh request aage nahi jayegi.
import { protect } from "./middlewares/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// CORS config: Frontend URL allow kiya hai aur credentials: true kiya hai taaki secure HttpOnly cookies frontend bhej sake.
app.use(cors({
    origin: [clientUrl, "http://localhost:5173"],
    credentials: true
}));

// Static File Serving: Agar API gateway par koi file upload hoti hai toh yahan se serve hogi.
app.use(
  "/uploads",
  express.static("uploads")
);

app.use(helmet());
app.use(morgan("dev"));
// Cookie-parser isliye chahiye taaki 'protect' middleware HttpOnly cookie se JWT nikal sake.
app.use(cookieParser());

// Ye helper function check karta hai ki kaunsi service ka URL kya hai. Hardcoded production URLs hain idhar fallback ke liye.
const getServiceUrl = (serviceName) => {
  const nameMap = {
    "AUTH_SERVICE": "https://ailuma-auth-service.onrender.com",
    "CHAT_SERVICE": "https://ailuma-chat-service.onrender.com",
    "AGENT_SERVICE": "https://ailuma-agent-service.onrender.com",
    "BILLING_SERVICE": "https://ailuma-billing-service.onrender.com",
  };
  // Ya toh `.env` se URL lega, ya phir Render ka live URL use karega.
  return nameMap[serviceName] || process.env[serviceName];
};

// === ROUTING LOGIC (Microservices Architecture) ===

// 1. Auth Service Route: 
// Login/Signup ki requests yahan aati hain. Yahan `protect` middleware nahi laga hai kyunki login karte waqt token nahi hota.
// `parseReqBody: false` zaroori hai proxy ke liye taaki req.body corrupt na ho.
app.use("/api/auth", proxy(getServiceUrl("AUTH_SERVICE"), { parseReqBody: false }));

// 2. Current User Route: User ki details nikalne ke liye yahi se directly handle hota hai.
app.use("/api/me", protect, getCurrentUser);

// 3. Shared Chat Route: Agar koi user public shared chat link kholta hai toh wahan token nahi hota, isliye `protect` middleware nahi hai.
app.use("/api/chat/shared", proxy(getServiceUrl("CHAT_SERVICE"), { parseReqBody: false }));

// 4. Protected Services (Chat, Agent, Billing):
// Yahan sabse pehle `protect` middleware chalta hai jo check karta hai ki user logged in hai ya nahi.
// Uske baad `proxyWithUser` function request ko aage microservice par bhej deta hai, aur sath mein `x-user-id` header mein add kar deta hai.
app.use("/api/chat", protect, proxyWithUser(getServiceUrl("CHAT_SERVICE")));
app.use("/api/agent", protect, proxyWithUser(getServiceUrl("AGENT_SERVICE")));
app.use("/api/billing", protect, proxyWithUser(getServiceUrl("BILLING_SERVICE")));

// API Gateway ka Health Check Route: Check karne ke liye ki gateway awake/live hai ya nahi.
app.get("/", (req, res) => {
  res.status(200).json({
    service: "gateway",
    status: "ok"
  });
});

app.listen(port, () => {
  console.log(
    `Gateway running on ${port}`
  );
});