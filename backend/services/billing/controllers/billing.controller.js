// Razorpay SDK import kar rahe hain, jo instance `razorpay.js` mein api keys ke sath initialize hua hai.
import razorpay from "../config/razorpay.js";
// PLANS ek object hai jisme alag-alag subscription plans ki details (amount, credits) hardcoded hain.
import { PLANS } from "../config/plans.js";
// Payment MongoDB model, taaki transaction ki details DB mein save kar sakein.
import Payment from "../models/payment.model.js";
// Node.js ka inbuilt crypto module. Ye Razorpay ke webhook signature ko verify karne ke kaam aayega (Security).
import crypto from "crypto";
// Axios ka use karke hum Billing Service se Auth Service tak internal API call karenge (Plan update karne ke liye).
import axios from "axios";

// === STEP 1: CREATE ORDER ===
// Jab user frontend par 'Upgrade' button click karta hai, toh ye function chalta hai.
export const createOrder = async (req, res) => {
  try {
    // User ne frontend se konsa plan select kiya hai? (e.g. "PRO", "ULTIMATE")
    const { plan } = req.body;
    // API Gateway ne jo user ID nikali thi JWT token se, wo request headers mein bhej di hai.
    const userId = req.headers["x-user-id"];

    // PLANS config se us specific plan ka amount aur credits nikal lo.
    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      // Agar kisi ne frontend ko bypass karke galat plan bheja toh reject kardo.
      return res.status(400).json({
        success: false,
        message: "Invalid plan"
      });
    }

    // Razorpay ke server par ek order create kar rahe hain. 
    const order = await razorpay.orders.create({
      // Razorpay hamesha paise 'paise' (sub-units) mein leta hai, isliye INR amount ko 100 se multiply karna padta hai.
      amount: selectedPlan.amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    // Razorpay order create hone ke baad, use MongoDB mein save kar lo status "created" ke sath.
    await Payment.create({
      userId,
      orderId: order.id,
      amount: selectedPlan.amount,
      credits: selectedPlan.credits,
      plan: selectedPlan.id,
      currency: order.currency,
      status: "created" // Payment abhi successful nahi hua hai, sirf order bana hai.
    });

    // Frontend ko order details return kardo taaki wo Razorpay ka popup khol sake.
    return res.json({
      success: true,
      order,
      plan: selectedPlan
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// === STEP 2: VERIFY PAYMENT ===
// Jab user popup mein actually paise de deta hai, toh Razorpay frontend ko ek payment_id aur signature deta hai.
// Frontend un details ko is API par bhejta hai verify karne ke liye.
export const verifyPayment = async (req, res) => {
    try {
        // Frontend ne Razorpay se mili hui 3 zaruri cheezein bheji hain.
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature // Ye ek encrypted hash hota hai.
        } = req.body;

        // SERVER-SIDE SECURITY CHECK (Signature Verification):
        // Hamein check karna hai ki ye payment sach mein Razorpay se hui hai ya koi user fake request bhej raha hai.
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) // Apne secret key se hash banao
            .update(`${razorpay_order_id}|${razorpay_payment_id}`) // Order ID + Payment ID combine karo
            .digest("hex"); // Hex format mein convert karo

        // Agar hamara banaya hua signature aur Razorpay ka signature match NAHI karta...
        if (generatedSignature !== razorpay_signature) {
            // Toh iska matlab kisine beech mein data tamper (change) kiya hai. Hacker alert!
            return res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }

        // Agar signature sahi hai, toh Database mein wo pending order dhoondho.
        const payment = await Payment.findOne({
            orderId: razorpay_order_id
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Database mein payment ka status "created" se badal kar "paid" kar do.
        payment.status = "paid";
        payment.paymentId = razorpay_payment_id;
        await payment.save();

        // === INTER-SERVICE COMMUNICATION ===
        // Paise toh mil gaye, par ab user ka account upgrade bhi karna padega. 
        // User ka data 'Auth Service' mein rakha hai. Isliye yahan se ek HTTP request Auth service ko ja rahi hai (Webhook style).
        const authServiceUrl = "https://ailuma-auth-service.onrender.com";
        await axios.patch(
            `${authServiceUrl}/internal/update-plan`,
            {
                userId: payment.userId,
                plan: payment.plan,
                credits: payment.credits // User ke account mein credits badha do.
            }
        );

        // Frontend ko success message bhej do, jisse screen par "Payment Successful" dikh jaye.
        return res.json({
            success: true,
            message: "Payment verified successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};