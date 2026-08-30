// Interview Prep (What & Why):
// What: Hum yahaan Redux Toolkit se createSlice import kar rahe hain.
// Why: Yeh Redux state manage karne ke liye boiler plate code kam karta hai aur ek hi jagah par actions aur reducer define karne ki suvidha deta hai.
import { createSlice } from '@reduxjs/toolkit'
// Interview Prep (What & Why):
// What: React se act function import kiya gaya hai.
// Why: Yeh test environment mein state updates ko wrap karne ke liye use hota hai, taaki testing ke waqt unexpected behavior na aaye.
import { act } from 'react'

// Interview Prep (What & Why):
// What: Yahaan hum slice ki initial state define kar rahe hain.
// Why: App load hone par default state set karni zaroori hai. Shuruaat mein userData null hoga aur isCheckingAuth true rahega jab tak auth status confirm na ho jaye.
const initialState = {
  userData: null,
  isCheckingAuth: true
}

// Interview Prep (What & Why):
// What: Yahaan hum createSlice ka use karke 'user' naam se ek slice banate hain.
// Why: Ek Redux store ko multiple slices mein divide kiya jata hai taaki har feature (jaise 'user') ki state independent aur manageable rahe.
export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Interview Prep (What & Why):
    // What: setUserData ek reducer function hai jo current state ke userData ko update karta hai.
    // Why: Jab user login ya logout karta hai, tab API response ke according central state mein user ka data set karna hota hai.
    setUserData: (state, action) => {
        state.userData = action.payload
    },
    // Interview Prep (What & Why):
    // What: setIsCheckingAuth ek aur reducer hai jo isCheckingAuth flag ko set karta hai.
    // Why: Yeh flag UI ko batane ke liye use hota hai (jaise loading spinner dikhana) ki backend se auth verification abhi chal raha hai.
    setIsCheckingAuth: (state, action) => {
        state.isCheckingAuth = action.payload
    }
  },
})

// Interview Prep (What & Why):
// What: userSlice.actions ko destructure karke setUserData aur setIsCheckingAuth ko export kar rahe hain.
// Why: In actions ko components mein dispatch kar ke hum global state ko update kar sakte hain.
export const { setUserData, setIsCheckingAuth } = userSlice.actions

// Interview Prep (What & Why):
// What: Default export mein userSlice.reducer bheja ja raha hai.
// Why: Ise hum main Redux store mein configure karenge, taaki store is slice ki state ko apne andar include kar sake.
export default userSlice.reducer