// framer-motion UI elements ko conditionally animate (fade-in, slide-in) karne ke liye.
import { AnimatePresence, motion } from "framer-motion";
// lucide-react icons (X = close, Crown = premium, Zap = fast).
import { X, Crown, Zap } from "lucide-react";
// React hooks state manage karne aur side-effects chalane ke liye.
import { useState, useEffect } from "react";
// react-redux store se global data fetch karne ke liye (jese user details).
import { useSelector } from "react-redux";
// Billing API calls - backend pe order create karne ke liye.
import { createOrder } from "../features/billing.api";
// Custom axios instance jisme interceptors/tokens ho sakte hain.
import api from "../utils/axios";

// BillingDrawer ek Right-side sliding panel hai jo plans aur credits show karta hai.
export default function BillingDrawer({ open, onClose }) {

  // Redux se logged-in user ka data le rahe hain. Isme credits, totalCredits aur plan honge.
  const {userData}=useSelector(state=>state.user)
  
  // handleUpgrade function: Jab user "Upgrade" button dabayega tab chalega. Async function hai.
  const handleUpgrade = async (plan) => {
    try {
      // 1. Backend ko request bhejo ki 'plan' ke hisaab se order banao (Razorpay order).
      const data = await createOrder(plan);

      // 2. Razorpay configuration options set karo. (Interview Tip: Gateway integration process).
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY, // Environment variable se public key li
        amount: data.order.amount, // Paise (in paise, so ₹100 = 10000)
        currency: data.order.currency, // "INR" mostly
        name: "AI-LUMA", // Payment popup par kya naam dikhega
        description: `${data.plan.name} Plan`,
        order_id: data.order.id, // Backend se jo unique order_id aayi, wo Razorpay ko dena zaroori hai.
        
        // 3. Callback function (handler) jo tab chalega jab payment successful ho jayegi.
        handler: async (response) => {
          try {
            // Payment success hone par razorpay se signature milta hai.
            // Hum ye data apne backend bhej kar VERIFY karate hain ki payment genuine hai ya nahi (Security measure).
            const {data}=await api.post(
              "/api/billing/verify-payment",
              response
            );
            console.log(data)
          } catch (error) {
            console.log(error);
          }
        },
        theme: {
          color: "#4F46E5" // Payment modal ka color theme
        }
      };

      // 4. Checking if script loaded. Razorpay ka SDK index.html me include hota hai.
      if (!window.Razorpay) {
        alert("Razorpay failed to load. Please disable ad-blockers or try again later.");
        return;
      }

      // 5. Razorpay object instance create karke open karna jisse user ko QR/Card options dikhein.
      const razorpay = new window.Razorpay(options);
      
      // Error handling listener for failed payments
      razorpay.on('payment.failed', function (response){
        alert("Payment failed: " + response.error.description);
      });
      
      razorpay.open();
    } catch (error) {
      console.log(error);
      alert("Failed to initiate payment: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    // AnimatePresence ensure karta hai ki exit() wale animations pura hone ke baad element DOM se remove ho.
    <AnimatePresence>
      {open && ( // Agar 'open' prop true hai toh drawer dikhao
        <>
          {/* Backdrop Element (Background Tint) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: .5 }} // 50% opacity
            exit={{ opacity: 0 }}
            onClick={onClose} // Background pe click karne se onClose chal jayega (better UX)
            className="fixed inset-0 bg-black z-40" // Z-40 ensure karta hai ye page content ke upar aaye
          />

          {/* Actual Drawer Component */}
          <motion.div
            initial={{ x: "100%" }} // Start off-screen (Right)
            animate={{ x: 0 }} // Slide into screen
            exit={{ x: "100%" }} // Slide back out
            transition={{ duration: .25 }} // Speed 0.25s
            className="fixed right-0 top-0 z-50 h-screen w-[100vw] max-w-[380px] bg-[#0f1117] border-l border-white/10 shadow-2xl flex flex-col"
          >

            {/* Header Area */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-white text-lg font-semibold">Billing</h2>
                <p className="text-slate-400 text-sm">Plans & Credits</p>
              </div>
              
              {/* Close Icon Button */}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X size={18} className="text-slate-300"/>
              </button>
            </div>

            {/* Current Plan Card Section */}
            <div className="p-5">
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                
                {/* Upper part: Title and Icon */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-400 text-sm">Current Plan</p>
                    <h3 className="text-white text-xl font-bold">
                     {/* Agar userData me plan nahi hai, toh fallback me 'Pro' show karo */}
                     {userData?.plan ?? "Pro"}
                    </h3>
                  </div>
                  <Crown className="text-yellow-400"/>
                </div>

                {/* Lower part: Progress Bar for Credits */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Credits</span>
                    <span>{userData?.credits || 0}/{userData?.totalCredits || 0}</span>
                  </div>

                  {/* Progress bar container (Grey bar) */}
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  
                  {/* Progress bar fill (Gradient color) */}
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500 transition-all duration-500"
                    style={{
                      // Inline styling width calculate karke de raha hai percentage me.
                      // Division by 1 kiya gaya hai taaki 0/0 (NaN) error se bacha ja sake. (Math Trick for Interview)
                      width: `${
                        (
                          (userData?.credits || 0) /
                          (userData?.totalCredits || 1)
                        ) * 100
                      }%`
                    }}
                  />
                  </div>
                </div>
              </div>
            </div>

            {/* Available Upgrade Plans Section. flex-1 overflow-auto enables internal scrolling */}
            <div className="px-5 flex-1 overflow-auto space-y-4">

              {/* Starter Plan Box */}
              <div className="rounded-xl border border-white/10 p-4">
                <h3 className="text-white font-semibold">Starter</h3>
                <p className="text-indigo-400 text-2xl font-bold mt-2">₹199</p>
                <p className="text-slate-400 text-sm mt-1">500 Credits</p>
                
                <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500 hover:opacity-90 py-2 text-white font-medium shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-opacity" onClick={()=>handleUpgrade("starter")}>
                  Upgrade
                </button>
              </div>

              {/* Pro Plan Box - Isme highlight details hain jese border color and badge */}
              <div className="rounded-xl border border-indigo-500 p-4 relative">
                
                {/* Popular Badge absolute positioning use karke box ke corner me rakha hai */}
                <span className="absolute right-3 top-3 text-xs bg-indigo-600 px-2 py-1 rounded-full text-white">
                  Popular
                </span>

                <h3 className="text-white font-semibold flex items-center gap-2">
                  Pro
                  <Zap size={16} className="text-yellow-400"/>
                </h3>
                
                <p className="text-indigo-400 text-2xl font-bold mt-2">₹499</p>
                <p className="text-slate-400 text-sm mt-1">1000 Credits</p>
                
                <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500 hover:opacity-90 py-2 text-white font-medium shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-opacity" onClick={()=>handleUpgrade("pro")}>
                  Upgrade
                </button>
              </div>
            </div>

            {/* Footer Section */}
            <div className="p-5 border-t border-white/10">
              <p className="text-xs text-slate-500">
                Credits are used for Image, PDF, PPT and AI Generation.
              </p>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}