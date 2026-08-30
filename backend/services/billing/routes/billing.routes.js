// Express framework import, jisme Router available hota hai API path mapping ke liye.
import express from "express";
// Controllers se specific functions import kiye jo logic handle karte hain order/payment ka.
// Why? Modular code hone se route definitions clean rehti hain aur logic separate file me.
import { createOrder, verifyPayment } from "../controllers/billing.controller.js";

// Naya router instance create kiya, iske upar route handlers mount kiye jayenge.
const router = express.Router();

// POST route banaya gaya "/create-order" ke liye. Payment gateway ka order/intent yahan banta hai.
// What? User client se request bhejega item buy karne ko tab ye route hit hoga.
router.post(
    "/create-order",
    createOrder
);

// POST route banaya gaya "/verify-payment" ke liye.
// Why? Payment successful hone ke baad (jaise Razorpay/Stripe se wapas aane par) frontend ye call karega verify/validate karne ke liye ki payment sach me aayi hai na.
router.post(
    "/verify-payment",
    verifyPayment
);

// Exports the router module so the billing service's main entry file (index.js) can use it.
export default router;