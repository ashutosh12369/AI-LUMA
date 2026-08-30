import express from "express"; // Core Express server frame-work (What)
import dotenv from "dotenv"; // Environment variables load karne ke liye (What)
import connectDB from "./config/db.js"; // Database connect karne ka function (What)
import router from "./routes/agent.route.js"; // Routes jo humne define kiye the wo la rahe hain (What)

// dotenv configure kar rahe hain taki .env file ke variables process.env me available ho jaye (Why)
dotenv.config();

// Express app initialize kar rahe hain, ye humari main application hai (What)
const app = express();

// JSON body parser middleware. 
// Interview prep: API requests ke JSON payload ko parse karke req.body me daalne ke liye zaroori hai (Why)
app.use(express.json());

// PORT variable ko .env se set kar rahe hain (What)
const port=process.env.PORT

// Root ('/') path par aane wali sari requests ko agent router ko forward kar rahe hain (Why)
app.use("/",router);

// Global Error Handler Middleware
// Interview prep: Agar app me kahi bhi error throw hoti hai, to yaha catch hogi (Why)
// Isme 4 arguments hote hain (err, req, res, next) jo express ko batata hai ki ye error handler hai (What)
app.use((err, req, res, next) => {

  console.error(err); // Server logs me error print karne ke liye (What)

  // Agar custom error (jisme status ho) aayi hai, to wahi status bhejenge (Why)
  if (err.status) {

    return res
      .status(err.status)
      .json(err.data || { success: false, message: err.message || "Internal Server Error" });

  }

  // Agar internal/unknown error aayi hai, to fallback status 500 (Internal Server Error) bhejenge (Why)
  return res
    .status(500)
    .json({

      success: false, // Client ko batane ke liye ki request fail hui (What)

      message: err.message || "Internal Server Error"

    });

});

// Server ko specified port par listen karne ke liye start kar rahe hain (What)
app.listen(port, () => {
    // Database connection call kar rahe hain jab server start hota hai, taki DB ready rahe (Why)
    connectDB()
  console.log(
    `agent service running on ${port}`
  );
});
