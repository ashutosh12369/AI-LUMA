// React ke core hooks import kar rahe hain. useState local state ke liye, useCallback functions memoize (cache) karne ke liye.
import { useState, useCallback, useEffect, useRef } from "react";
// Icons import kar rahe hain UI me use karne ke liye (send button, attach button, mic wagera)
import { Send, Paperclip, Square, Zap, MessageSquare, Code2, Presentation, Image as ImageIcon, Globe, FileText, X, BarChart, Wand2, Mic, MicOff } from "lucide-react";
// Redux se data read/write karne ke liye hooks
import { useDispatch, useSelector } from "react-redux";
// Messages slice (Redux state) se actions
import { addMessage, setArtifacts, setIsLoading, removeLastMessage } from "../redux/message.slice";
// API calls jo backend se directly communicate karte hain
import { sendPrompt } from "../features/agent.api";
import { createConversation, updateConversations } from "../features/conversation.api";
// Conversation slice se actions
import { addConversation, setConvTitle, setSelectedConversation } from "../redux/conversation.slice";

// ChatInput component: Ye wo jagah hai jahan user prompt (message) type karke send karta hai.
export default function ChatInput({
  setBanner // Parent component (ChatArea) se state setter laya gaya hai taaki error aane par Error Banner show kiya ja sake.
}) {
  // Local states for UI:
  // selectedAgent: User kis 'agent' (AI Role) se baat kar raha hai (jaise Auto, Coding, PPT, etc.)
  const [selectedAgent, setSelectedAgent] = useState("auto");
  
  // value: Textarea me user ne kya likha hai
  const [value, setValue] = useState("");
  
  // isListening: Voice command/Speech recognition abhi chalu hai ya band
  const [isListening, setIsListening] = useState(false);
  
  // isAutonomous: Agar Auto-pilot mode on hai toh AI khud se steps decide karega
  const [isAutonomous, setIsAutonomous] = useState(false);
  
  // selectedFile: Agar user koi PDF/Image attach karta hai toh is state me save hogi
  const [selectedFile, setSelectedFile] = useState(null);

  // useRef hooks DOM elements ya mutable variables ko persist karne ke liye (bina re-render kiye)
  const recognitionRef = useRef(null); // Web Speech API ka reference
  const fileRef = useRef(null); // Hidden file input element ka reference
  const abortControllerRef = useRef(null); // API call cancel karne ke liye (Jab user 'Stop' press kare)
  
  // Redux hooks
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector(state => state.conversation);
  const { isLoading } = useSelector(state => state.message);

  // UI mapping: Agent select karne pe input box ka placeholder change hoga
  const placeholders = {
    auto: "Ask AI-LUMA...",
    chat: "Chat with AI-LUMA...",
    coding: "Describe the software you want...",
    pdf: "Generate a PDF about...",
    ppt: "Create a presentation about...",
    image: "Describe the image...",
    search: "Search the web...",
    data: "Upload CSV for data visualization...",
    github: "Chat with your GitHub repos..."
  };

  // Available AI Agents ka list array. Is se buttons dynamically render honge.
  const agents = [
    { id: "auto", icon: Zap, label: "Auto" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "coding", icon: Code2, label: "Coding" },
    { id: "pdf", icon: FileText, label: "PDF" },
    { id: "ppt", icon: Presentation, label: "PPT" },
    { id: "image", icon: ImageIcon, label: "Image" },
    { id: "search", icon: Globe, label: "Search" },
    { id: "data", icon: BarChart, label: "Data" },
    // GitHub tab tabhi enable hogi jab user login kar chuka ho (token available ho)
    { id: "github", label: "GitHub", icon: Code2, desc: "Interact with your GitHub repositories", model: "MODEL_PLACEHOLDER_M05" }
  ];

  // Ye useEffect 'editPrompt' naam ka ek custom event sun raha hai. 
  // Jab MessageList se koi 'Pencil' icon click karta hai, ye event text ko wapas input box me la deta hai.
  useEffect(() => {
    const handleEditPrompt = (e) => {
      const { content, index } = e.detail; // Event se content nikala
      setValue(content); // Input box me daal diya
      
      // Agar index bheja hai, matlab purana message tha, use Redux se delete kar do
      if (index !== undefined) {
        dispatch(removeLastMessage());
      }
    };
    window.addEventListener('editPrompt', handleEditPrompt);
    return () => window.removeEventListener('editPrompt', handleEditPrompt); // Cleanup memory leak bachane ke liye
  }, [dispatch]);

  // Speech Recognition (Web Speech API) ka setup. (Interview Point: How voice to text works in web)
  useEffect(() => {
    // Browser compatibility check: Kuch browsers standard name use karte hain, kuch webkit- prefix.
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) return; // Agar browser support nahi karta (jaise Firefox), toh ruk jao

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Language set to Indian English
    recognition.interimResults = true; // Bolte waqt live words dikhayega (true)
    recognition.continuous = true; // Ek pause par band nahi hoga, chalta rahega

    // Jab user bolta hai toh ye function bar bar trigger hota hai
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript; // Sare spoken parts join kar lo
      }
      setValue(transcript); // Textarea me live likh do
    };

    // Jab user manually band kare ya API timeout de de
    recognition.onend = () => {
      setIsListening(false);
    };

    // Reference variable me object save kar liya taaki button click pe start/stop kar sakein
    recognitionRef.current = recognition;
  }, []);

  // Mic button dabane pe call hone wala function
  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported");
      return;
    }
    
    // Toggle logic: Chal raha hai toh band karo, band hai toh chalu karo
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Main chat bhejne ka function
  const handleSend = async () => {
    // 1. Agar request pehle se chal rahi hai (isLoading) aur user ne "Stop" (Square icon) dabaya, toh cancel karo
    if (isLoading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort(); // Browser ka in-built API request rokne ke liye (Interview concept)
        abortControllerRef.current = null;
      }
      dispatch(setIsLoading(false));
      return;
    }

    const prompt = value.trim();
    if (!prompt) return; // Empty message bhejne se roko

    dispatch(setIsLoading(true)); // UI loading state chalu (Thinking animations dikhne lagenge)

    try {
      let conversation = selectedConversation;

      // Agar user ne chat kholi hi nahi hai, toh ek naya conversation document backend pe banao
      if (!conversation) {
        const newConversation = await createConversation();
        dispatch(addConversation(newConversation));
        dispatch(setSelectedConversation(newConversation));
        conversation = newConversation;
      }

      // Agar ye newly created chat hai ("New Chat"), toh jo user ne pehla message type kiya hai,
      // uske pehle 40 characters ko chat ka 'Title' bana do
      if (conversation.title === "New Chat") {
        await updateConversations(conversation._id, prompt.slice(0, 40));
        dispatch(setConvTitle({ conversationId: conversation._id, title: prompt.slice(0, 40) }));
      }

      // Redux store me User ka message daal do taaki UI par turant dikhne lage (Optimistic UI update)
      dispatch(addMessage({ role: "user", content: prompt }));
      setValue(""); // Input box khali kar do

      // FormData banate hain kyunki hume text ke sath sath file (Image/PDF) bhi bhejni pad sakti hai (JSON se file nahi bheji jati)
      const formData = new FormData();
      formData.append("conversationId", conversation._id);
      formData.append("prompt", prompt);
      formData.append("agent", selectedAgent); // Kis mode me chal raha hai (PPT, Code, etc.)
      formData.append("isAutonomous", isAutonomous); // Agent khud-ba-khud kaam karega ya nahi

      // Agar koi file user ne attach ki hai, toh wo bhi FormData me chipka do
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      setSelectedFile(null); // Bhejte hi state se hta do

      // AbortController naya banaya request handle karne ke liye
      abortControllerRef.current = new AbortController();
      
      // Backend ko request send ki. 'signal' pass kiya gaya hai taaki beech me cancel/abort kiya ja sake
      const data = await sendPrompt(formData, { signal: abortControllerRef.current.signal });
      
      // Backend se jo response aaya (AI ka answer), use Redux me daal do UI pe dikhane ke liye
      dispatch(addMessage({
        role: "assistant",
        content: data.answer,
        images: data.images
      }));

      // Agar backend ne code ya file (artifacts) generate kiya hai, toh ArtifactPanel update kar do
      if (data.artifacts) {
        dispatch(setArtifacts(data.artifacts));
      }
      
    } catch (error) {
      // Agar error request abort/cancel hone se aaya, toh chodh do, kuch aur karne ki zaroorat nahi
      if (error.name === "CanceledError" || error.message === "canceled") {
        return;
      }
      // Warna user ko Banner me error dikhao
      setBanner({
        open: true,
        title: error.response?.data?.title || "Something went wrong",
        message: error.response?.data?.message || "Please try again."
      });
    } finally {
      dispatch(setIsLoading(false)); // Kaam khatam (ya fail hua), loading hata do
    }
  };

  return (
    // Component ka root wrapper. Niche ki side fixed rakha gaya hai
    <div className="w-full px-2 md:px-8 pb-3 md:pb-6 pt-2 bg-transparent z-10 shrink-0">
      
      {/* Main glass-panel box (Textarea aur buttons ko hold karta hai) */}
      <div className="flex flex-col gap-3 glass-panel rounded-[1.5rem] md:rounded-[2rem] px-4 md:px-5 pt-3 md:pt-4 pb-2 md:pb-3 shadow-2xl shadow-indigo-500/10 mx-auto max-w-5xl">

        {/* Top Row: Agents/Modes ki slider list */}
        <div className="flex items-center w-full gap-2 pr-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2 border-b border-white/5">
          
          {/* Auto-Pilot Toggle Button */}
          <button
            onClick={() => setIsAutonomous(!isAutonomous)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all
              ${isAutonomous ? "bg-amber-500 text-white border-transparent shadow-[0_1px_8px_rgba(245,158,11,.35)]" : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"}
            `}
          >
            <Zap size={14} className={isAutonomous ? "text-white" : "text-slate-500"} />
            Auto-Pilot
          </button>

          {/* IIFE (Immediately Invoked Function Expression) use karke agents array map kar rahe hain.
              Github tab sirf tab aayega jab localStorage me github_token hoga. */}
          {(() => {
            const hasGithubToken = !!localStorage.getItem("github_token");
            const filteredAgents = agents.filter(a => a.id !== "github" || hasGithubToken);
            
            return filteredAgents.map((agent) => {
              const Icon = agent.icon;
              const isActive = selectedAgent === agent.id; // Check ki button active hai ya nahi

              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all
                    ${isActive
                        ? "bg-gradient-to-r from-teal-400/80 via-indigo-500/80 to-purple-500/80 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                    }
                  `}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-slate-500"} />
                  {agent.label}
                </button>
              );
            })
          })()}
        </div>

        {/* Selected File Preview Box: Agar user ne koi file choose ki, to chota box dikhao jisme name/size ho */}
        {selectedFile && (
          <div className="my-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              {/* File ki extension check karke specific icon ya thumbnail dikhana */}
              {selectedFile.type === "application/pdf" ? (
                  <FileText size={16} className="text-red-400" />
                ) : selectedFile.name.endsWith(".csv") || selectedFile.name.endsWith(".xlsx") ? (
                  <BarChart size={16} className="text-green-400" />
                ) : selectedFile?.type.startsWith("image/") ? (
                  // Image hui to URL.createObjectURL(file) se local link banake image preview karani hai (Bina server bheje preview dikhane ki ninja technique)
                  <img src={URL.createObjectURL(selectedFile)} className="h-10 w-10 rounded-xl object-cover mt-3" />
                ) : null
              }
              
              {/* Name aur File Size calculation (bytes to KB me badla Math.ceil karke) */}
              <div>
                <p className="text-xs text-white">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500">{Math.ceil(selectedFile.size / 1024)} KB</p>
              </div>
              
              {/* File ko delete/hataane ka button */}
              <button
                onClick={() => {
                  setSelectedFile(null);
                  fileRef.current.value = ""; // Input DOM field ko bhi khali karna jaruri hota hai
                }}
                className="ml-2"
              >
                <X size={14} className="text-slate-500 hover:text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Textarea: Yahan user message type karega */}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)} // State continuously update ho rahi hai (Controlled Component approach)
          
          // Enter dabaane par bhejna (Shift+Enter pe agli line pe jana)
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // Default newline behaviour roko
              handleSend(); // Send function chalao
            }
          }}
          placeholder={placeholders[selectedAgent]} // Current selected AI mode ke hisaab se placeholder
          rows={2}
          disabled={isLoading} // Request chalte waqt user edit na kar paaye
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
        />

        {/* Bottom row: Attachment aur Send Buttons */}
        <div className="flex items-center justify-between">

          {/* Left Side: Attach File aur Mic Button */}
          <div className="flex items-center gap-1">
            
            {/* Hidden Input field. Jab Paperclip icon dabega, toh ye input field click kiya jayega (ref ke through) */}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,image/*,.csv,.xlsx" // Accept attribute browser ko restriction deta hai konsi file allowed hai
              onChange={(e) => {
                const file = e.target.files[0]; // Pehli choose ki hui file (0th index)
                if (file) setSelectedFile(file);
              }}
            />
            
            <button className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer"
              onClick={() => fileRef.current.click()} // Invisible file input trigger
            >
              <Paperclip size={14} />
            </button>
            
            <button
              onClick={toggleMic}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer
                ${isListening ? "bg-red-500 text-white" : "text-slate-600 hover:bg-white/[0.05]"}
              `}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          {/* Right Side: Send / Cancel Button */}
          {/* Agar text box empty hai toh Send disable rakho (disabled = true) */}
          <button
            onClick={handleSend}
            disabled={!isLoading && !value.trim()}
            className={`flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-all duration-300 shadow-lg
              ${isLoading
                // Request ja chuki hai, Loading mode me "Stop" button ka styling dikhao
                ? "bg-white text-[#0d0f14] hover:bg-slate-200"
                
                // Normal mode aur text typed: "Send" button ka gradient styling
                : value.trim()
                ? "bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500 hover:opacity-90 text-white shadow-indigo-500/30"
                
                // Empty textarea: button greyed out
                : "bg-white/10 text-slate-500 cursor-not-allowed shadow-none"
              }`
            }
          >
            {/* Jab loading hai tab Square (Stop) icon render hoga warna Send (Rocket) icon */}
            {isLoading ? <Square size={13} fill="currentColor" /> : <Send size={15} className="ml-0.5" />}
          </button>

        </div>
      </div>

      {/* Footer warning text for users */}
      <p className="text-center text-[11px] text-slate-500/70 mt-3 font-medium tracking-wide">
        AI-LUMA can make mistakes. Verify important info.
      </p>
    </div>
  );
}