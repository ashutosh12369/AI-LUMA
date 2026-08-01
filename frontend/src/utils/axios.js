import axios from "axios";

const api = axios.create({
 baseURL: import.meta.env.VITE_SERVER_URL,
 withCredentials: true
});

api.interceptors.request.use((config) => {
  const githubToken = localStorage.getItem("github_token");
  if (githubToken) {
    config.headers["x-github-token"] = githubToken;
  }
  return config;
});

// Auto-Retry Interceptor for Cold Starts (Sleep Mode)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    if (!config) {
      return Promise.reject(error);
    }
    
    config.retryCount = config.retryCount || 0;
    // Sequential wakeups of 5 Render microservices can take up to 3 minutes!
    const maxRetries = 15;
    
    // Identify errors that are typical for sleeping Render instances
    const isColdStartError = 
      !error.response || 
      error.response.status === 502 ||
      error.response.status === 503 ||
      error.response.status === 504 ||
      (error.response.status === 500 && error.response.data?.title === "Server Waking Up");
      
    if (isColdStartError && config.retryCount < maxRetries) {
      config.retryCount += 1;
      
      // 12 seconds delay between each retry
      const delay = 12000; 
      
      console.log(`[Auto-Retry] Backend might be asleep. Retrying request... (Attempt ${config.retryCount}/${maxRetries})`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api(config));
        }, delay);
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;