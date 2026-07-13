import {
 StateGraph
}
from "@langchain/langgraph";

import {
 AgentState
}
from "./state.js";

import {
 routerNode
}
from "./router.node.js";

import {
 chatAgent
}
from "../agents/chat.agent.js";

import {
 codingAgent
}
from "../agents/coding.agent.js";

import {
 searchAgent
}
from "../agents/search.agent.js";

import {
 pdfAgent
}
from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { imageAgent } from "../agents/imageGen.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfRagAgent } from "../agents/pdfRag.agent.js";
import { dataAgent } from "../agents/data.agent.js";
import { githubAgent } from "../agents/github.agent.js";
import { plannerNode } from "./planner.node.js";

const workflow =
new StateGraph(
 AgentState
);

workflow.addNode(
 "router",
 routerNode
);

workflow.addNode(
 "chat",
 chatAgent
);

workflow.addNode(
 "coding",
 codingAgent
);

workflow.addNode(
 "search",
 searchAgent
);

workflow.addNode(
 "pdf",
 pdfAgent
);
workflow.addNode(
 "ppt",
 pptAgent
);
workflow.addNode(
 "image",
 imageAgent
);
workflow.addNode(
 "vision",
 visionAgent
);
workflow.addNode(
 "pdf_rag",
 pdfRagAgent
);
workflow.addNode(
 "data",
 dataAgent
);
workflow.addNode(
 "github",
 githubAgent
);
workflow.addNode(
 "planner",
 plannerNode
);
workflow.addEdge(
 "__start__",
 "router"
);

workflow.addConditionalEdges(

 "router",

 (state)=>{

  switch(state.agent){

   case "search":
    return "search";

   case "coding":
    return "coding";

   case "pdf":
    return "pdf";

    case "ppt":
    return "ppt";

    case "image":
    return "image";

    case "vision":
    return "vision";
    case "pdf_rag":
    return "pdf_rag";
    case "data":
    return "data";
    case "github":
    return "github";

   default:
    return "chat";

  }

 },

 {

  chat:"chat",

  search:"search",

  coding:"coding",

  pdf:"pdf",
   ppt:"ppt",
   image:"image",
   vision:"vision",
   pdf_rag:"pdf_rag",
   data:"data",
   github:"github"

 }

);

const routeAfterAgent = (state) => {
  if (state.isAutonomous) return "planner";
  return "__end__";
};

workflow.addConditionalEdges("coding", routeAfterAgent);
workflow.addConditionalEdges("image", routeAfterAgent);
workflow.addConditionalEdges("pdf", routeAfterAgent);
workflow.addConditionalEdges("ppt", routeAfterAgent);
workflow.addConditionalEdges("chat", routeAfterAgent);
workflow.addConditionalEdges("vision", routeAfterAgent);
workflow.addConditionalEdges("pdf_rag", routeAfterAgent);
workflow.addConditionalEdges("data", routeAfterAgent);
workflow.addConditionalEdges("github", routeAfterAgent);

workflow.addConditionalEdges("search", (state) => {
  if (state.isAutonomous) return "planner";
  return "chat";
});

workflow.addConditionalEdges("planner", (state) => {
  if (state.agent === "done") return "__end__";
  return "router"; // go back to router to invoke the chosen agent
});

export const graph =
workflow.compile();