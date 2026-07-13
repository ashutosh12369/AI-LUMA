import React, { useEffect } from 'react'
import {BrowserRouter, Route, Routes} from "react-router-dom"
import Home from './pages/Home'
import SharedArtifact from './pages/SharedArtifact'
import useCurrentUser from './hooks/useCurrentUser'
function App() {
  useCurrentUser()
 
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
