// Interview Prep (What & Why):
// What: React, useEffect, aur other hooks ko import kar rahe hain.
// Why: React components banane ke liye 'react' jaruri hai, 'useEffect' se component mount hone par API call (side effects) manage karte hain.
import React from 'react'
import { useEffect } from 'react'

// Interview Prep (What & Why):
// What: Axios instance (api) import kar rahe hain.
// Why: Centralized axios configuration use karne se baseURL, headers, aur interceptors ko ek hi jagah manage karna aasan hota hai.
import api from '../utils/axios'

// Interview Prep (What & Why):
// What: react-redux se useDispatch hook import kar rahe hain.
// Why: Redux store ke actions ko dispatch (trigger) karne ke liye dispatch function chahiye hota hai.
import { useDispatch } from 'react-redux'

// Interview Prep (What & Why):
// What: user.slice se setUserData aur setIsCheckingAuth actions import kar rahe hain.
// Why: Redux global state mein logged-in user ki details update karne aur auth check loading state toggle karne ke liye.
import { setUserData, setIsCheckingAuth } from '../redux/user.slice'

// Interview Prep (What & Why):
// What: Ek custom hook 'useCurrentUser' define kar rahe hain.
// Why: Custom hooks complex logic (jaise API fetch karke global state update karna) ko encapsulate aur re-usable banate hain.
function useCurrentUser() {
    const dispatch = useDispatch()

    // Interview Prep (What & Why):
    // What: useEffect ka use karke component mount hone par API call lagai jaati hai.
    // Why: Empty dependency array '[]' ensure karta hai ki ye API call sirf ek baar ho (on initial render).
    useEffect(() => {
        // Interview Prep (What & Why):
        // What: Ek async function 'get' banaya hai data fetch karne ke liye.
        // Why: useEffect ka callback direct async nahi ho sakta, isliye andar ek function banake call karte hain.
        const get = async () => {
            try {
                // Interview Prep (What & Why):
                // What: Backend se current user ka data le rahe hain.
                // Why: Pata lagane ke liye ki user logged in hai ya nahi, aur uski profile information kya hai.
                const { data } = await api.get("/api/me")
                
                // Interview Prep (What & Why):
                // What: API se mili data ko Redux store me set kar rahe hain.
                // Why: Taki poore application me kisi bhi component ko user data easily mil sake bina baar-baar API call kiye.
                dispatch(setUserData(data.user))
            } catch (error) {
                // Interview Prep (What & Why):
                // What: Error ko console me log kar rahe hain.
                // Why: Debugging ke liye. Agar token invalid hai ya server down hai toh error throw hoga.
                console.log(error)
            } finally {
                // Interview Prep (What & Why):
                // What: Auth checking complete hone par setIsCheckingAuth ko false kar rahe hain.
                // Why: Finally block hamesha execute hota hai (chahe success ho ya error). Yeh UI ko batata hai ki loading (checking) ab khatam ho gayi hai.
                dispatch(setIsCheckingAuth(false))
            }
        }
        
        get()
    }, [])
}

// Interview Prep (What & Why):
// What: useCurrentUser hook ko default export kar rahe hain.
// Why: Taki ise dusre components (jaise App.jsx) me import karke use kiya ja sake.
export default useCurrentUser