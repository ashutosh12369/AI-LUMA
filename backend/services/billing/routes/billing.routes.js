/**
 * Billing Routes: Exposes endpoints for creating orders and handling Razorpay webhooks.
 */

import express from "express";
import { createOrder, verifyPayment } from "../controllers/billing.controller.js";
const router = express.Router();
router.post(
    "/create-order",
    createOrder
);
router.post(
    "/verify-payment",
    verifyPayment
);
export default router;
