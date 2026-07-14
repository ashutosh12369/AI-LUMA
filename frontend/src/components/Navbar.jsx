import { Share2, MoreHorizontal, Zap, ChartBar, MessageCircle, MessageSquare } from "lucide-react";
import { useSelector } from "react-redux";

export default function Navbar() {
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  const {messages} = useSelector(state => state.message);
  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0a0d11]">

      {/* Left — chat title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <MessageSquare size={13} className="text-teal-400" />
        </div>
        <h2 className="text-[14px] font-semibold text-slate-100 tracking-tight truncate max-w-[40vw] md:max-w-none">
          {selectedConversation?.title}
        </h2>
        <span className="text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
          {messages.length} Messages
        </span>
      </div>

      {/* Right — actions */}
     

    </div>
  );
}