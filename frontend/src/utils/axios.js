// Axios HTTP client import kar rahe hain backend (Gateway) se baat karne ke liye.
import axios from "axios";

// Ek custom Axios instance banaya hai jisme kuch default settings hain.
const api = axios.create({
  // Base URL `.env` file se aa rahi hai (e.g., http://localhost:5000)
  baseURL: import.meta.env.VITE_SERVER_URL,
  // withCredentials: true zaroori hai taaki frontend secure HttpOnly cookies (JWT token) backend ko bhej sake.
  withCredentials: true
});

// === REQUEST INTERCEPTOR ===
// Ye function har API request backend pe jaane se theek pehle chalta hai.
api.interceptors.request.use((config) => {
  // LocalStorage se GitHub token nikalte hain.
  const githubToken = localStorage.getItem("github_token");
  if (githubToken) {
    // Agar token hai, toh use HTTP headers mein add kar dete hain. 
    // Isse backend ka Agent service Octokit ke through GitHub data access kar pata hai.
    config.headers["x-github-token"] = githubToken;
  }
  return config; // Modified request aage bhej do
});

// === RESPONSE INTERCEPTOR (Auto-Retry Logic for Render Cold Starts) ===
// Ye function backend se response aane ke baad, par hamare component (React) tak pahunchne se pehle chalta hai.
api.interceptors.response.use(
  // Agar API call successful hai (e.g. 200 OK), toh seedha response return kar do.
  (response) => response,
  
  // Agar API fail ho gayi (Error aaya), toh ye async function chalta hai.
  async (error) => {
    const config = error.config;
    
    if (!config) {
      // Agar config hi nahi hai, toh error throw kardo.
      return Promise.reject(error);
    }
    
    // config.retryCount track karega ki humne kitni baar retry kar liya hai.
    config.retryCount = config.retryCount || 0;
    
    // Render Free Tier ki wajah se 5 microservices ko ek ke baad ek jagane (Sequential Wakeup) mein 3 minute tak lag sakte hain.
    const maxRetries = 15; // Hum 15 baar tak try karenge
    
    // Ye check karta hai ki kya ye error Render ke "Server Asleep" hone ki wajah se hai?
    const isColdStartError = 
      !error.response || // No response (network timeout)
      error.response.status === 502 || // Bad Gateway
      error.response.status === 503 || // Service Unavailable
      error.response.status === 504 || // Gateway Timeout
      (error.response.status === 500 && error.response.data?.title === "Server Waking Up");
      
    // Agar "Cold Start Error" hai AUR 15 retries poore nahi hue hain...
    if (isColdStartError && config.retryCount < maxRetries) {
      config.retryCount += 1;
      
      // ...Toh 12 seconds ka delay daal do (12000 milliseconds).
      const delay = 12000; 
      
      console.log(`[Auto-Retry] Backend might be asleep. Retrying request... (Attempt ${config.retryCount}/${maxRetries})`);
      
      // Ek Promise banate hain jo 12 seconds baad same request dobara bheje (setTimeout).
      // Ye user ko red error dikhne se bacha leta hai aur background mein chup-chaap retry karta rehta hai.
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api(config));
        }, delay);
      });
    }
    
    // Agar 15 baar retry karne ke baad bhi server nahi utha, toh sach mein error throw kardo.
    return Promise.reject(error);
  }
);

// Is custom api instance ko export karte hain taaki pure React app mein sirf isika use ho.
export default api;