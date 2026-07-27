import MessageBubble from "./MessageBubble";
import Logo from "./Logo";

import { useDispatch, useSelector } from "react-redux";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages, removeLastMessage } from "../redux/message.slice";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDown } from "lucide-react";

function NeuralPulse() {
  return (
    <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
      {[0, 0.45, 0.9].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-cyan-400/30"
          initial={{ scale: 0.3, opacity: 0.55 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.span
        className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400"
        style={{ boxShadow: "0 0 14px rgba(125,211,252,0.55)" }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

const THINKING_LABELS = ["Thinking", "Analyzing", "Reasoning", "Generating"];

function GeneratingIndicator() {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % THINKING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const label = THINKING_LABELS[labelIndex];

  return (
    <div className="flex items-center gap-3 max-w-[72%] py-1">
      <NeuralPulse />
      <div className="flex overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            className="flex"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {label.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="text-[13px] font-medium tracking-wide text-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.07,
                }}
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

export default function MessageList() {

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const { messages, isLoading } = useSelector(state => state.message);
  const { selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const sentinel = bottomRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollBtn(!entry.isIntersecting);
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [messages.length, isLoading]);

useEffect(() => {

  requestAnimationFrame(() => {

    bottomRef.current?.scrollIntoView({

      behavior: "smooth",

      block: "end"

    });

  });

}, [messages.length, isLoading]);
  useEffect(() => {
    if (selectedConversation?.title === "New Chat") return;
    const get = async () => {
      const data = await getMessages(selectedConversation?._id);
      dispatch(setMessages(data));
      const latestArtifactMessage =
  [...data]
    .reverse()
    .find(
      msg =>
        msg.artifacts &&
        msg.artifacts.length > 0
    );

if (latestArtifactMessage) {

  dispatch(
    setArtifacts(
      latestArtifactMessage.artifacts
    )
  );

}
    };
    get();
  }, [selectedConversation?._id]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const lastAiIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== "user") return i;
    }
    return -1;
  })();

  const handleRegenerate = useCallback((idx) => {
    dispatch(removeLastMessage());
  }, [dispatch]);

  const handleEdit = useCallback((content, idx) => {
    window.dispatchEvent(new CustomEvent("editPrompt", { detail: { content, index: idx } }));
  }, []);

  const handleSuggestionClick = (s) => {
    window.dispatchEvent(new CustomEvent("editPrompt", { detail: { content: s } }));
  };

  return (
    <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {messages.length === 0 && !isLoading ? (
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

          <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 w-full overflow-x-auto snap-x snap-mandatory px-4 md:px-0 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              {
                title: "CODE GENERATION:",
                subtitle: "Software Development",
                desc: "Generate complete applications or components.",
                prompt: "Write a React application"
              },
              {
                title: "EXPLANATION:",
                subtitle: "Complex Concepts",
                desc: "Break down and explain difficult topics.",
                prompt: "Explain quantum computing simply"
              },
              {
                title: "DATA ANALYSIS:",
                subtitle: "Data Visualization",
                desc: "Analyze and visualize your datasets.",
                prompt: "Analyze this data for trends"
              }
            ].map((card, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(card.prompt)}
                className="glass-card flex flex-col items-start text-left p-4 md:p-5 rounded-2xl cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 group shrink-0 w-[260px] md:w-auto snap-center"
              >
                <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-colors">
                    <span className="text-lg md:text-xl opacity-80">{idx === 0 ? "N" : idx === 1 ? "📚" : "📊"}</span>
                  </div>
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
        <>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <MessageBubble
                role={msg.role}
                content={msg.content}
                images={msg?.images || []}
                onRegenerate={handleRegenerate}
                onEdit={handleEdit}
                isLast={i === lastAiIndex}
                index={i}
              />
            </motion.div>
          ))}

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
        <div ref={bottomRef} />

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