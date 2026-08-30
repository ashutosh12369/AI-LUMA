// React se zaroori hooks import kiye hain (useState local state manage karne ke liye)
import { useState } from "react";

// react-markdown package, markdown text ko HTML elements me convert karne ke kaam aata hai (Interview Tip: parsing Markdown)
import ReactMarkdown from "react-markdown";
// remark-gfm ek plugin hai jo GitHub Flavored Markdown (tables, strikethrough, tasklists) support enable karta hai
import remarkGfm from "remark-gfm";

// react-icons aur lucide-react se icons import kar rahe hain UI buttons ke liye
import { FiExternalLink, FiX } from "react-icons/fi";
import { Copy, Check, RefreshCw, Pencil, Volume2, VolumeX } from "lucide-react";

// react-syntax-highlighter code blocks ke syntax ko VSCode jaisa highlight karne ke kaam aata hai
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// Dark theme apply kar rahe hain code blocks par
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// MessageBubble component: Ek single chat bubble (user ya AI ka) render karta hai
function MessageBubble({ role, content, images, onRegenerate, onEdit, isLast, index }) {
  
  // Check kar rahe hain ki message user ka hai ya AI (assistant) ka
  const isUser = role === "user";
  
  // Local States:
  // lightboxSrc: Agar user kisi image par click kare, toh usko bada (full screen) dikhane ke liye image source isme rakhte hain
  const [lightboxSrc, setLightboxSrc] = useState(null);
  
  // copiedCode: Track karta hai kaunsa specific code block abhi copy hua hai (taaki 'Check' icon dikha sakein)
  const [copiedCode, setCopiedCode] = useState("");
  
  // copiedMessage: Track karta hai ki kya pura message copy hua hai
  const [copiedMessage, setCopiedMessage] = useState(false);
  
  // isSpeaking: Track karta hai ki text-to-speech API abhi message padh raha hai ya nahi
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Function: Code block ka snippet clipboard mein copy karna
  const copyCode = async (code) => {
    // navigator.clipboard API browser natively provide karta hai
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    // 2 second baad wapas tick mark se 'Copy' button dikhane ke liye reset kar do
    setTimeout(() => {
      setCopiedCode("");
    }, 2000);
  };

  // Function: Pura text message clipboard mein copy karna
  const copyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    setTimeout(() => {
      setCopiedMessage(false);
    }, 2000);
  };

  // Function: Text-to-Speech (AI ka reply bol ke sunana)
  const toggleSpeech = () => {
    if (isSpeaking) {
      // Agar pehle se bol raha hai, toh cancel kar do (Web Speech API)
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // SpeechSynthesisUtterance ek naya object banata hai us text ka jo bolna hai
      const utterance = new SpeechSynthesisUtterance(content);
      
      // Events set kar rahe hain taaki jab bolna khatam ho ya error aaye, toh button wapas normally set ho jaye
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      // speak() function actual voice generate karta hai
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Markdown pre-processing:
  // Regex (Regular Expressions) use karke kuch unwanted markdown tags ko clean kar rahe hain. 
  // Jaise ```review ya extra IDs jo LLMs kabhi kabhi output kar dete hain, unko normal ``` me badal rahe hain.
  const markdown = (content || "")
    .replace(/```review/gi, "```")
    .replace(/```text/gi, "```")
    .replace(/```[a-zA-Z0-9_-]+\s+id="[^"]*"/g, "```");
    
  return (
    // Message container. Agar 'isUser' true hai toh message Right align (items-end) hoga, warna Left align (items-start) hoga.
    <div className={`group/msg flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      
      {/* Bubble position wrapper */}
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
        
        {/* Actual Message Box */}
        <div
          className={`relative w-fit max-w-[92vw] md:max-w-[72%] px-4 py-2.5 rounded-2xl break-words overflow-hidden leading-relaxed
          ${
            isUser
              ? "bg-gradient-to-r from-teal-400/90 via-indigo-500/90 to-purple-500/90 text-white rounded-tr-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]" // User Styling (Gradient)
              : " text-slate-200 rounded-tl-sm glass-card p-4" // AI Styling (Glassmorphism)
          }`}
        >
          {/* Image attachments render kar rahe hain */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {/* Har image pe map chala ke dikha rahe hain */}
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  loading="lazy" // Lazy loading se off-screen images turant load nahi hote, bandwidth bachti hai
                  onClick={() => setLightboxSrc(img)} // Click pe image popup (lightbox) khulega
                  onError={(e) => e.currentTarget.remove()} // Agar image link broken hai toh image DOM se hata do
                  className="w-40 h-28 rounded-xl object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition"
                />
              ))}
            </div>
          )}

          {/* Markdown Rendering Section */}
          {/* ReactMarkdown components prop leta hai jisme hum har HTML tag ka apna custom React component pass kar sakte hain */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Heading 1 ko custom Tailwind classes di
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-5 mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold mt-4 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>,
              
              // Paragraph text spacing
              p: ({ children }) => <p className="mb-3 whitespace-pre-wrap break-words">{children}</p>,
              
              // Lists ko styling dena
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
              
              // Tables: Responsive design ke liye overflow-x-auto container me dala (Interview tip)
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border border-white/10">{children}</table>
                </div>
              ),
              th: ({ children }) => <th className="border border-white/10 bg-white/5 px-3 py-2 text-left">{children}</th>,
              td: ({ children }) => <td className="border border-white/10 px-3 py-2">{children}</td>,
              
              // Anchor links: External link kholne ke liye target="_blank" lagana chahiye. Security ke liye rel="noreferrer" zaroori hai.
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-1">
                  {children}
                  <FiExternalLink size={11} />
                </a>
              ),
              
              // Inline markdown images support
              img: ({ src }) => {
                if (!src) return null;
                return (
                  <img
                    src={src}
                    loading="lazy"
                    onClick={() => setLightboxSrc(src)}
                    onError={(e) => e.currentTarget.remove()}
                    className="w-40 h-28 rounded-xl object-cover cursor-pointer"
                  />
                );
              },
              
              // Code Blocks rendering logic (Inline code vs Multiline blocks)
              code: ({ className, children }) => {
                console.log(children);
                const value = String(children)
                  .replace(/^\s*```[^\n]*\n/, "") // Extra markdown backticks nikal rahe hain
                  .replace(/\n```\s*$/, "")
                  .trim();

                // Agar 'className' nahi hai, iska matlab ye sirf ek line ka (inline) code hai
                if (!className) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-white/10 text-pink-400">
                      {value}
                    </code>
                  );
                }

                // Agar language di gayi hai (eg. language-javascript) toh "language-" prefix hatakar asli language name nikal rahe hain
                const language = className.replace("language-", "");

                // Multiline Code Block Renderer (SyntaxHighlighter use karke)
                return (
                  <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
                    
                    {/* Top bar (Language name aur Copy button) */}
                    <div className="flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-4 py-2">
                      <span className="uppercase text-xs text-slate-400">{language}</span>
                      <button onClick={() => copyCode(value)} className="flex items-center gap-1 text-xs">
                        {copiedCode === value ? (<><Check size={14} /> Copied</>) : (<><Copy size={14} /> Copy</>)}
                      </button>
                    </div>

                    {/* Code Syntax Highlight part */}
                    <SyntaxHighlighter
                      language={language}
                      style={oneDark}
                      wrapLongLines
                      showLineNumbers
                      customStyle={{ margin: 0, padding: "16px", background: "#0d1117", fontSize: "13px" }}
                    >
                      {value}
                    </SyntaxHighlighter>
                  </div>
                );
              },
            }}
          >
            {markdown}
          </ReactMarkdown>

          {/* User apna message edit kar sake iske liye pencil icon (absolute position par rakha hai) */}
          {isUser && (
            <button
              onClick={() => onEdit?.(content, index)}
              className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {/* AI message ke niche chote actions (Copy, TTS, Regenerate) */}
      {!isUser && (
        <div className="flex items-center gap-1 mt-1 ml-1">
          {/* Copy Message Button */}
          <button onClick={copyMessage} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer" title="Copy message">
            {copiedMessage ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {/* Text to Speech Button */}
          <button onClick={toggleSpeech} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer" title={isSpeaking ? "Stop speaking" : "Read aloud"}>
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* Regenerate Response Button (Sirf last AI message pe dikhega taaki history ajeeb na ho) */}
          {isLast && (
            <button onClick={() => onRegenerate?.(index)} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer" title="Regenerate response">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {lightboxSrc && (
        // z-50 aur fixed inset-0 (top/left/right/bottom 0) ensure karta hai modal screen block kare
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightboxSrc(null)} // Background click pe modal band ho jayega
        >
          {/* Close button */}
          <button type="button" onClick={() => setLightboxSrc(null)} className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2">
            <FiX size={20} />
          </button>
          {/* Actual big image */}
          <img src={lightboxSrc} onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

export default MessageBubble;