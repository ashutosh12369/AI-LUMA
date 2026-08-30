// Zaroori React hooks (State aur Refs) import kiye hain
import { useEffect, useRef, useState } from "react";
// Bahut saare Lucide Icons left nav/sidebar menu ke liye
import { Plus, MessageSquare, Settings, LogOut, User, PenSquare, Menu, X, Coins, ConeIcon, CoinsIcon, Pencil, Trash2, Pin, FolderOpen, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";

// Redux (Global state management) hooks aur actions
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/user.slice";
import { addConversation, setConversations, setSelectedConversation, setConvTitle, removeConversation, clearAllConversations, togglePinConversation, moveConvToFolder } from "../redux/conversation.slice";
import { setArtifacts, setMessages } from "../redux/message.slice";

// API endpoints (Axios functions) backend ko call karne ke liye (Conversations CRUD operations)
import api from "../utils/axios";
import { createConversation, getConversations, updateConversations, deleteConversation, deleteAllConversations, togglePinConversation as togglePinApi, moveToFolder } from "../features/conversation.api";
import { getMessages } from "../features/message.api";

// Nested Drawer aur Logo component ko Sidebar ke andar dikhane ke liye
import BillingDrawer from "./BillingDrawer";
import Logo from "./Logo";

// Sidebar Component: Ye left navigation drawer hai jisme saari chat history, folders aur account options hote hain.
export default function Sidebar() {
  
  // -- UI States --
  const [hovered, setHovered] = useState(null); // Kis chat par mouse hover kar raha hai (Actions dikhane ke liye)
  const [collapsed, setCollapsed] = useState(false); // Sidebar desktop par band hai (patli line) ya khula
  const [mobileOpen, setMobileOpen] = useState(false); // Mobile device me hamburger menu khula hai ya nahi
  const [imageError, setImageError] = useState(false); // Agar user ki profile picture load na ho
  
  // -- Edit Title States --
  const [editingId, setEditingId] = useState(null); // Kaunsi chat ka title edit mode me hai
  const [editValue, setEditValue] = useState(""); // Input box ka naya title text
  const editRef = useRef(null); // Textbox pe automatically focus dalne ke liye ref

  const [openFolders, setOpenFolders] = useState({}); // Kaunsa folder expanded/khula hai
  
  // Redux Store se current data liya: Logged user aur Chat History arrays
  const { userData } = useSelector(state => state.user);
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch(); // Redux state me dispatch action trigger karta hai

  const [showBilling, setShowBilling] = useState(false); // Billing panel state

  // Logout Function
  const logout = async () => {
    try {
      // Backend api (express server) ke cookie based session ko delete karne ke liye call
      await api.get("/api/auth/logout");
      // Frontend store se user details hata do (Nullify), tab app automatic login page pe phek degi
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  // Jab page load ho, toh pehli fursat me DB se user ki purani sab chats laake Redux me dalni hai
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        dispatch(setConversations(data));
      } catch (error) {
        console.log(error);
      }
    };
    fetchConversations();
  }, [userData?._id]); // Jab tak _id valid nahi, tab tak ye nahi chalega (Login dependancy)

  // Nayi chat banani hai button pe (Isse current state khali ho jati hai)
  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false); // Mobile pe menu band kar dete hain UI khula rakhne ke liye
  };

  // Jab user kisi history chat pe click karta hai
  const handleSelectConversation = async (conversation) => {
    setMobileOpen(false);
    dispatch(setSelectedConversation(conversation)); // Selected chat change kiya
    
    // Uss nayi select hui chat id ke saare messages mangwao backend se aur screen pe show karo
    const messages = await getMessages(conversation._id);
    dispatch(setMessages(messages));
    dispatch(setArtifacts(messages.artifacts));
  };

  // Title Rename suru karne par UI me textbox open karna
  const startRename = (e, chat) => {
    e.stopPropagation(); // Event bubble na ho, taaki puri chat select na ho jaye onClick ki vajah se (Interview DOM concept)
    setEditingId(chat._id);
    setEditValue(chat.title);
    setTimeout(() => editRef.current?.focus(), 0); // DOM update hone ke baad input me cursor dalne ka hack
  };

  // Naya chat title save karne ka process
  const commitRename = async (chatId) => {
    const trimmed = editValue.trim();
    // Check: Naya title empty nahi hona chahiye aur purane jaisa same na ho
    if (trimmed && trimmed !== conversations.find(c => c._id === chatId)?.title) {
      try {
        // Backend pe PATCH update Request
        await updateConversations(chatId, trimmed);
        // Frontend array me dispatch update taaki bina refresh kiye naam change ho (Optimistic Response)
        dispatch(setConvTitle({ conversationId: chatId, title: trimmed }));
      } catch (err) {
        console.log(err);
      }
    }
    setEditingId(null); // Edit mode band karo
  };

  // Textbox me enter daba kar save karna ya Escape daba kar band karna (Better Keyboard accessibility)
  const handleEditKeyDown = (e, chatId) => {
    if (e.key === "Enter") {
      commitRename(chatId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  // Jab input box se bahar click (blur/focus-out) ho toh automatically save (Commit) kardo
  const handleEditBlur = (chatId) => {
    commitRename(chatId);
  };

  // Chat delete API
  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteConversation(chatId);
      dispatch(removeConversation(chatId)); // Redux update
      
      // Agar delete ki hui chat hi open thi, to main window ko blank kar do
      if (selectedConversation?._id === chatId) {
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Pin/Unpin Toggle
  const handlePin = async (e, chatId) => {
    e.stopPropagation();
    try {
      await togglePinApi(chatId);
      dispatch(togglePinConversation(chatId));
    } catch (err) {
      console.log(err);
    }
  };

  // Saari history delete (Destructive action)
  const handleClearAll = async () => {
    // Dangerous operation hai isliye Browser alert window.confirm se puchna zaruri hai
    if (window.confirm("Are you sure you want to delete all conversations? This cannot be undone.")) {
      try {
        await deleteAllConversations();
        dispatch(clearAllConversations()); // Empty redux array
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
      } catch (error) {
        console.error("Failed to delete all chats", error);
      }
    }
  };

  // Ek chat item ko kisi specific Folder naam ke andar shift karna (Organize)
  const handleMoveToFolder = async (e, chatId) => {
    e.stopPropagation();
    const folderName = window.prompt("Enter folder name (leave empty to remove from folder):");
    if (folderName !== null) {
      try {
        await moveToFolder(chatId, folderName.trim());
        dispatch(moveConvToFolder({ conversationId: chatId, folder: folderName.trim() }));
      } catch (error) {
        console.error("Failed to move chat", error);
      }
    }
  };

  // Code Logic: Pura flat conversation array le kar unhe unke 'folder' naam ke aadhar par ek Dictionary (Object) me badalna
  // Grouping objects trick: Array.prototype.reduce (Most important interview array method)
  const groupedConversations = conversations.reduce((acc, chat) => {
    const folder = chat.folder || ""; // Agar chat me 'folder' object null hai, toh usko khali string "" de do
    if (!acc[folder]) acc[folder] = []; // Agar object me pehli baar folder naam aaya hai toh ek khali array bana do uske under
    acc[folder].push(chat); // Uss array me chat ghusa do
    return acc;
  }, {}); // Initial state: {} khali object

  // Folders aur baaki bachi (Uncategorized) chats ko variables me nikal liya UI me print karne ke liye
  const folders = Object.keys(groupedConversations).filter(f => f !== "");
  const uncategorized = groupedConversations[""] || [];

  // Reusable mini icon function
  const PanelIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );

  // Desktop view mein mini sidebar jo collapsed state me dikhta hai (Left border)
  const CollapsedRail = () => (
    <div className="hidden lg:flex flex-col items-center w-[56px] h-screen glass-panel border-r border-white/10 py-4 gap-1 shrink-0">
      
      {/* Sidebar Expand (kholne) ka button */}
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
      >
        <PanelIcon />
      </button>

      {/* New Chat icon (Plus) */}
      <button
        onClick={handleCreateConversation}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
      >
        <Plus size={17} />
      </button>

      {/* Mini scrollable list of chats (Sirf icon dikhega) */}
      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              title={chat.title} // Hover karne pe chat ka naam tooltip ki tarah dikhega
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}
            >
              <MessageSquare size={15} />
            </button>
          );
        })}
      </div>

      {/* Bottom Area: User ka Avatar (Profile picture) */}
      <div className="mt-auto">
        {userData && (
          <div className="relative">
            {userData.avatar
              ? <img src={userData.avatar} alt={userData.name} className="w-8 h-8 rounded-[8px] object-cover border-2 border-indigo-500/25" />
              : <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
            }
            {/* Online indicator (Green dot) */}
            <span className="absolute -bottom-px -right-px w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-[#0d0f14] block" />
          </div>
        )}
      </div>
    </div>
  );

  // Main Sidebar Content: Jo desktop par open state me ya mobile me drawer ke form me dikhta hai.
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Top Header Section: Logo, Collapse Button, New Chat Button */}
      <div className="flex flex-col items-center px-4 pt-4 pb-2 border-b border-white/5 relative">
        
        {/* Dekstop par Panel Collapse ka button */}
        <button
          onClick={() => setCollapsed(true)}
          className="hidden lg:flex absolute top-4 left-4 items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <PanelIcon />
        </button>

        {/* Mobile par Panel Close karne ka button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 left-4 flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <X size={15} />
        </button>

        <Logo />

        <div className="w-full mt-2">
          {/* New Chat Button: Gradient UI ke sath (Gives premium feel) */}
          <button
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-teal-400/80 via-indigo-500/80 to-purple-500/80 rounded-2xl py-[12px] border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:border-white/40 transition-all duration-300"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
      </div>

      {/* Recent Chats Heading (Agar zero chats hain toh 'No recent conversations' show karo) */}
      {
        conversations.length === 0 ? (
          <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
            No recent conversations
          </div>
        )
        : (
          <div className="flex items-center justify-between px-5 pt-4 pb-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
              Recents
            </p>
            {/* Delete All (Trash) icon button */}
            <button
              onClick={handleClearAll}
              title="Clear all chats"
              className="flex items-center justify-center w-5 h-5 rounded text-slate-600 hover:text-red-400 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )
      }

      {/* Actual Chat History List. Isme folders aur normal chats dono render hote hain.
          IIFE function use karke yaha local scope logic banaya hai. */}
      {(() => {
        // Redux state se data group karke foldering structure me dala (Jaise pehle samjhaya tha)
        const folders = [];
        const groupedConversations = {};
        const uncategorized = [];

        conversations.forEach((chat) => {
          if (chat.folder) {
            if (!groupedConversations[chat.folder]) {
              groupedConversations[chat.folder] = [];
              folders.push(chat.folder);
            }
            groupedConversations[chat.folder].push(chat);
          } else {
            uncategorized.push(chat);
          }
        });

        // Chat Box item render karne ka function (JSX template return karta hai)
        const renderChatItem = (chat) => {
          const isActive = selectedConversation?._id === chat._id; // Kya ye chat abhi open hai screen pe?
          const isHov = hovered === chat._id || chat.isPinned; // Mouse iske upar hover ho raha hai ya fir pinned chat hai
          const isEditing = editingId === chat._id; // Kya user abhi is chat ka nam badal raha hai

          return (
            <div
              key={chat._id}
              onMouseEnter={() => setHovered(chat._id)} // Hover effect state
              onMouseLeave={() => setHovered(null)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${isActive ? "bg-white/[0.04] border-white/[0.08]" : "bg-transparent border-transparent hover:bg-white/[0.02]"}`}
            >
              <div
                onClick={() => handleSelectConversation(chat)}
                className="flex-1 flex items-center gap-3 min-w-0"
              >
                {/* Agar active hai toh indigo icon, nahi toh slate icon */}
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-500"}`}>
                  <MessageSquare size={14} />
                </div>
                
                {/* Agar edit mode ON hai toh <input> text field dikhao */}
                {isEditing ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, chat._id)}
                    onBlur={() => handleEditBlur(chat._id)}
                    className="flex-1 bg-white/10 text-white text-[13px] px-2 py-1 rounded outline-none w-full"
                  />
                ) : (
                  // Edit mode OFF hone pe simply text/title dikhao (truncate taaki dot-dot ban jaye line cross hone pe)
                  <p className={`text-[13px] truncate ${isActive ? "text-slate-200 font-medium" : "text-slate-400 group-hover:text-slate-300"}`}>
                    {chat.title}
                  </p>
                )}
              </div>

              {/* Chat pe hover karne par actions buttons show hongi (Pin, Folder, Edit, Delete) */}
              {(isHov && !isEditing) && (
                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-[#0f1117] via-[#0f1117] to-transparent pl-4">
                  {/* Pin button */}
                  <button onClick={(e) => handlePin(e, chat._id)} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-amber-400 transition-colors" title={chat.isPinned ? "Unpin" : "Pin"}>
                    <Pin size={12} className={chat.isPinned ? "fill-amber-400 text-amber-400" : ""} />
                  </button>
                  {/* Folder button (Move to folder) */}
                  <button onClick={(e) => handleMoveToFolder(e, chat._id)} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors" title="Move to folder">
                    <FolderPlus size={12} />
                  </button>
                  {/* Edit title button */}
                  <button onClick={(e) => startRename(e, chat)} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors" title="Rename">
                    <Pencil size={12} />
                  </button>
                  {/* Delete chat button */}
                  <button onClick={(e) => handleDelete(e, chat._id)} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        };

        return (
          // Main Scrollable Area jisme list ayegi
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            {/* Pinned Chats ki alag section (sabse upar dikhti hain) */}
            {conversations.filter(c => c.isPinned).length > 0 && (
              <div className="mb-4">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                  <Pin size={10} /> Pinned
                </p>
                {conversations.filter(c => c.isPinned).map(renderChatItem)}
              </div>
            )}

            {/* Folders me group kiye gaye chats */}
            {folders.map(folderName => (
              <div key={folderName} className="mb-2">
                {/* Folder Accordion (Expand/Collapse) Button */}
                <button
                  onClick={() => setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer"
                >
                  {openFolders[folderName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderOpen size={14} className="text-indigo-400" />
                  <span className="text-[12px] font-medium truncate">{folderName}</span>
                  <span className="text-[10px] text-slate-600 ml-auto bg-white/5 px-1.5 rounded">{groupedConversations[folderName].length}</span>
                </button>
                {/* Agar folder open/expanded hai toh hi chats render karo */}
                {openFolders[folderName] && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-2">
                    {groupedConversations[folderName].map(renderChatItem)}
                  </div>
                )}
              </div>
            ))}

            {/* Aise chats jo kisi Folder me nahi hain (Normal list) aur pinned bhi nahi hain */}
            {uncategorized.filter(c => !c.isPinned).map(renderChatItem)}
          </div>
        );
      })()}

      {/* Sidebar ka bottom most section (User settings, Billing, Profile) */}
      <div className="p-4 border-t border-white/[0.06] mt-auto space-y-1">
        
        {/* Billing/Upgrade Plan Button */}
        <button
          onClick={() => setShowBilling(true)} // onClick popup khul jayega
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <CoinsIcon size={14} className="text-indigo-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-medium">Billing</p>
            {/* User details available hain to uski plan detail likho varna 'Pro Plan' */}
            <p className="text-[10px] text-slate-500">{userData ? userData?.plan : 'Pro Plan'}</p>
          </div>
        </button>

        {/* User Profile Card aur Logout Action */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] mt-2">
          {userData && (
            <>
              {/* Avatar picture logic */}
              {userData.avatar
                ? <img src={userData.avatar} alt={userData.name} className="w-8 h-8 rounded-lg object-cover" onError={() => setImageError(true)} />
                : <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center"><User size={15} className="text-indigo-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-200 truncate">{userData.name}</p>
                {/* Plan validity show ki hai */}
                <p className="text-[11px] text-indigo-400/80 truncate">Pro Member</p>
              </div>
            </>
          )}
          {/* Logout button. Click karte hi logout API call hogi. */}
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile view ke liye Hamburger Menu Button */}
      <button
        onClick={() => setMobileOpen(true)} // Drawer open karo
        className="lg:hidden absolute top-4 left-4 z-40 flex items-center justify-center w-10 h-10 rounded-xl bg-[#0f1117] border border-white/[0.08] text-slate-400 shadow-lg cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {/* Main Desktop Sidebar */}
      {!collapsed ? (
        <div className="hidden lg:flex w-[260px] h-screen glass-panel border-r border-white/10 flex-col shrink-0">
          {/* Default expanded sidebar */}
          <SidebarContent />
        </div>
      ) : (
        /* Agar arrow pe tap karke shrink kiya gaya hai toh mini-rail dikhao */
        <CollapsedRail />
      )}

      {/* Mobile view Sidebar (Drawer) */}
      {mobileOpen && (
        <>
          {/* Background overlay (Black semi-transparent dimming effect) */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} // Overlay pe kahin bhi click karne par drawer band ho jayega (Standard UX Practice)
          />
          {/* Sliding box */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0f1117] shadow-2xl border-r border-white/[0.06]">
            <SidebarContent />
          </div>
        </>
      )}

      {/* Billing Component. Show/Hide ka control idhar hai. */}
      <BillingDrawer
        open={showBilling} // State
        onClose={() => setShowBilling(false)} // Closing method
      />
    </>
  );
}