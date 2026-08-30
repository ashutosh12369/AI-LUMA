// [What] checkAgentLimit function import kar rahe hain rate limiting config se.
// [Why] Ye check karne ke liye ki particular user ne search functionality ki apni allowed limit (freemium quota) toh cross nahi kardi. Backend security ka part hai.
import { checkAgentLimit } from "../config/agentRateLimit.js";

// [What] deductCredits function import kar rahe hain aur Tavily search tool (searchTool) utility import kar rahe hain.
// [Why] deductCredits in-app currency system ko maintain rakhega. searchTool ek Langchain/external wrapper hai (jaise Tavily) jo internet par live search perform karne ke liye banaya gaya hai, LLMs ka data knowledge cutoff override karne ke liye.
import { deductCredits } from "../utils/deductCredits.js";
import { searchTool } from "../utils/tavily.js";

// [What] 'searchAgent' ek asynchronous function export kar rahe hain jo 'state' parameter accept karta hai.
// [Why] Ye LangGraph node (ya general agent workflow step) ki tarah act karta hai. State mein user input aur pura conversation history pass kiya jata hai.
export const searchAgent = async (state) => {
  // [What] Sabse pehle user ka "search" feature quota check karte hain await ke sath.
  // [Why] Execution shuru hone se pehle business logic validation zaroori hai, agar limit exceed hui toh ye error throw karke process yahi rok dega bina aage cloud bill badhaye.
  await checkAgentLimit(
    state.userId,
    "search"
  );
  
  // [What] Agar limit sahi hai toh search action ka specific credit cost user wallet se minus karte hain.
  // [Why] Web searching APIs (like Google Custom Search ya Tavily) paid hoti hain per API call, isliye hum internal system me credit balance subtract karte hain for accounting.
  await deductCredits(
    state.userId,
    "search"
  ); 

  // [What] Ek try...catch block start karte hain aage ke async internet call ko safely handle karne ke liye.
  // [Why] Internet search request network issue ya API rate limit ki wajah se fail ho sakti hai. Isse system crash hone se bachana zaroori hai.
  try {
    // [What] searchTool (e.g. Tavily agent) ke invoke() method ko call karke web search query perform kar rahe hain. User ka exact sawaal (state.prompt) pass kar rahe hain.
    // [Why] LLM apne internal knowledge ke bharose rehne ke bajaye realtime internet search karke zyada accurate aur current information (news, recent articles) prapt kare. RAG ka ek roop (Web RAG).
    const results = await searchTool.invoke({
      query: state.prompt
    });
    
    // [What] Server-side terminal me search ke results dump/print karte hain.
    // [Why] Sirf backend developers ki debugging aur monitoring ke liye taaki verify ho ki searchTool fetch kya kar raha hai (jaise URLs aur snippets).
    console.log(results);
    
    // [What] Purane state ko spread (...state) karke nayi property 'searchResults' inject karke next step ko return kar rahe hain.
    // [Why] Search Agent ka kaam sirf search data (knowledge) collect karna hota hai. Ye final data LLM agent node (jo iske baad chalega) me pass ho jayega taaki LLM use padh kar response formulate kare.
    return {
      ...state,
      searchResults: results,
    };
  } catch (error) {
    // [What] Agar search function ne crash kar diya (e.g. network timeout), toh catch block me error aayega jise console pe log kiya jayega.
    // [Why] Backend analytics (Sentry etc.) ya server logs padhte waqt developers ko issue ka root cause jaldi mil sake.
    console.log(error);
    
    // [What] Search fail hone par state update toh kar rahe hain, par 'searchResults' array empty bhej rahe hain.
    // [Why] Main pipeline crash hone se bach jaye aur LLM fallback karke user ko bata sake ki search nahi chal raha, gracefully degrade hone ke liye empty array safe default hai.
    return {
      ...state,
      searchResults: []
    };
  }
};