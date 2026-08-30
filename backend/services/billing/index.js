// Express backend web application framework hai jo routing aur middleware support deta hai.
import express from "express";
// CORS (Cross-Origin Resource Sharing): Doosri domains (Frontend app) se is API ko call karne ki permission deta hai.
import cors from "cors";
// Helmet HTTP headers set karke app ko common web vulnerabilities (jaise XSS, clickjacking) se bachata hai. (Security middleware)
import helmet from "helmet";
// Morgan ek logging middleware hai. Har API hit par request ki details console me print karta hai (useful for debugging).
import morgan from "morgan";
// Mongoose / Database connection helper function import kar rahe hain.
import connectDB from "./config/db.js";
// Dotenv env variables (.env) ko process.env me load karne ke liye.
import dotenv from "dotenv";
// Billing module ke saare route definitions ko router se le rahe hain.
import router from "./routes/billing.routes.js";

// .env file me stored configuration (PORT, DB_URI etc.) activate karta hai.
dotenv.config();
const port = process.env.PORT;

// Express server app instance banta hai.
const app = express();

// Application level middleware jo JSON payloads read karne (parse) madad karta hai. (req.body banata hai).
app.use(express.json());

// Helmet invoke karke basic security secure headers app level me apply karta hai.
// Interview tip: Security ke liye isko top pe attach karna best practice mani jati hai.
app.use(helmet());

// 'dev' string batata hai ki console pe choti aur read karne me asaan request logs dikhayi jayen.
app.use(morgan("dev"));

// '/' pe aane wali saari requests ko billing routes me redirect/bind karta hai.
app.use(
    "/",
    router
);

// Root health-check / Status check route. (Devops aur Load balancers use karte hain ye confirm karne ko server alive hai ya nahi).
// What? Koi bhi agar base url / open karega to simple success response milega.
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Billing Service Running"
    });
});

// Server initialize kar rahe hain port var (say 5000) pe taaki external connections receive ho sakein.
app.listen(port, () => {
    // Database connection establish hoti hai as soon as server starts up successfully.
    connectDB();
    // Terminal/Console me print karta hai confirmation ki service successfully live ho gayi hai.
    console.log(
        `billing service running on ${port}`
    );
});