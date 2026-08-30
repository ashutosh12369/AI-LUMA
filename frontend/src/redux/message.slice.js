// Interview Prep (What & Why):
// What: @reduxjs/toolkit se createSlice import kiya hai.
// Why: RTK ka standard tarika hai slice banane ka jo actions aur reducers ko simplify karta hai.
import { createSlice } from '@reduxjs/toolkit'

// Interview Prep (What & Why):
// What: initial state set ki hai (messages array, isLoading boolean, artifacts array).
// Why: First render ke time Redux ko pata hona chahiye ki default values kya hain.
const initialState = {
  messages: [],
  isLoading: false,
  artifacts: []
}

export const messageSlice = createSlice({
  // Interview Prep (What & Why):
  // What: Slice ka naam 'message' hai.
  // Why: State tree me state.message ke under data save hota hai. Action type internally 'message/actionName' banta hai.
  name: 'message',
  initialState,
  reducers: {
    // Interview Prep (What & Why):
    // What: Pura messages array update karta hai.
    // Why: Jab user purana conversation open karta hai, toh API se fetched saare messages ek saath set karne padte hain.
    setMessages: (state, action) => {
      state.messages = action.payload;
    },

    // Interview Prep (What & Why):
    // What: Naya message array ke end (push) me append karta hai.
    // Why: Real-time chat me jab naya message send ya receive hota hai, toh woh existing list ke neeche add hona chahiye.
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    
    // Interview Prep (What & Why):
    // What: Loading status ko toggle karta hai (true/false).
    // Why: UI me spinner ya typing indicator dikhane ke liye (jab AI reply generate kar raha ho).
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    // Interview Prep (What & Why):
    // What: Artifacts data update karta hai.
    // Why: Agar AI koi specific structure ya document format (artifact) return kar raha hai, usko store karne ke liye.
    setArtifacts: (state, action) => {
      state.artifacts = action.payload;
    },
    
    // Interview Prep (What & Why):
    // What: Ek specific index par rakhe message ko update karta hai.
    // Why: Streaming response (Jaise ChatGPT type karta hai) me particular last message ya failed message ko update karna padta hai instead of adding new.
    updateMessage: (state, action) => {
      const { index, message } = action.payload;
      state.messages[index] = message;
    },
    
    // Interview Prep (What & Why):
    // What: Array ke last message ko nikaal deta hai (pop).
    // Why: Agar message bhejne me server error aa jaye, toh optimistic UI me added message ko hatane (revert karne) ke kaam aata hai.
    removeLastMessage: (state) => {
      state.messages.pop();
    }
  },
})

// Interview Prep (What & Why):
// What: Components ke dispatch ke liye functions (Action creators) export karte hain.
// Why: RTK automatically unreducers se functions banata hai jo hum 'dispatch(addMessage(data))' ki tarah call karte hain.
export const { 
  setMessages, 
  addMessage, 
  setIsLoading, 
  setArtifacts, 
  updateMessage, 
  removeLastMessage 
} = messageSlice.actions

// Interview Prep (What & Why):
// What: Pure slice ka combine reducer export kiya ja raha hai.
// Why: Ise store.js me root reducer banate waqt use karenge.
export default messageSlice.reducer