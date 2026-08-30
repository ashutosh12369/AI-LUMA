import express from "express";

import {
    deductCredits,
 login,
 logout,
 updatePlan
}
from "../controllers/auth.controllers.js";

// Interview Prep: Express Router Setup
// What: Express se router object initiate kar rahe hain.
// Why: Modularity badhane ke liye taaki routes ko alag files me define karke main server me plug kar sakein.
const router =
express.Router();

// Interview Prep: Route Definitions
// What: 'POST /login' endpoint map ho raha hai login controller pe.
// Why: POST request isliye use ki hai kyunki request body me token payload bhejna secure hota hai compared to GET.
router.post("/login",login);

// What: 'GET /logout' endpoint map ho raha hai logout controller pe.
// Why: Isme koi sensitive payload nahi jaana (sirf cookies clear karni hain), isliye GET method chalega.
router.get("/logout",logout);

// What: 'PATCH /internal/update-plan' endpoint.
// Why: PATCH use kiya hai kyunki hum sirf specific fields (plan, credits) partially update kar rahe hain.
router.patch(
    "/internal/update-plan",
    updatePlan
);

// What: 'PATCH /internal/deduct-credits' endpoint.
// Why: Partially updating credits (balance reduce karna).
router.patch(

"/internal/deduct-credits",

deductCredits

);


// What: Router ko export karna jise index file use karegi.
// Why: Node.js/ES6 module system ka hissa hai. App isey import karega middleware ke roop me.
export default router;