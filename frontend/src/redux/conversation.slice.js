import { createSlice } from '@reduxjs/toolkit'


const initialState = {
   conversations:[],
  selectedConversation:null
}

export const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
     setConversations:(state,action)=>{
   state.conversations=action.payload;

  },

  addConversation:(state,action)=>{

   state.conversations.unshift(action.payload);

  },

  setSelectedConversation: (state,action)=>{

   state.selectedConversation =action.payload;

  },
setConvTitle:(state,action)=>{

 const {
  conversationId,
  title
 } = action.payload;

 state.conversations =
 state.conversations.map((conv)=>
  conv._id === conversationId
   ? {
      ...conv,
      title
     }
   : conv
 );

 if(
  state.selectedConversation?._id ===
  conversationId
 ){

  state.selectedConversation = {
   ...state.selectedConversation,
   title
  };

 }

},
removeConversation:(state,action)=>{
 const id = action.payload;
 state.conversations = state.conversations.filter((conv)=>conv._id !== id);
 if(state.selectedConversation?._id === id){
  state.selectedConversation = null;
 }
},
clearAllConversations:(state)=>{
 state.conversations = [];
 state.selectedConversation = null;
},
togglePinConversation:(state,action)=>{
 const id = action.payload;
 state.conversations = state.conversations.map((conv)=>
  conv._id === id ? { ...conv, isPinned: !conv.isPinned } : conv
 );
 state.conversations.sort((a,b)=>{
  if(a.isPinned && !b.isPinned) return -1;
  if(!a.isPinned && b.isPinned) return 1;
  return new Date(b.updatedAt) - new Date(a.updatedAt);
 });
}
 
  },
})

// Action creators are generated for each case reducer function
export const {setConversations,addConversation,setSelectedConversation,setConvTitle,removeConversation,clearAllConversations,togglePinConversation} = conversationSlice.actions

export default conversationSlice.reducer