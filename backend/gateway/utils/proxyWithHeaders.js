// =========================================================================
// Interview Prep: proxyWithHeaders.js
// WHY: Jab hum API Gateway se requests ko dusri microservices par forward/proxy karte hain,
// toh hume user details bhi bhejni hoti hain (jaise user id).
// WHAT: Yeh utility 'express-http-proxy' ka use karke downstream service tak 
// request forward karti hai aur raste me custom headers (x-user-id, etc.) add kar deti hai.
// =========================================================================

import proxy from "express-http-proxy";

// 'proxyWithUser' ek higher-order function hai jo serviceUrl (downstream microservice ka URL) 
// accept karta hai aur ek configured proxy middleware return karta hai.
export const proxyWithUser = (serviceUrl) => {
  // Proxy setup return kar rahe hain.
  return proxy(serviceUrl, {
    // WHAT: parseReqBody ko false kiya gaya hai.
    // WHY: Agar request body pehle hi Gateway par parse ho jaye, toh proxy downstream 
    // ko payload bhejte waqt corrupt kar sakti hai ya issues de sakti hai (streams consume ho jati hain).
    parseReqBody: false,

    // WHAT: proxyReqOptDecorator proxy request ke options/headers modify karne me madad karta hai
    // isse pehle ki woh actual service tak pahuche.
    // WHY: Hum backend microservices ko HTTP headers ke through batana chahte hain ki request kis user ne ki hai.
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Check karte hain ki req.user exist karta hai ya nahi (jo auth middleware set karta hai).
      if (srcReq.user) {
        // Downstream microservice ab 'x-user-id' header se user ko identify kar legi.
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

        // Email aur avatar ko bhi headers me bhej rahe hain taaki dusre services directly access kar sake.
        proxyReqOpts.headers["x-user-email"] = srcReq.user.email;
        proxyReqOpts.headers["x-user-avatar"] = srcReq.user.avatar;
      }

      // Github token integration. Agar frontend se github token header me aaya hai,
      // toh usko hum downstream service me bhi pass/forward kar rahe hain.
      if (srcReq.headers["x-github-token"]) {
        proxyReqOpts.headers["x-github-token"] = srcReq.headers["x-github-token"];
      }

      // Modified options (headers) return karte hain jo microservice ko bheje jayenge.
      return proxyReqOpts;
    }
  });
};