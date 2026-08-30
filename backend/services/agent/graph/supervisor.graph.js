// LangGraph se StateGraph import kar rahe hain, jo agents ko node-based workflow mein connect karne ka main engine hai.
import { StateGraph } from "@langchain/langgraph";

// AgentState import kar rahe hain, ye batata hai ki graph ke andar data (jaise prompt, conversationId) kis format mein flow karega.
import { AgentState } from "./state.js";

// Router node: Ye decide karta hai ki user ka prompt kis specialized agent ke paas jayega (AI Manager/Supervisor).
import { routerNode } from "./router.node.js";

// Alag-alag specialized agents import kar rahe hain. Har agent apna specific kaam karta hai.
import { chatAgent } from "../agents/chat.agent.js";         // Normal chat ke liye
import { codingAgent } from "../agents/coding.agent.js";     // Coding related problems ke liye
import { searchAgent } from "../agents/search.agent.js";     // Web search (Tavily) ke liye
import { pdfAgent } from "../agents/pdf.agent.js";           // PDF generate karne ke liye
import { pptAgent } from "../agents/ppt.agent.js";           // PowerPoint slides banane ke liye
import { imageAgent } from "../agents/imageGen.agent.js";    // AI se images banwane ke liye
import { visionAgent } from "../agents/vision.agent.js";     // Image upload karke analyze karne ke liye
import { pdfRagAgent } from "../agents/pdfRag.agent.js";     // Uploaded PDFs padhne aur Qdrant RAG karne ke liye
import { dataAgent } from "../agents/data.agent.js";         // CSV/Excel data visualize karne ke liye
import { githubAgent } from "../agents/github.agent.js";     // GitHub repos read/write karne ke liye
import { plannerNode } from "./planner.node.js";             // Auto-Pilot mode mein multiple agents ko step-by-step chalane wala planner.

// Ek naya StateGraph bana rahe hain AgentState ke type structure ke sath. 
// Ye hamara main AI brain/workflow banega jisme hum saare agents ko connect karenge.
const workflow = new StateGraph(AgentState);

// === NODES ADDITION ===
// Har agent ko ek "node" (ek block) ki tarah graph mein add kar rahe hain, aur usko ek naam de rahe hain.
workflow.addNode("router", routerNode);
workflow.addNode("chat", chatAgent);
workflow.addNode("coding", codingAgent);
workflow.addNode("search", searchAgent);
workflow.addNode("pdf", pdfAgent);
workflow.addNode("ppt", pptAgent);
workflow.addNode("image", imageAgent);
workflow.addNode("vision", visionAgent);
workflow.addNode("pdf_rag", pdfRagAgent);
workflow.addNode("data", dataAgent);
workflow.addNode("github", githubAgent);
workflow.addNode("planner", plannerNode); // Auto-pilot brain

// === GRAPH EDGES ===
// Graph ka starting point (__start__) seedha "router" ke paas jayega.
// Yaani jab bhi user request bhejega, sabse pehle router (supervisor) sochega ki kya karna hai.
workflow.addEdge("__start__", "router");

// === ROUTER LOGIC ===
// Router node ke baad traffic kahan jayega? Uske liye conditional logic laga rahe hain.
workflow.addConditionalEdges(
 "router",
 (state) => {
  // Router jo bhi agent ka naam state.agent mein set karega, ye switch case traffic wahi bhej dega.
  switch(state.agent){
   case "search": return "search";
   case "coding": return "coding";
   case "pdf": return "pdf";
   case "ppt": return "ppt";
   case "image": return "image";
   case "vision": return "vision";
   case "pdf_rag": return "pdf_rag";
   case "data": return "data";
   case "github": return "github";
   default: return "chat"; // Agar kuch aur samajh na aaye toh default chat agent paas bhej do.
  }
 },
 {
  // Mapping options for LangGraph internals
  chat: "chat",
  search: "search",
  coding: "coding",
  pdf: "pdf",
  ppt: "ppt",
  image: "image",
  vision: "vision",
  pdf_rag: "pdf_rag",
  data: "data",
  github: "github"
 }
);

// === POST-AGENT ROUTING (Auto-Pilot Logic) ===
// Ye function check karta hai ki agar Auto-Pilot (isAutonomous) ON hai, toh process end mat karo balki planner ke paas wapas jao naya task lene.
// Agar Auto-Pilot OFF hai, toh kaam khatam (send to __end__).
const routeAfterAgent = (state) => {
  if (state.isAutonomous) return "planner";
  return "__end__";
};

// Sabhi normal agents ko routeAfterAgent function se connect kar diya.
workflow.addConditionalEdges("coding", routeAfterAgent);
workflow.addConditionalEdges("image", routeAfterAgent);
workflow.addConditionalEdges("pdf", routeAfterAgent);
workflow.addConditionalEdges("ppt", routeAfterAgent);
workflow.addConditionalEdges("chat", routeAfterAgent);
workflow.addConditionalEdges("vision", routeAfterAgent);
workflow.addConditionalEdges("pdf_rag", routeAfterAgent);
workflow.addConditionalEdges("data", routeAfterAgent);
workflow.addConditionalEdges("github", routeAfterAgent);

// Search agent ka thoda alag rule hai: agar manual mode hai, toh search ke baad data chat agent ko de do taaki wo final answer form kare.
workflow.addConditionalEdges("search", (state) => {
  if (state.isAutonomous) return "planner";
  return "chat";
});

// Auto-Pilot ka Planner logic: Agar planner bole ki "done" ho gaya hai task, toh __end__ kar do.
// Nahi toh wapas "router" par bhej do agle agent se naya step karwane ke liye (Infinite loop possibility yahi se aati hai).
workflow.addConditionalEdges("planner", (state) => {
  if (state.agent === "done") return "__end__";
  return "router"; // go back to router to invoke the chosen agent
});

// Finally, graph ko compile karke export kar rahe hain taaki agent.controller.js iska use kar sake.
export const graph = workflow.compile();