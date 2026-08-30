// Interview Prep (What & Why):
// What: configureStore function import kar rahe hain Redux Toolkit se.
// Why: RTK mein configureStore boilerplate code (jaise thunk middleware, Redux devtools) automatically handle karta hai, jisse store banana bohot aasan ho jata hai.
import { configureStore } from '@reduxjs/toolkit'

// Interview Prep (What & Why):
// What: Alag alag logic slices ke reducers import kar rahe hain.
// Why: Har feature (user, conversation, message) apna khud ka local state manage karta hai apni slice file me, taaki code organized aur maintainable rahe.
import userSlice from './user.slice'
import conversationSlice from './conversation.slice'
import messageSlice from './message.slice'

// Interview Prep (What & Why):
// What: Global Redux Store create kar rahe hain aur use export kar rahe hain.
// Why: Ye central store application ki saari states ko ek jagah hold karta hai. React components isse data read karte hain aur actions dispatch karke iska data modify karte hain.
export const store = configureStore({
  // Interview Prep (What & Why):
  // What: Sabhi imported slice reducers ko root reducer me combine kar rahe hain.
  // Why: Redux ka asool hai ki sirf ek root state (single source of truth) hoti hai. Keys ('user', 'conversation', 'message') decide karti hain ki global state ka naam kya hoga (e.g., state.user).
  reducer: {
    user: userSlice,
    conversation: conversationSlice,
    message: messageSlice
  },
})