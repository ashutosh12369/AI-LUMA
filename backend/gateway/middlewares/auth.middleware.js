// =========================================================================
// Interview Prep: auth.middleware.js
// WHY: Microservices architecture me API Gateway par hi authentication handle 
// karna secure aur centralized hota hai.
// WHAT: Yeh middleware incoming requests check karta hai ki user logged in hai 
// ya nahi (session valid hai ya nahi) Redis ka use karke.
// =========================================================================

import redis from "../../shared/redis/redis.js";

// 'protect' middleware function banaya gaya hai routes ko secure karne ke liye.
// 'next' call karna zaroori hai taaki request agle middleware ya controller tak ja sake.
export const protect = async (req, res, next) => {
  try {
    // WHAT: Client ki cookies se 'session' ki value (session ID) extract kar rahe hain.
    // WHY: Jab user login karta hai, tab hum cookie set karte hain. Wahi cookie yaha verify hoti hai.
    const sessionId = req?.cookies?.session;

    // Agar session ID nahi mili, iska matlab user logged in nahi hai ya cookie expire ho gayi.
    if (!sessionId) {
      // 401 Unauthorized status return karte hain, kyunki user authenticated nahi hai.
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    // WHAT: Redis se session data fetch kar rahe hain `session:${sessionId}` key ka use karke.
    // WHY: Redis fast, in-memory store hai jo session management ke liye perfect hai (scalable).
    const session = await redis.get(`session:${sessionId}`);

    // Agar session key Redis me exist nahi karti, matlab session expire/delete ho chuka hai.
    if (!session) {
      // 401 Unauthorized status with clear message.
      return res.status(401).json({
        message: "Session Expired"
      });
    }

    // WHAT: Redis me session data string (JSON) format me hota hai, isliye usko parse kar rahe hain.
    // Parsed data ko 'req.user' me daal rahe hain.
    // WHY: Taaki aage ke controllers (jaise getCurrentUser) ya downstream services is data ka use kar sake.
    req.user = JSON.parse(session);

    // Sab kuch theek hai, agle step (middleware/controller) par request forward kar do.
    next();
  } catch (error) {
    // Kisi bhi unhandled exception (jaise Redis connection fail hona) ko pakadne ke liye.
    return res.status(500).json({
      message: error.message
    });
  }
};