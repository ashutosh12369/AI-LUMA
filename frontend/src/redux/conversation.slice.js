// Interview Prep (What & Why):
// What: Redux Toolkit (RTK) se createSlice import kar rahe hain.
// Why: createSlice boilerplate code kam karta hai; ye action creators aur reducers ko ek hi jagah define karne ki suvidha deta hai.
import { createSlice } from '@reduxjs/toolkit'

// Interview Prep (What & Why):
// What: initialState define kar rahe hain conversation slice ke liye.
// Why: Redux store setup hone par initial data ki zaroorat hoti hai. Yahan 'conversations' (list) aur 'selectedConversation' (active chat) track kar rahe hain.
const initialState = {
  conversations: [],
  selectedConversation: null
}

export const conversationSlice = createSlice({
  // Interview Prep (What & Why):
  // What: Slice ka naam 'conversation' rakha gaya hai.
  // Why: Action types automatically is naam se generate hote hain (e.g., 'conversation/setConversations').
  name: 'conversation',
  initialState,
  
  // Interview Prep (What & Why):
  // What: Reducers state update logic hold karte hain.
  // Why: Redux me state directly mutate (change) nahi kar sakte. RTK internally Immer.js use karta hai jo direct state mutation jaisa code likhne par bhi immutable updates handle karta hai.
  reducers: {
    // Interview Prep (What & Why):
    // What: API se mile saare conversations state me save karta hai.
    // Why: Chat sidebar me list dikhane ke liye fresh data chahiye hota hai.
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },

    // Interview Prep (What & Why):
    // What: Naye conversation ko array ke starting me (unshift) add karta hai.
    // Why: Naya chat hamesha top pe dikhna chahiye isliye 'unshift' use kiya hai.
    addConversation: (state, action) => {
      state.conversations.unshift(action.payload);
    },

    // Interview Prep (What & Why):
    // What: User dwara select kiye gaye conversation ko store karta hai.
    // Why: Taki chat window us particular conversation ke messages load aur show kar sake.
    setSelectedConversation: (state, action) => {
      state.selectedConversation = action.payload;
    },

    // Interview Prep (What & Why):
    // What: Kisi specific conversation ka title update karta hai.
    // Why: Agar AI ne chat title generate kiya ya user ne rename kiya, toh usko list aur selected conversation dono me reflect karna hota hai.
    setConvTitle: (state, action) => {
      const { conversationId, title } = action.payload;

      state.conversations = state.conversations.map((conv) =>
        conv._id === conversationId ? { ...conv, title } : conv
      );

      if (state.selectedConversation?._id === conversationId) {
        state.selectedConversation = {
          ...state.selectedConversation,
          title
        };
      }
    },

    // Interview Prep (What & Why):
    // What: Ek specific conversation ko list se delete karta hai.
    // Why: User delete button dabaye, toh list filter hoke update honi chahiye. Agar deleted conv active tha, toh selectedConversation ko null bhi karna zaroori hai.
    removeConversation: (state, action) => {
      const id = action.payload;
      state.conversations = state.conversations.filter((conv) => conv._id !== id);
      
      if (state.selectedConversation?._id === id) {
        state.selectedConversation = null;
      }
    },

    // Interview Prep (What & Why):
    // What: Saare conversations ko clear (reset) kar deta hai.
    // Why: User logout karne par pichla sensitive data cache me na rahe, security ke liye ye important hai.
    clearAllConversations: (state) => {
      state.conversations = [];
      state.selectedConversation = null;
    },

    // Interview Prep (What & Why):
    // What: Chat ko pin/unpin karta hai aur then sort karta hai.
    // Why: Pinned chats upar aane chahiye. Yahan pe custom sort logic hai jo pehle pin status check karta hai, fir recent (updatedAt) time ke basis pe arrange karta hai.
    togglePinConversation: (state, action) => {
      const id = action.payload;
      state.conversations = state.conversations.map((conv) =>
        conv._id === id ? { ...conv, isPinned: !conv.isPinned } : conv
      );
      
      state.conversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    },

    // Interview Prep (What & Why):
    // What: Conversation ko kisi specific folder/category me move karta hai.
    // Why: UI me folder categorization feature support karne ke liye.
    moveConvToFolder: (state, action) => {
      const { conversationId, folder } = action.payload;
      state.conversations = state.conversations.map((conv) =>
        conv._id === conversationId ? { ...conv, folder } : conv
      );
    }
  },
})

// Interview Prep (What & Why):
// What: Components me use karne ke liye action creators export kiye gaye hain.
// Why: RTK automatically dispatch actions generate karta hai jinki zarurat component me events handle karne ke liye padti hai.
export const { 
  setConversations, 
  addConversation, 
  setSelectedConversation, 
  setConvTitle, 
  removeConversation, 
  clearAllConversations, 
  togglePinConversation, 
  moveConvToFolder 
} = conversationSlice.actions

// Interview Prep (What & Why):
// What: Reducer function ko default export karte hain.
// Why: Main store configure karte time (store.js me) ye reducer pass karna padta hai.
export default conversationSlice.reducer