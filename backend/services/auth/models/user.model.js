// Import karenge mongoose library jo ki MongoDB ke saath interact karne mein madad karta hai
import mongoose from "mongoose";

// User ke liye schema banayenge, jismein hum user ke details store karenge
const userSchema = new mongoose.Schema({
  // Firebase Uid store karenge, jo ki unique hona chahiye
  firebaseUid: {
    type: String,
    unique: true
  },

  // User ka naam store karenge
  name: String,

  // User ka email store karenge
  email: String,

  // User ka avatar store karenge
  avatar: String,

  // User ka provider store karenge (jaise ki Google, Facebook etc.)
  provider: String,
  // User ke plan ke details store karenge
  plan: {
    // Plan ka type store karenge (jaise ki free, premium etc.)
    type: String,
    // Default plan set karenge (yadi kuch nahi diya gaya toh)
    default: "free"
  },

  // User ke credits store karenge
  credits: {
    // Credits ka type store karenge (number)
    type: Number,
    // Default credits set karenge (yadi kuch nahi diya gaya toh)
    default: 100
  },

  // User ke total credits store karenge
  totalCredits: {
    // Total credits ka type store karenge (number)
    type: Number,
    // Default total credits set karenge (yadi kuch nahi diya gaya toh)
    default: 100
  },

  // User ke plan ke expiry date store karenge
  planExpiresAt: Date
}, {
  // Timestamps enable karenge, jisse hume pata chalega kab user banaya gaya tha aur kab update hua tha
  timestamps: true
});

// User model banayenge, jismein hum user schema ka use karenge
const User = mongoose.model("User", userSchema);
// User model ko export karenge, taaki hum use kar sakein
export default User