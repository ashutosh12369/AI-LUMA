// Express: Node.js ka framework, API endpoints aur server setup asaan banane ke liye.
import express from "express";
// Dotenv: Environment variables (like ports, secret keys) load karne ke liye from .env file.
// Why? Sensitive configuration ko code se bahar rakhne ke liye for security.
import dotenv from "dotenv";
// Routes import kiye jo / routes manage karenge (business logic connect hoga idhar se).
import router from "./routes/chat.routes.js";
// Database connection file import.
import connectDB from "./config/db.js";

// .env file parse karke process.env me keys attach kar dega.
dotenv.config();

// Express app initialize kiya. Yeh main application object hai jisme routes aur middleware bind honge.
const app = express();

// Middleware: Express ka in-built body parser. Jo incoming requests JSON data contain karti hain usko parse karke req.body banata hai.
// Interview tip: Agar ye use nahi karenge to req.body 'undefined' aayega POST APIs me.
app.use(express.json());

// Server jis port par sunega wo process.env se le rahe hain (Environment-specific setup).
const port = process.env.PORT;

// '/' base path par humne apne chat router ko attach kar diya hai.
// Matlab saari chat API requests sidha router me jayengi (/create-conversation, etc.)
app.use("/", router);

// app.listen server ko specified port pe start (bind) kar deta hai taaki wo network requests sun sake.
app.listen(port, () => {
    // Jaise hi server chalu hua, MongoDB database se connection establish kar rahe hain.
    // Why? Bina db ke CRUD operations database fail ho jayenge.
    connectDB();
    // Server chalte waqt console pe confirmational log print karega.
    console.log(
        `chat service running on ${port}`
    );
});
