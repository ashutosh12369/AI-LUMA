// Interview Prep (What & Why):
// What: React aur useEffect ko import kiya ja raha hai.
// Why: Component lifecycle hooks ka use karne ke liye. useEffect component mount hone par initial tasks run karta hai.
import React, { useEffect } from 'react'

// Interview Prep (What & Why):
// What: react-router-dom se BrowserRouter, Route aur Routes ko import kiya ja raha hai.
// Why: Single Page Application (SPA) mein client-side routing ko enable karne ke liye in tools ka hona zaroori hai.
import {BrowserRouter, Route, Routes} from "react-router-dom"

import Home from './pages/Home'
import SharedArtifact from './pages/SharedArtifact'
import useCurrentUser from './hooks/useCurrentUser'
import { wakeUpServers } from './utils/wakeup'

// Interview Prep (What & Why):
// What: App component hamare React application ka entry root component hai.
// Why: Global hooks aur routes ko is top-level component par define kiya jata hai taaki saari nested components inke rules follow karein.
function App() {
  // Interview Prep (What & Why):
  // What: useCurrentUser custom hook call kiya ja raha hai.
  // Why: Jaise hi app load ho, user ka session ya profile data load karna zaroori hai taaki global state sync mein rahe.
  useCurrentUser()
 
  // Interview Prep (What & Why):
  // What: useEffect ke andar empty dependency array ([]) ke saath wakeUpServers function call ho raha hai.
  // Why: Yeh sirf component ke first mount par chalega taaki inactive backend services ko jagaya ja sake bina bar-bar extra API calls kiye.
  useEffect(() => {
    wakeUpServers();
  }, []);
 
  // Interview Prep (What & Why):
  // What: JSX mein BrowserRouter aur Routes ka use kiya gaya hai jismein multiple Route define hain.
  // Why: Yeh decide karta hai ki browser ki URL path ke according konsa page component dikhana hai. Jaise '/' par Home aur '/shared/:shareId' par SharedArtifact page.
  return (
   <BrowserRouter>
   <Routes>
    <Route path='/' element={<Home/>}/>
    <Route path='/shared/:shareId' element={<SharedArtifact/>}/>
   </Routes>
   </BrowserRouter>
  )
}

export default App