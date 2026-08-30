// Pehle banaye gaye custom components import kar rahe hain. MessageBubble actual chat render karega, Logo default screen ke liye.
import MessageBubble from "./MessageBubble";
import Logo from "./Logo";

// Redux hooks aur APIs import kiye. Global state aur backend interaction yahan se hogi.
import { useDispatch, useSelector } from "react-redux";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages, removeLastMessage } from "../redux/message.slice";

// framer-motion library ka use UI me smooth entry/exit animations (Pulse effect wagera) dene ke liye
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDown } from "lucide-react";

// NeuralPulse component: AI jab soch raha (loading state) ho toh ek glowing circle/pulse animation dikhane ke liye.
function NeuralPulse() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
      {/* 3 expanding rings banane ke liye loop lagaya (0, 0.45, 0.9 sec delay se start honge) */}
      {[0, 0.45, 0.9].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-cyan-400/30"
          initial={{ scale: 0.3, opacity: 0.55 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
        />
      ))}
      {/* Inner glowing dot/core */}
      <motion.span
        className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400"
        style={{ boxShadow: "0 0 14px rgba(125,211,252,0.55)" }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// "Thinking" labels jo AI generate karte waqt loop honge (UX improve karne ke liye, text change hota rahega).
const THINKING_LABELS = ["Thinking", "Analyzing", "Reasoning", "Generating"];

// GeneratingIndicator component: Loading state dikhane ke liye (Pulse + text cycle hoga)
function GeneratingIndicator() {
  const [labelIndex, setLabelIndex] = useState(0);

  // Har 1.8 second me agla word change karne ke liye setInterval lagaya.
  useEffect(() => {
    const interval = setInterval(() => {
      // Modulo operator (%) list length pe cycle karne ke kaam aata hai (0, 1, 2, 3, wapas 0)
      setLabelIndex((prev) => (prev + 1) % THINKING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval); // Component remove hone pe timer clear karna zaruri hai (memory leak bachane ke liye)
  }, []);

  const label = THINKING_LABELS[labelIndex];

  return (
    <div className="flex items-center gap-3 max-w-[72%] py-1">
      <NeuralPulse />
      <div className="flex overflow-hidden">
        {/* AnimatePresence mode="wait": Naya word aane se pehle purana fade-out/slide-up hoga */}
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            className="flex"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* String ko split karke har letter ko individually pulse kara rahe hain (wave effect) */}
            {label.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="text-[13px] font-medium tracking-wide text-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }} // delay increment ho raha hai
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// MessageList component: Sare chat bubbles ko list form me display karta hai aur scroll manage karta hai.
export default function MessageList() {
  
  // DOM elements track karne ke liye useRef ka use:
  // bottomRef: List ke sabse aakhir me point karega taaki waha autoscroll kara sakein.
  // scrollContainerRef: Div jisme scrolling chal rahi hai.
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // showScrollBtn: Floating "scroll to bottom" arrow kab dikhana hai uska state.
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  // Redux store se messages, loading state, aur selected conversation laa rahe hain
  const { messages, isLoading } = useSelector((state) => state.message);
  const { selectedConversation } = useSelector((state) => state.conversation);
  const dispatch = useDispatch();

  // IntersectionObserver API ka use: Scroll position track karne ka modern aur performant tarika.
  // Ye check karega ki "bottomRef" screen (viewport) pe visible hai ya nahi.
  useEffect(() => {
    const container = scrollContainerRef.current;
    const sentinel = bottomRef.current;
    if (!container || !sentinel) return;

    // Agar intersection ratio 0.1 se kam hai (matlab bottom hide ho gaya), to button dikhao (!entry.isIntersecting)
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollBtn(!entry.isIntersecting);
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect(); // Observer hamesha clean karna chahiye jab jarurat na ho
  }, [messages.length, isLoading]);

  // Auto-scroll logic: Jab bhi naya message aaye (length change ho) ya loading shuru/khatam ho, neeche scroll kar do.
  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages.length, isLoading]);

  // Chat Data Fetching logic: Jab user side panel se chat badle (selectedConversation change ho), naye messages fetch karo.
  useEffect(() => {
    // Agar default naya chat hai toh call mat maaro.
    if (selectedConversation?.title === "New Chat") return;
    
    const get = async () => {
      // Backend se specific conversation_id ke messages layenge
      const data = await getMessages(selectedConversation?._id);
      dispatch(setMessages(data)); // Redux me save karenge
      
      // Right side panel ke liye, sabse latest aesa message dhundo jisme 'artifacts' (code snippets) ho.
      const latestArtifactMessage = [...data].reverse().find((msg) => msg.artifacts && msg.artifacts.length > 0);
      if (latestArtifactMessage) {
        dispatch(setArtifacts(latestArtifactMessage.artifacts));
      }
    };
    get();
  }, [selectedConversation?._id]);

  // Scroll to bottom button par click hone pe
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Array backwards loop lagaya ye check karne ke liye ki AI (assistant) ka last message konsa hai. 
  // Last AI message par "Regenerate" button enable hoga.
  const lastAiIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== "user") return i;
    }
    return -1;
  })();

  // Regenerate Response action. useCallback use karke function object cache kiya hai taaki unnecessary re-renders na ho.
  const handleRegenerate = useCallback((idx) => {
    // Last message Redux se hata rahe hain, backend ko naya prompt jayega (Isme logic aur deep hai, abhi bas delete kar rahe)
    dispatch(removeLastMessage());
  }, [dispatch]);

  // User ka prompt edit karne par "editPrompt" naam ka CustomEvent banaya (Event Bus pattern). 
  // ChatInput component is event ko sune ga aur usme edit text dal dega.
  const handleEdit = useCallback((content, idx) => {
    window.dispatchEvent(new CustomEvent("editPrompt", { detail: { content, index: idx } }));
  }, []);

  const handleSuggestionClick = (s) => {
    window.dispatchEvent(new CustomEvent("editPrompt", { detail: { content: s } }));
  };

  return (
    // Main scrolling container
    <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      
      {/* Conditional Rendering: Agar chat khali hai (0 messages) aur API loading me nahi hai, tab "Empty State" ya "Welcome Screen" dikhao */}
      {messages.length === 0 && !isLoading ? (
        
        // Welcome Screen Layout
        <div className="h-full flex flex-col items-center justify-start md:justify-center text-center px-0 md:px-4 w-full max-w-5xl mx-auto pb-4 pt-2 md:pt-0">
          
          <div className="scale-75 md:scale-100 transform origin-top mb-[-1rem] md:mb-0">
            <Logo />
          </div>

          <h3 className="text-[20px] md:text-[24px] mt-0 md:mt-2 font-medium text-slate-200 tracking-tight">
            How can I help you?
          </h3>
          <p className="text-[13px] md:text-[15px] text-slate-400 mt-1.5 md:mt-2 mb-4 md:mb-10 max-w-[400px] leading-relaxed px-4">
            Ask me anything — code, ideas, explanations, or just a quick question.
          </p>

          {/* Prompt Suggestions Grid (Abhi loop ka data empty hai, idhar sample data rakhna chahiye real app me) */}
          <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 w-full overflow-x-auto snap-x snap-mandatory px-4 md:px-0 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[/* suggestion cards */].map((card, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(card.prompt)}
                className="glass-card flex flex-col items-start text-left p-4 md:p-5 rounded-2xl cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-colors duration-300 group shrink-0 w-[260px] md:w-auto snap-center"
              >
                <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
                  {/* Decorative Icon */}
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-colors">
                    <span className="text-lg md:text-xl opacity-80">{idx === 0 ? "N" : idx === 1 ? "📚" : "📊"}</span>
                  </div>
                  {/* Suggestion Text */}
                  <div>
                    <p className="text-[9px] md:text-[10px] font-semibold text-slate-500 tracking-wider uppercase">{card.title}</p>
                    <p className="text-[13px] md:text-[15px] font-medium text-slate-200 group-hover:text-white transition-colors">{card.subtitle}</p>
                  </div>
                </div>
                <p className="text-[12px] md:text-[13px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {card.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

      ) : (
        
        // Chat History Rendering: Agar messages hai toh loop chalake har ek ko MessageBubble me render karo
        <>
          {messages.map((msg, i) => (
            // Jab naya message aaye to thoda y-axis me slide-up (bottom to top) animation de rahe hain
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* Actual Chat Bubble */}
              <MessageBubble
                role={msg.role}
                content={msg.content}
                images={msg?.images || []}
                onRegenerate={handleRegenerate}
                onEdit={handleEdit}
                isLast={i === lastAiIndex} // Taaki last message par Regenerate button aaye
                index={i}
              />
            </motion.div>
          ))}

          {/* Loading Indicator: Agar backend request chal rahi hai, toh "Thinking..." wala animation show karo */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <GeneratingIndicator />
            </motion.div>
          )}
        </>
      )}
      
      {/* Invisible Div (Sentinel): Ye list ke end me hamesha rahega taaki hum us tak auto-scroll kara sakein (scrollIntoView) */}
      <div ref={bottomRef} />

      {/* Floating Scroll-to-bottom Button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 rounded-full bg-white/10 border border-white/10 text-slate-300 hover:bg-white/20 hover:text-white backdrop-blur-sm shadow-lg transition-colors cursor-pointer"
            title="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}