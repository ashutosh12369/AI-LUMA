import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import redis from "../shared/redis/redis.js";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import { proxyWithUser } from "./utils/proxyWithHeaders.js";
import { protect } from "./middlewares/auth.middleware.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import cookieParser from "cookie-parser"
dotenv.config();
const app = express();
const port=process.env.PORT || 5000
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
    origin: [clientUrl, "http://localhost:5173"],
    credentials: true
}));
app.use(
  "/uploads",
  express.static("uploads")
);
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
const getServiceUrl = (serviceName) => {
  const nameMap = {
    "AUTH_SERVICE": "https://ailuma-auth-service.onrender.com",
    "CHAT_SERVICE": "https://ailuma-chat-service.onrender.com",
    "AGENT_SERVICE": "https://ailuma-agent-service.onrender.com",
    "BILLING_SERVICE": "https://ailuma-billing-service.onrender.com",
  };
  return nameMap[serviceName] || process.env[serviceName];
};

app.use("/api/auth",proxy(getServiceUrl("AUTH_SERVICE"), { parseReqBody: false }))
app.use("/api/me",protect,getCurrentUser)
app.use("/api/chat/shared", proxy(getServiceUrl("CHAT_SERVICE"), { parseReqBody: false }))
app.use("/api/chat",protect,proxyWithUser(getServiceUrl("CHAT_SERVICE")))
app.use("/api/agent",protect,proxyWithUser(getServiceUrl("AGENT_SERVICE")))
app.use("/api/billing",protect,proxyWithUser(getServiceUrl("BILLING_SERVICE")))


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
