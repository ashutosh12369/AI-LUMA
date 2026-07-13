import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { detectLanguage } from "../utils/detectLanguage";
import { Code2, Eye, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCode } from "react-icons/fi";

export default function SharedArtifact() {
  const { shareId } = useParams();
  const [artifact, setArtifact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [tab, setTab] = useState("code");
  const [activeFile, setActiveFile] = useState(0);

  useEffect(() => {
    const fetchArtifact = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/chat/shared/${shareId}`);
        setArtifact(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load artifact");
      } finally {
        setLoading(false);
      }
    };
    fetchArtifact();
  }, [shareId]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0d0f14] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="h-screen w-full bg-[#0d0f14] flex items-center justify-center text-slate-400">
        <p>{error || "Artifact not found"}</p>
      </div>
    );
  }

  const file = artifact.files?.[activeFile];
  const htmlFile = artifact.files?.find(f => f.name === "index.html");
  const cssFile = artifact.files?.find(f => f.name === "style.css");
  const jsFile = artifact.files?.find(f => f.name === "script.js");
  const canPreview = Boolean(htmlFile);

  const previewDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>${cssFile?.content || ""}</style>
</head>
<body>
${htmlFile?.content || ""}
<script>${jsFile?.content || ""}<\/script>
</body>
</html>`;

  return (
    <div className="h-screen w-full bg-[#0d0f14] flex flex-col">
      {/* Header */}
      <div className="h-14 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
            <FiCode className="text-indigo-400" size={16} />
          </div>
          <div>
            <h2 className="text-[14px] font-medium text-slate-200">{artifact.title}</h2>
            <p className="text-[11px] text-slate-500">Shared via AI-LUMA</p>
          </div>
        </div>

        {canPreview && (
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] p-1 rounded-lg">
            <button
              onClick={() => setTab("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors duration-150
                ${tab === "code" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Code2 size={13} /> Code
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors duration-150
                ${tab === "preview" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
        )}
      </div>

      {/* File tabs */}
      <AnimatePresence>
        {tab === "code" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex border-b border-white/[0.06] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 px-2"
          >
            {artifact.files?.map((f, index) => (
              <button
                key={f.name}
                onClick={() => setActiveFile(index)}
                className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-150 border-r border-transparent relative cursor-pointer bg-transparent
                  ${activeFile === index ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                {f.name}
                {activeFile === index && (
                  <motion.div layoutId="shared-filetab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-t-full" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === "preview" && canPreview ? (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <iframe title="preview" sandbox="allow-scripts" srcDoc={previewDoc} className="w-full h-full bg-white" />
            </motion.div>
          ) : (
            <motion.div key={`code-${activeFile}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <Editor
                theme="vs-dark"
                language={detectLanguage(file?.name || "")}
                value={file?.content || ""}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 24 }, lineNumbers: "on", renderLineHighlight: "none" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
