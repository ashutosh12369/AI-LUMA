import { ChatOpenRouter } from "@langchain/openrouter";
import dotenv from "dotenv";
dotenv.config();

const openRouter = new ChatOpenRouter({
  model: "deepseek/deepseek-chat",
  temperature: 0,
  maxTokens: 2500
});

export const gemini = openRouter; 

export const getModel = (agent) => {
  return openRouter;
}
