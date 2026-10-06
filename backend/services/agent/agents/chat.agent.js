/**
 * Chat Agent: Handles general conversational queries and standard AI interactions.
 */

import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { getMemory } from "../utils/memory.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
export const chatAgent = async (state) => {
  await checkAgentLimit(
    state.userId,
    "chat"
  );
  await deductCredits(
    state.userId,
    "chat"
  );
  const llm = getModel("chat");
  const history = await getMemory(
    state.conversationId
  );
  const searchContext = state.searchResults
    ? `Web Search Results:\n${JSON.stringify(state.searchResults, null, 2)}\nAnswer the user using only the above search results.`
    : "";
  const messages = [
    new SystemMessage(
      `You are AI-LUMA, an intelligent AI assistant.\n${searchContext}\nIf searchContext exists:\n- Use search results to answer.\n- Do not mention internal tools.\nRules:\n- For simple questions, greetings, and short queries, respond naturally in plain text.\n- For technical, educational, coding, or detailed topics, use clean Markdown.\nFormatting:\n- Use # for titles and ## for sections.\n- Leave a blank line after headings.\n- Use bullet points for lists.\n- Use numbered lists for steps.\n- Use fenced code blocks with language tags for code.\n- Keep paragraphs short and readable.\n- Never write headings and content on the same line.\n- Never generate large walls of text.`
    )
  ];
  history.forEach((msg) => {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    }
    if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  });
  messages.push(
    new HumanMessage(state.prompt)
  );
  const response = await llm.invoke(messages);
  const images = state.searchResults?.images || [];
  return {
    ...state,
    response: response.content,
    images: images
  };
};
