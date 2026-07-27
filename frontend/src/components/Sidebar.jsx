import { useEffect, useRef, useState } from "react";
import { Plus, MessageSquare, Settings, LogOut, User, PenSquare, Menu, X, Coins, ConeIcon, CoinsIcon, Pencil, Trash2, Pin, FolderOpen, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { createConversation, getConversations, updateConversations, deleteConversation, deleteAllConversations, togglePinConversation as togglePinApi, moveToFolder } from "../features/conversation.api";
import { addConversation, setConversations, setSelectedConversation, setConvTitle, removeConversation, clearAllConversations, togglePinConversation, moveConvToFolder } from "../redux/conversation.slice";
import { getMessages } from "../features/message.api";
import { setArtifacts, setMessages } from "../redux/message.slice";
import BillingDrawer from "./BillingDrawer";
import Logo from "./Logo";

export default function Sidebar() {
  const [hovered, setHovered]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [openFolders, setOpenFolders] = useState({});
  const editRef = useRef(null);
  const { userData } = useSelector(state => state.user);
  const { conversations, selectedConversation } = useSelector(state => state.conversation);
  const dispatch = useDispatch();
  const [showBilling, setShowBilling] = useState(false);
  const logout = async () => {
    try {
      await api.get("/api/auth/logout");
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

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
  }, [userData?._id]);

  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false);
  };

  const handleSelectConversation = async (conversation) => {
    setMobileOpen(false);
    dispatch(setSelectedConversation(conversation));
    const messages = await getMessages(conversation._id);
    dispatch(setMessages(messages));
    dispatch(setArtifacts(messages.artifacts));
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat._id);
    setEditValue(chat.title);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitRename = async (chatId) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversations.find(c => c._id === chatId)?.title) {
      try {
        await updateConversations(chatId, trimmed);
        dispatch(setConvTitle({ conversationId: chatId, title: trimmed }));
      } catch (err) {
        console.log(err);
      }
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e, chatId) => {
    if (e.key === "Enter") {
      commitRename(chatId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const handleEditBlur = (chatId) => {
    commitRename(chatId);
  };

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteConversation(chatId);
      dispatch(removeConversation(chatId));
      if (selectedConversation?._id === chatId) {
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handlePin = async (e, chatId) => {
    e.stopPropagation();
    try {
      await togglePinApi(chatId);
      dispatch(togglePinConversation(chatId));
    } catch (err) {
      console.log(err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete all conversations? This cannot be undone.")) {
      try {
        await deleteAllConversations();
        dispatch(clearAllConversations());
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
      } catch (error) {
        console.error("Failed to delete all chats", error);
      }
    }
  };

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

  // Group conversations by folder
  const groupedConversations = conversations.reduce((acc, chat) => {
    const folder = chat.folder || "";
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(chat);
    return acc;
  }, {});
  
  const folders = Object.keys(groupedConversations).filter(f => f !== "");
  const uncategorized = groupedConversations[""] || [];

  /* ── Desktop Expanded Rail ── */
  const PanelIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );

  /* ── Collapsed rail — desktop only ── */
  const CollapsedRail = () => (
    <div className="hidden lg:flex flex-col items-center w-[56px] h-screen glass-panel border-r border-white/10 py-4 gap-1 shrink-0">
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
      >
        <PanelIcon />
      </button>

      <button
        onClick={handleCreateConversation}
        className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
      >
        <Plus size={17} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
        {conversations.map((chat) => {
          const isActive = selectedConversation?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => handleSelectConversation(chat)}
              title={chat.title}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}
            >
              <MessageSquare size={15} />
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        {userData && (
          <div className="relative">
            {userData.avatar
              ? <img src={userData.avatar} alt={userData.name} className="w-8 h-8 rounded-[8px] object-cover border-2 border-indigo-500/25" />
              : <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
            }
            <span className="absolute -bottom-px -right-px w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-[#0d0f14] block" />
          </div>
        )}
      </div>
    </div>
  );

  /* ── Full sidebar content ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Header & Logo */}
      <div className="flex flex-col items-center px-4 pt-4 pb-2 border-b border-white/5 relative">
        {/* Desktop collapse */}
        <button
          onClick={() => setCollapsed(true)}
          className="hidden lg:flex absolute top-4 left-4 items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <PanelIcon />
        </button>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 left-4 flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
        >
          <X size={15} />
        </button>

        <Logo />

        <div className="w-full mt-2">
          <button
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-gradient-to-r from-teal-400/80 via-indigo-500/80 to-purple-500/80 rounded-2xl py-[12px] border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:border-white/40 transition-all duration-300"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
      </div>

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

      {/* Chat list */}
      {(() => {
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

        const renderChatItem = (chat) => {
          const isActive = selectedConversation?._id === chat._id;
          const isHov = hovered === chat._id || chat.isPinned;
          const isEditing = editingId === chat._id;

          return (
            <div
              key={chat._id}
              onMouseEnter={() => setHovered(chat._id)}
              onMouseLeave={() => setHovered(null)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${isActive ? "bg-white/[0.04] border-white/[0.08]" : "bg-transparent border-transparent hover:bg-white/[0.02]"}`}
            >
              <div
                onClick={() => handleSelectConversation(chat)}
                className="flex-1 flex items-center gap-3 min-w-0"
              >
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-500"}`}>
                  <MessageSquare size={14} />
                </div>
                {isEditing ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, chat._id)}
                    onBlur={() => handleEditBlur(chat._id)}
                    autoFocus
                    className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 outline-none"
                  />
                ) : (
                  <span className={`text-[13px] font-medium truncate ${isActive ? "text-slate-200" : "text-slate-400 group-hover:text-slate-300"}`}>
                    {chat.title}
                  </span>
                )}
              </div>

              {!isEditing && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => handlePin(e, chat._id)}
                    className={`flex items-center justify-center w-5 h-5 rounded transition-colors duration-150 bg-transparent border-none cursor-pointer ${chat.isPinned ? "text-amber-400" : "text-slate-500 hover:text-slate-200"}`}
                  >
                    <Pin size={13} fill={chat.isPinned ? "currentColor" : "none"} />
                  </button>
                  {isHov && (
                    <>
                      <button
                        onClick={(e) => handleMoveToFolder(e, chat._id)}
                        title="Move to Folder"
                        className="flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-slate-200 transition-colors duration-150 bg-transparent border-none cursor-pointer"
                      >
                        <FolderPlus size={13} />
                      </button>
                      <button
                        onClick={(e) => startRename(e, chat)}
                        title="Rename"
                        className="flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-slate-200 transition-colors duration-150 bg-transparent border-none cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chat._id)}
                        title="Delete"
                        className="flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-red-400 transition-colors duration-150 bg-transparent border-none cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {folders.map(folder => (
              <div key={folder} className="mb-2">
                <div 
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }))}
                >
                  {openFolders[folder] === false ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <FolderOpen size={13} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{folder}</span>
                </div>
                {openFolders[folder] !== false && (
                  <div className="pl-2 border-l border-white/[0.06] ml-4 mt-1 space-y-0.5">
                    {groupedConversations[folder].map(renderChatItem)}
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-2">
              {uncategorized.map(renderChatItem)}
            </div>
          </div>
        );
      })()}

      {/* Divider */}
      <div className="mx-2.5 h-px bg-white/[0.06]" />

      {/* Footer */}
      <div className="px-3.5 py-3.5">
        {userData ? (
          <div className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150">
            <div className="relative shrink-0">
              {
  !userData?.avatar || imageError ? (
    <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
      <User size={15} className="text-slate-400" />
    </div>
  ) : (
    <img
      src={userData.avatar}
      alt={userData.name}
      className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
      onError={() => setImageError(true)}
    />
  )
}
              <span className="absolute -bottom-px -right-px w-[9px] h-[9px] bg-green-500 rounded-full border-2 border-[#0d0f14] block" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-slate-100 truncate">{userData.name}</p>
              <p className="text-[11px] text-slate-600 mt-px">{userData.plan || "Free Plan"}</p>
            </div>
            <div className="flex gap-1">
              <button
    onClick={() => setShowBilling(true)}
    className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
>
    <CoinsIcon size={16}/>
</button>
              <button onClick={logout} className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-1">
            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150">
              Login
            </button>
          </div>
        )}
      </div>

    </div>
  );

  if (collapsed) return <CollapsedRail />;

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* ── Sidebar panel ── */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        glass-panel border-r border-white/10
        transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <SidebarContent />
      </div>

<BillingDrawer

    open={showBilling}

    onClose={()=>
        setShowBilling(false)
    }

/>
    </>
  );
}