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

export default api;