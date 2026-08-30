// =========================================================================
// Interview Prep: user.controller.js
// WHY: Yeh controller frontend (ya dusre services) ko logged-in user ka 
// data provide karne ke liye banaya gaya hai. 
// WHAT: getCurrentUser function request me aayi user information ko extract 
// karke JSON response me bhejta hai.
// =========================================================================

// getCurrentUser ek asynchronous function hai. Async isliye kyunki future me shayad
// hume database calls karni pade, halanki abhi hum directly req.user use kar rahe hain.
export const getCurrentUser = async (req, res) => {
  try {
    // WHAT: req.user se user details nikal kar response me bhej rahe hain.
    // WHY: Authentication middleware ne pehle hi req.user me data populate kar diya hai.
    // 200 OK status code indicate karta hai ki request successful rahi.
    return res.status(200).json({
      success: true, // Frontend ko success state easily pata chal jaye
      user: req.user // Current user ka session/data payload
    });
  } catch (error) {
    // WHAT: Agar try block me koi unexpected error aata hai, toh usko catch karte hain.
    // WHY: Server crash na ho aur client ko ek proper 500 (Internal Server Error) code mile.
    return res.status(500).json({
      success: false,
      message: error.message // Error ki details debugging ke liye bhej rahe hain
    });
  }
};