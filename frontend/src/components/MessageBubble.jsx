import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiExternalLink, FiX } from "react-icons/fi";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, RefreshCw, Pencil, Volume2, VolumeX } from "lucide-react";

function MessageBubble({ role, content, images, onRegenerate, onEdit, isLast, index }) {
  const isUser = role === "user";
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode("");
    }, 2000);
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    setTimeout(() => {
      setCopiedMessage(false);
    }, 2000);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

const markdown = (content || "")
  .replace(/```review/gi, "```")
  .replace(/```text/gi, "```")
  .replace(/```[a-zA-Z0-9_-]+\s+id="[^"]*"/g, "```");
  return (
    <div className={`group/msg flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
        <div
          className={`relative w-fit max-w-[92vw] md:max-w-[72%]
  px-4 py-2.5 rounded-2xl
  break-words overflow-hidden
  leading-relaxed
          ${
            isUser
              ? "bg-gradient-to-r from-teal-400/90 via-indigo-500/90 to-purple-500/90 text-white rounded-tr-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              : " text-slate-200 rounded-tl-sm glass-card p-4"
          }`}
        >
          {images.length > 0 && (
    <div className="flex flex-wrap gap-3 mt-4">
        {images.map((img, i) => (
            <img
                key={i}
                src={img}
                loading="lazy"
                onClick={() => setLightboxSrc(img)}
                onError={(e)=>e.currentTarget.remove()}
                className="w-40 h-28 rounded-xl object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition"
            />
        ))}
    </div>
)}<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-5 mb-3">{children}</h1>
    ),

    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-4 mb-2">{children}</h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>
    ),

    p: ({ children }) => (
      <p className="mb-3 whitespace-pre-wrap break-words">
        {children}
      </p>
    ),

    ul: ({ children }) => (
      <ul className="list-disc pl-5 space-y-1 my-2">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal pl-5 space-y-1 my-2">
        {children}
      </ol>
    ),

    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-white/10">
          {children}
        </table>
      </div>
    ),

    th: ({ children }) => (
      <th className="border border-white/10 bg-white/5 px-3 py-2 text-left">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="border border-white/10 px-3 py-2">
        {children}
      </td>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-400 underline inline-flex items-center gap-1"
      >
        {children}
        <FiExternalLink size={11} />
      </a>
    ),

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

    code({ className, children }) {
      console.log(children)
      const value = String(children)
  .replace(/^\s*```[^\n]*\n/, "")
  .replace(/\n```\s*$/, "")
  .trim();

      if (!className) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-pink-400">
            {value}
          </code>
        );
      }

      const language = className.replace("language-", "");

      return (
        <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#111318]">

          <div className="flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-4 py-2">

            <span className="uppercase text-xs text-slate-400">
              {language}
            </span>

            <button
              onClick={() => copyCode(value)}
              className="flex items-center gap-1 text-xs"
            >
              {copiedCode === value ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>

          </div>

          <SyntaxHighlighter
            language={language}
            style={oneDark}
            wrapLongLines
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: "16px",
              background: "#0d1117",
              fontSize: "13px",
            }}
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

      {!isUser && (
        <div className="flex items-center gap-1 mt-1 ml-1">
          <button
            onClick={copyMessage}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            title="Copy message"
          >
            {copiedMessage ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <button
            onClick={toggleSpeech}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            title={isSpeaking ? "Stop speaking" : "Read aloud"}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {isLast && (
            <button
              onClick={() => onRegenerate?.(index)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
              title="Regenerate response"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2"
          >
            <FiX size={20} />
          </button>
          <img
            src={lightboxSrc}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default MessageBubble;