import { createSlice } from '@reduxjs/toolkit'


const initialState = {
   messages:[],
   isLoading:false,
   artifacts:[]
}

export const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setMessages:(state,action)=>{

   state.messages =action.payload;

  },

  addMessage:(state,action)=>{

   state.messages.push(action.payload);

  },
   setIsLoading:(state,action)=>{

   state.isLoading=action.payload;

  },
  setArtifacts: (state, action) => {
  state.artifacts = action.payload;
},
  updateMessage:(state,action)=>{
 const { index, message } = action.payload;
 state.messages[index] = message;
},
  removeLastMessage:(state)=>{
 state.messages.pop();
}
 
  },
})

// Action creators are generated for each case reducer function
export const {setMessages,addMessage,setIsLoading,setArtifacts,updateMessage,removeLastMessage} = messageSlice.actions

export default messageSlice.reducer