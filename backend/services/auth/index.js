import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import router from "./routes/auth.routes.js";

// Interview Prep: dotenv config
// What: .env file se variables ko process.env me load karta hai.
// Why: Hardcoded secrets (like DB URIs, ports) code me avoid karne ke liye (Security Best Practice).
dotenv.config();

// Interview Prep: Express App Initialization
// What: Naya express application instance create kar rahe hain.
// Why: Ye hamare Node server ka foundation (server object) hai.
const app = express();

// Interview Prep: Middleware setup
// What: express.json() middleware use kar rahe hain.
// Why: Taaki aane wali API requests ka body JSON format me parse ho sake. Iske bina req.body undefined aayega.
app.use(express.json());

// What: Port number environment variables se fetch kiya ja raha hai.
// Why: Dynamic deployment (e.g., AWS, Heroku) environment me port dynamic hota hai.
const port=process.env.PORT 



// Interview Prep: Health Check Route
// What: Ek basic GET "/" route banaya hai.
// Why: Docker, Kubernetes ya Load Balancer health check (liveness probe) ke liye use karte hain ki service zinda hai ya nahi.
app.get("/", (req, res) => {
  res.status(200).json({
    service: "auth",
    status: "ok"
  });
});

// Interview Prep: Route registration
// What: Root path pe "/routes/auth.routes.js" wale sabhi routes mount kar diye hain.
// Why: Routing structure ko clean aur modular rakhne ke liye. Abhi saare login/logout routes "/" ke under chalenge.
app.use("/",router)

// Interview Prep: Server Booting
// What: app.listen se server start karte hain diye hue port pe.
// Why: Tabhi server actual incoming HTTP traffic ko accept karna shuru karega.
app.listen(port, () => {
    
    // What: Database se connection establish kar rahe hain server start hote hi.
    // Why: Agar DB connect nahi hai, to requests accept karna useless hai, isliye startup ke waqt hi connection banta hai.
    connectDB()
  console.log(
    `auth service running on ${port}`
  );
});
