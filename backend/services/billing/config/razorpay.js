// Sabse pehle hum Razorpay library ko import kar rahe hain, jo humein payment gateway ke liye zaroori functions provide karti hai.
import Razorpay from "razorpay";
// Ab hum dotenv library ko import kar rahe hain, jo humein environment variables ko easily access karne ki suvidha deti hai.
import dotenv from "dotenv";

// Yeh line dotenv ko configure karti hai, taaki hum environment variables ko access kar sakein.
dotenv.config();

// Yahaan hum Razorpay instance banate hain, jisme hum apna key_id aur key_secret provide karte hain.
const razorpay = new Razorpay({
    // Yeh humara Razorpay key_id hai, jo ki environment variable mein stored hai, aur hum yahaan use access kar rahe hain.
    key_id: process.env.RAZORPAY_KEY_ID,
    // Yeh humara Razorpay key_secret hai, jo ki environment variable mein stored hai, aur hum yahaan use access kar rahe hain.
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Ab hum razorpay instance ko default export kar rahe hain, taaki hum use alag files mein easily access kar sakein.
export default razorpay;