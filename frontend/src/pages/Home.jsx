import { useDispatch, useSelector } from "react-redux";
import { FaGoogle, FaGithub } from "react-icons/fa";
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { signInWithPopup, GithubAuthProvider } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../../firebase";

function Home() {
  const { userData, isCheckingAuth } = useSelector(state => state.user);
  const dispatch=useDispatch()
const login=async (token)=>{
  try {
    const {data}=await api.post(`/api/auth/login`,{token})
    dispatch(setUserData(data.user))
  } catch (error) {
    console.log(error)
    alert("Backend Login Error: " + (error.response?.data?.message || error.message));
  }
}
  const handleGoogleLogin =async () => {
     const result =
     await signInWithPopup(auth,googleProvider);
    
     const token =await result.user.getIdToken();
     await login(token)
  };

  const handleGithubLogin = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      
      // Get the GitHub access token (needed for the GitHub agent)
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential.accessToken;
      
      // Save it in local storage or pass it to backend so agent can use it
      if (githubToken) {
        localStorage.setItem("github_token", githubToken);
      }

      const token = await result.user.getIdToken();
      await login(token);
    } catch (error) {
      console.error("GitHub login error:", error);
      alert("Login Error: " + error.message);
    }
  };

  return (
<div className="h-screen flex bg-transparent text-white overflow-hidden">
      <Sidebar />
      <ChatArea />
      <ArtifactPanel />

      {!isCheckingAuth && !userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[92vw] max-w-[340px] glass-panel rounded-2xl p-7 flex flex-col gap-5">

            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">Welcome to AI-LUMA</h2>
              <p className="text-[13px] text-slate-500">Please login to continue using the app.</p>
            </div>

            <button
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 active:bg-slate-800 border border-white/10 transition-all duration-150 cursor-pointer"
>
  <FaGoogle size={15} className="text-white" />
  Continue with Google
</button>

<button
  onClick={handleGithubLogin}
  className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-[#24292e] hover:bg-[#2f363d] active:bg-[#1a1e22] border border-white/10 transition-all duration-150 cursor-pointer"
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