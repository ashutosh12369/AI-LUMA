// react-redux se hooks import karte hain, taaki Redux global store se data padh (useSelector) aur likh (useDispatch) sakein.
import { useDispatch, useSelector } from "react-redux";
// react-icons se Google aur GitHub logo icons UI me dikhane ke liye import kiye gaye hain.
import { FaGoogle, FaGithub } from "react-icons/fa";

// UI ke main parts (components) import kiye gaye hain
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";

// API (axios instance) import kiya gaya hai backend endpoints par HTTP requests bhejne ke liye.
import api from "../utils/axios";
// user.slice se setUserData action import kiya gaya hai, taaki login ke baad user ki detail Redux store me save ho.
import { setUserData } from "../redux/user.slice";

// Firebase auth SDKs. Popup based sign-in aur providers import kiye gaye hain.
import { signInWithPopup, GithubAuthProvider } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../../firebase";

// React ka local state management hook.
import { useState } from "react";

// Home component application ka main page hai jahan chat, sidebar aur login modal dikhte hain.
function Home() {
  // Mobile screens me sidebar khula hai ya nahi track karne ke liye state. Default band (false) hai.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Redux store se userData aur isCheckingAuth le rahe hain. 
  // isCheckingAuth true hota hai jab initial page load pe token verify ho raha ho, taaki flicker se bacha ja sake.
  const { userData, isCheckingAuth } = useSelector(state => state.user);
  
  // Dispatch function action bhejne (trigger karne) ke liye.
  const dispatch = useDispatch();

  // Custom function backend ko token bhej kar login verify karne ke liye.
  const login = async (token) => {
    try {
      // POST request bhejte hain backend /api/auth/login par, body me Firebase ID token hai.
      const { data } = await api.post(`/api/auth/login`, { token });
      // Backend verify karke user object deta hai, jise hum Redux store me daal dete hain.
      dispatch(setUserData(data.user));
    } catch (error) {
      // Agar backend se error aaye (jaise token invalid ho), toh console me log aur alert show karo.
      console.log(error);
      alert("Backend Login Error: " + (error.response?.data?.message || error.message));
    }
  }

  // Google se login karne ka function
  const handleGoogleLogin = async () => {
    // signInWithPopup browser me Google login popup kholta hai.
    const result = await signInWithPopup(auth, googleProvider);
    // Successful hone par Firebase ID token nikalte hain.
    const token = await result.user.getIdToken();
    // Phir backend auth mechanism trigger karte hain.
    await login(token);
  };

  // GitHub se login karne ka function
  const handleGithubLogin = async () => {
    try {
      // signInWithPopup GitHub ke liye popup kholta hai.
      const result = await signInWithPopup(auth, githubProvider);
      
      // GitHub me humein extra token (accessToken) milta hai API access ke liye. Usse nikal rahe hain.
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential.accessToken;
      
      // Agar GitHub token mila, toh browser storage me save karo taaki repo access karne me kaam aaye.
      if (githubToken) {
        localStorage.setItem("github_token", githubToken);
      }
      
      // Firebase ka ID token lete hain auth ke liye.
      const token = await result.user.getIdToken();
      // Backend ko bhejte hain verified auth ke liye.
      await login(token);
    } catch (error) {
      // Error handling
      console.error("GitHub login error:", error);
      alert("Login Error: " + error.message);
    }
  };

  return (
    // Main Wrapper container. Poori screen height (h-screen), flexbox layout, custom space theme (bg-space bg-grid) lagai hai.
    // overflow-hidden ensure karta hai ki page pe extra scrollbar na aaye.
    <div className="h-screen flex bg-space bg-grid text-white overflow-hidden relative">
      
      {/* Sidebar Component: Left side menu jisme chats ki history dikhti hai */}
      <Sidebar isMobileOpen={isMobileSidebarOpen} setIsMobileOpen={setIsMobileSidebarOpen} />
      
      {/* ChatArea Component: Beech ka hissa jahan messages hote hain. 
          Isko callback 'onOpenSidebar' diya hai taaki mobile me button dabane se sidebar khul sake. */}
      <ChatArea onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
      
      {/* ArtifactPanel: Right side ka panel jo code ya documents preview karta hai */}
      <ArtifactPanel />

      {/* Login Modal Logic (Conditional Rendering) */}
      {/* Agar auth check complete ho chuka hai (!isCheckingAuth) aur koi user logged in nahi hai (!userData) */}
      {!isCheckingAuth && !userData && (
        // Ye ek fixed overlay backdrop (black tint + blur) banata hai jo puri screen cover kar lega (z-50 hone ke karan sabse upar)
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          
          {/* Modal popup box jiski styling ki gayi hai (borders, dark background, rounded corners) */}
          <div className="w-[92vw] max-w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">

            {/* Modal Heading Section */}
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">Welcome to AI-LUMA</h2>
              <p className="text-[13px] text-slate-500">Please login to continue using the app.</p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 hover:from-indigo-400 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-150 cursor-pointer"
            >
              <FaGoogle size={15} className="text-white" />
              Continue with Google
            </button>

            {/* GitHub Login Button */}
            <button
              onClick={handleGithubLogin}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-[#24292e] hover:bg-[#2f363d] active:bg-[#1a1e22] border border-white/10 shadow-lg shadow-black/20 hover:shadow-black/30 transition-all duration-150 cursor-pointer"
            >
              <FaGithub size={15} className="text-white" />
              Continue with GitHub
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

export default Home;