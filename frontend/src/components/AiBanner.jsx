// framer-motion se components import kar rahe hain. AnimatePresence component mount/unmount animations ke liye zaroori hai, aur motion ka use hum animated divs (elements) banane ke liye karte hain.
import { AnimatePresence, motion } from "framer-motion";
// lucide-react se icons import kiye gaye hain. AlertTriangle warning/info dikhane ke liye, aur X button close karne ke liye.
import { AlertTriangle, X } from "lucide-react";
// react se useEffect hook import kar rahe hain, kyunki humein component mount hone ke baad timer set karna hai (side-effect handle karna hai).
import { useEffect } from "react";

// AIBanner naam ka functional component export kar rahe hain, jo props receive karta hai: open (banner dikhana hai ya nahi), title (banner ka heading), message (description), onClose (close event handler).
export default function AIBanner({ open, title, message, onClose }) {

  // useEffect ka use yahan component lifecycle events ko handle karne ke liye kiya gaya hai.
  // Hum chahte hain ki banner open hone ke 5 seconds baad automatically close ho jaye.
  useEffect(() => {
    // Agar 'open' false hai (matlab banner band hai), toh kuch mat karo aur wahin se wapas laut jao (early return).
    if (!open) return;

    // Ek setTimeout lagaya hai jo 5000 milliseconds (5 seconds) baad chalega.
    // Jab time khatam hoga, toh parent component ka onClose() function call ho jayega, jisse banner close hoga.
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    // Cleanup function: Agar 5 second se pehle hi component unmount ho jaye ya 'open' state change ho jaye, 
    // toh purana timer clear ho jana chahiye. Isse memory leaks aur unexpected behavior bachega. (Interview tip: always clear timers!)
    return () => clearTimeout(timer);
  }, [open, onClose]); // Dependency array mein open aur onClose diya hai, taaki inke change hone par effect dobara run ho.

  return (
    // AnimatePresence isliye use kiya hai taaki jab element DOM se remove ho, toh exit animation smoothly chal sake.
    <AnimatePresence>
      {/* Agar open true hai, tabhi banner UI render hoga (Conditional Rendering) */}
      {open && (
        // motion.div ko animate karne ke liye use kiya hai
        <motion.div
          // initial: element start kahan se hoga (y-axis pe -30px upar aur invisible/opacity 0)
          initial={{ y: -30, opacity: 0 }}
          // animate: element ka final state kya hoga (y-axis 0 yani original position, aur fully visible/opacity 1)
          animate={{ y: 0, opacity: 1 }}
          // exit: element jab remove hoga toh kahan jayega (wapas upar -30px aur invisible)
          exit={{ y: -30, opacity: 0 }}
          // transition: animation kitni der chalegi (0.2 seconds ki smooth entry/exit)
          transition={{ duration: 0.2 }}
          // Tailwind CSS classes styling ke liye: fixed positioning, top se 5, horizontal center (left-1/2 -translate-x-1/2), high z-index (z-[999]) taaki sabke upar dikhe.
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] w-[92%] max-w-xl"
        >
          {/* Main banner container jisme dark background aur borders hain */}
          <div className="rounded-2xl border border-amber-500/20 bg-[#14161b] shadow-2xl overflow-hidden">
            {/* Banner ke top par ek gradient line dikhane ke liye (UI enhancement) */}
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            
            {/* Content area: Icon, text, aur close button ko flex me horizontally align kiya hai */}
            <div className="flex items-start gap-4 p-5">
              
              {/* Alert icon ka container. Isme halka amber background (bg-amber-500/10) diya hai depth ke liye. */}
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              
              {/* Flex-1 ensures ki text area baaki bachi hui saari space le le. */}
              <div className="flex-1">
                {/* Banner ka title, white color mein aur bold */}
                <h3 className="text-white font-semibold text-[15px]">
                  {title}
                </h3>
                {/* Banner ka message, thoda muted/slate color mein detail dikhane ke liye */}
                <p className="mt-1 text-slate-400 text-sm leading-6">
                  {message}
                </p>
              </div>
              
              {/* Close button: user agar 5 sec se pehle manually close karna chahe */}
              <button
                onClick={onClose} // Click hone par onClose function call hoga
                className="text-slate-500 hover:text-white" // Hover effect
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}