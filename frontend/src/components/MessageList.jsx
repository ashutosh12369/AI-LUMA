import MessageBubble from "./MessageBubble";

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
          className="absolute inset-0 rounded-full border border-teal-400/30"
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
        className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-teal-300 to-amber-400"
        style={{ boxShadow: "0 0 14px rgba(94,234,212,0.55)" }}
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
    <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {messages.length === 0 && !isLoading ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-col gap-1.5">
            <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-spin" style={{animationDuration: '8s'}} />
              <div className="absolute inset-2 rounded-full border border-cyan-400/15 animate-spin" style={{animationDuration: '12s', animationDirection: 'reverse'}} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 shadow-[0_0_20px_rgba(20,184,166,0.4)]" />
              </div>
            </div>
            <h1 className="text-[28px] md:text-[32px] font-extrabold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">LUMA</h1>
            <h3 className="text-[15px] font-semibold text-slate-400 tracking-tight">How can I help you today?</h3>
            <p className="text-[13px] text-slate-600 max-w-[260px] leading-relaxed">Ask me anything — code, ideas, explanations, or just a quick question.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {["Write a Netflix clone", "Explain Redis", "Build a dashboard"].map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="text-[12px] text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3.5 py-1.5 rounded-lg hover:bg-teal-500/10 hover:border-teal-500/20 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
              >
                {s}
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