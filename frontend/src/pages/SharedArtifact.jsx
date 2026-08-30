// React se zaroori hooks import kiye gaye hain
// useState: component state ke liye, useEffect: API calls/side-effects ke liye
import { useState, useEffect } from "react";

// react-router-dom se useParams import kiya hai taaki URL me se params (jaise shareId) access kar sakein
import { useParams } from "react-router-dom";

// HTTP requests (backend se data laane) ke liye axios use kar rahe hain
import axios from "axios";

// @monaco-editor/react: ye VS Code jaisa web editor component provide karta hai UI me code highlight/dikhanne ke liye
import Editor from "@monaco-editor/react";

// detectLanguage function file name (jaise script.js) ke hisaab se language "javascript" detect karne ke kaam aata hai (Syntax highlighting ke liye)
import { detectLanguage } from "../utils/detectLanguage";

// UI me icons dikhane ke liye lucide-react aur react-icons
import { Code2, Eye, Loader2 } from "lucide-react";
import { FiCode } from "react-icons/fi";

// Framer Motion: animations ke liye use hota hai (Jaise tabs switch hone par smooth height ya color transition)
import { motion, AnimatePresence } from "framer-motion";

// Ye page (component) dusre users ke sath share kiye gaye code artifacts (files) public URL pe show karne ke kaam aata hai
export default function SharedArtifact() {
  
  // URL format agar /share/123xyz hai, to useParams hook "123xyz" ko nikal ke 'shareId' me daal dega
  const { shareId } = useParams();
  
  // States banayi gayi hain data aur UI status handle karne ke liye
  const [artifact, setArtifact] = useState(null); // Backend se aaya pura artifact ka data isme rahega
  const [loading, setLoading] = useState(true); // Shuru me loading sachi hogi jab tak fetch chalega
  const [error, setError] = useState(null); // Agar request fail hui to isme error message hoga
  
  const [tab, setTab] = useState("code"); // View toggle karne ke liye ("code" ya "preview")
  const [activeFile, setActiveFile] = useState(0); // Files array me se konsa file abhi select kiya hai uska index

  // useEffect chalega jab component mount hoga, ya jab shareId change hogi
  useEffect(() => {
    // API call hamesha async hoti hai isliye alag function banakar call karte hain
    const fetchArtifact = async () => {
      try {
        // Backend ke public endpoint pe GET request mar rahe hain shared id ke saath
        const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/chat/shared/${shareId}`);
        // Response data ko artifact state me store kar diya
        setArtifact(res.data);
      } catch (err) {
        // Agar response 404/500 aata hai to error message user-friendly tarike se set kar do
        setError(err.response?.data?.message || "Failed to load artifact");
      } finally {
        // Request puri hote hi (pass ho ya fail), loading hata do taaki UI dikhe
        setLoading(false);
      }
    };
    fetchArtifact();
  }, [shareId]);

  // UI rendering conditions: Agar abhi data fetch ho raha hai, toh spinner dikhao
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0d0f14] flex items-center justify-center">
        {/* Spinner animate-spin class ke saath */}
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  // Agar backend se error aayi, ya data empty mila, to error page dikhao
  if (error || !artifact) {
    return (
      <div className="h-screen w-full bg-[#0d0f14] flex items-center justify-center text-slate-400">
        <p>{error || "Artifact not found"}</p>
      </div>
    );
  }

  // Data processing: Jo file tab select kiya hai, uska pura data (naam aur code) nikal liya
  const file = artifact.files?.[activeFile];
  
  // HTML, CSS, JS search kar rahe hain taaki combined live preview dikha sakein
  const htmlFile = artifact.files?.find(f => f.name === "index.html");
  const cssFile = artifact.files?.find(f => f.name === "style.css");
  const jsFile = artifact.files?.find(f => f.name === "script.js");
  
  // Agar HTML file exist karti hai, tabhi Preview button kaam karega
  const canPreview = Boolean(htmlFile);

  // iframe ke andar render karne ke liye ek fake raw HTML string bana li 
  // Jisme style aur script tags khud embed kar diye
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

  // Final UI JSX
  return (
    // Pura page cover karne wala column flex container
    <div className="h-screen w-full bg-[#0d0f14] flex flex-col">
      
      {/* Header Area (Topbar) */}
      <div className="h-14 px-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        {/* Left side: Artifact ka icon aur Title dikhane ke liye */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
            <FiCode className="text-indigo-400" size={16} />
          </div>
          <div>
            {/* Artifact Title database se liya hai */}
            <h2 className="text-[14px] font-medium text-slate-200">{artifact.title}</h2>
            <p className="text-[11px] text-slate-500">Shared via AI-LUMA</p>
          </div>
        </div>

        {/* Right side: Agar preview ho sakta hai, tab hi 'Code' / 'Preview' Switch buttons dikhao */}
        {canPreview && (
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] p-1 rounded-lg">
            <button
              onClick={() => setTab("code")} // Code tab pe set karega
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors duration-150
                ${tab === "code" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Code2 size={13} /> Code
            </button>
            <button
              onClick={() => setTab("preview")} // Preview tab pe set karega
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors duration-150
                ${tab === "preview" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-200"}`}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
        )}
      </div>

      {/* File Navigation Tabs (Jab user "Code" tab pe hoga tab dikhenge) */}
      <AnimatePresence>
        {tab === "code" && (
          // Framer motion animation use kiya height ko smooth slide karne ke liye
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex border-b border-white/[0.06] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 px-2"
          >
            {/* Saari files loop kar rahe hain tab banane ke liye */}
            {artifact.files?.map((f, index) => (
              <button
                key={f.name}
                onClick={() => setActiveFile(index)} // Tab click par wo file select ho jayegi
                className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-150 border-r border-transparent relative cursor-pointer bg-transparent
                  ${activeFile === index ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                {f.name}
                
                {/* Active file (tab indicator line) ke liye motion div, jo layoutId use karke smooth glide karegi ek tab se dusre pe */}
                {activeFile === index && (
                  <motion.div layoutId="shared-filetab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-t-full" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area: Yaha Editor ya Preview (iframe) show hoga */}
      <div className="flex-1 overflow-hidden">
        {/* mode="wait" ensures ki purana content fade out ho jaye isse pehle ki naya fade in ho */}
        <AnimatePresence mode="wait">
          {tab === "preview" && canPreview ? (
            // Live iframe preview UI
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              {/* iframe jisme humari custom banayi 'previewDoc' string render ho rahi hai */}
              <iframe title="preview" sandbox="allow-scripts" srcDoc={previewDoc} className="w-full h-full bg-white" />
            </motion.div>
          ) : (
            // Code Editor UI (Monaco Editor)
            <motion.div key={`code-${activeFile}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full h-full">
              <Editor
                theme="vs-dark" // Dark VS Code theme
                language={detectLanguage(file?.name || "")} // js/css auto-detect karega syntax highlighting ke liye
                value={file?.content || ""} // Code ka text
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: "on", automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 24 }, lineNumbers: "on", renderLineHighlight: "none" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}