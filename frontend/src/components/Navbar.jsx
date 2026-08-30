// lucide-react se icons import kiye jaa rahe hain jo navbar UI mein use honge. (Jaise share button, menu etc. yahan MessageSquare extract kiya gaya hai)
import { Share2, MoreHorizontal, Zap, ChartBar, MessageCircle, MessageSquare } from "lucide-react";

// react-redux se useSelector import kiya gaya hai. Iska use Redux store (global state) ko access karne ke liye hota hai.
import { useSelector } from "react-redux";

// Navbar ek functional component hai jo header ki tarah chat interface ke top par show hoga.
export default function Navbar() {
  // useSelector ka use karke hum 'conversation' state (slice) se selectedConversation le rahe hain.
  // selectedConversation me abhi current open chat ki details hoti hain (jaise title, id).
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  
  // Similarly, 'message' state (slice) se messages array access kar rahe hain. 
  // Isme us chat ke saare messages hain. Length nikal kar hum total message count dikhayenge.
  const {messages} = useSelector(state => state.message);
  
  return (
    // Navbar container: Fixed height (h-14), items vertically center (items-center), 
    // left/right distribute karne ke liye (justify-between), bottom border.
    <div className="h-14 flex items-center justify-between pl-14 lg:pl-5 pr-5 border-b border-white/[0.06] bg-transparent">
      
      {/* Left side: Chat ka Title aur Message count dikhane ke liye */}
      <div className="flex items-center gap-2.5">
        
        {/* Title ke aage ek icon dikhane ke liye decorative box. Indigo theme di gayi hai. */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <MessageSquare size={13} className="text-indigo-400" />
        </div>
        
        {/* Chat Title: Optional chaining (?.) use ki gayi hai taaki agar selectedConversation null ho toh code crash na ho.
            truncate class se agar title lamba ho toh "..." ban jata hai (UX improvement). */}
        <h2 className="text-[14px] font-semibold text-slate-100 tracking-tight truncate max-w-[40vw] md:max-w-none">
          {selectedConversation?.title}
        </h2>
        
        {/* Total Message Count: Pill shape badge mein kitne messages hain ye dikhata hai. */}
        <span className="text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
          {messages.length} Messages
        </span>
      </div>

      {/* Right side: Actions (abhi ke liye khali rakha gaya hai, yahan future me share/settings button aa sakte hain) */}
      
    </div>
  );
}