// 💡 WHAT: chatAgent function export ho raha hai jo user ke inputs ko process karke AI response generate karega.
// ❓ WHY: Async isliye use kiya gaya hai kyuki database validation (limits), credit updates, aur AI API calls (I/O operations) me time lagta hai aur execution block nahi honi chahiye.
export const chatAgent = async (state) => {
  
  // 💡 WHAT: User ki rate limit check kar rahe hain ki kya wo current cycle me aur request kar sakta hai ya nahi.
  // ❓ WHY: Server ko overload (DDoS ya spam) se bachane ke liye aur fair usage policy enforce karne ke liye.
  await checkAgentLimit(
    // User ki unique ID pass ki ja rahi hai identify karne ke liye
    state.userId,
    // Agent ka type "chat" bataya ja raha hai taaki specific limits apply ho sakein
    "chat"
  );

  // 💡 WHAT: User ke account se credits/points kaat rahe hain is request ke badle.
  // ❓ WHY: Monetization logic. Har AI query cost karti hai, isliye virtual currency manage karni zaroori hoti hai taaki financial loss na ho.
  await deductCredits(
    // User jisne request ki hai
    state.userId,
    // Kis service ke liye charge kar rahe hain ("chat")
    "chat"
  );

  // 💡 WHAT: Chat feature ke liye required LLM (Large Language Model) ka instance le rahe hain.
  // ❓ WHY: Different agents (coding, data) alag models (jaise gpt-4 vs gpt-3.5) use kar sakte hain, isliye function-based instantiation best practice hai.
  const llm = getModel("chat");

  // 💡 WHAT: Database se is session (conversationId) ki purani baatchit (chat history) utha rahe hain.
  // ❓ WHY: AI models inherently "stateless" hote hain (purani batein yaad nahi rakhte). Isliye har nayi request me pichla context bhejnak padta hai.
  const history = await getMemory(
    state.conversationId
  );

  // 💡 WHAT: Agar agent ne web search ki hai, to uske results ko ek string format me convert kar rahe hain.
  // ❓ WHY: RAG (Retrieval-Augmented Generation). Model ko internet ka current data dene ke liye, taaki wo accurate answer de sake, warna wo halluinate kar sakta hai.
  const searchContext = state.searchResults
    ? `Web Search Results:\n${JSON.stringify(state.searchResults, null, 2)}\nAnswer the user using only the above search results.`
    : "";

  // 💡 WHAT: Messages ka ek array banaya, jisme sabse pehle "SystemMessage" rakha gaya hai.
  // ❓ WHY: System prompt AI ko uski identity aur behaviour rules (jaise markdown format, rules) batata hai. Isse hallucination rukti hai.
  const messages = [
    new SystemMessage(
      `You are AI-LUMA, an intelligent AI assistant.\n${searchContext}\nIf searchContext exists:\n- Use search results to answer.\n- Do not mention internal tools.\nRules:\n- For simple questions, greetings, and short queries, respond naturally in plain text.\n- For technical, educational, coding, or detailed topics, use clean Markdown.\nFormatting:\n- Use # for titles and ## for sections.\n- Leave a blank line after headings.\n- Use bullet points for lists.\n- Use numbered lists for steps.\n- Use fenced code blocks with language tags for code.\n- Keep paragraphs short and readable.\n- Never write headings and content on the same line.\n- Never generate large walls of text.`
    )
  ];

  // 💡 WHAT: Pichli chat history ko loop karke 'messages' array me daal rahe hain.
  // ❓ WHY: AI (LLMs) format strict hote hain. Unhe batana padta hai ki kaunsi line user ki hai (HumanMessage) aur kaunsi AI ki (AIMessage).
  history.forEach((msg) => {
    // Agar message user ka hai to HumanMessage use karenge
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    }

    // Agar message AI ka hai to AIMessage use karenge
    if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  });

  // 💡 WHAT: User ka jo aakhri/current sawal hai, usko array ke end me push kar rahe hain.
  // ❓ WHY: LLM hamesha list me sabse aakhri message ka hi reply karta hai context ke basis par.
  messages.push(
    new HumanMessage(state.prompt)
  );

  // 💡 WHAT: Array of messages ko LLM ko bhej rahe hain aur AI ke sochne/response ka wait kar rahe hain.
  // ❓ WHY: Asynchronous network call hai to external API (OpenAI/Anthropic). Await zaruri hai warna empty response mil jayega.
  const response = await llm.invoke(messages);

  // 💡 WHAT: Agar search results me images hain to unhe nikal rahe hain. Optional chaining (?.) ka use kiya hai.
  // ❓ WHY: Agar search fail ho jaye ya images na ho, to code crash na ho (prevent TypeError: Cannot read properties of undefined).
  const images = state.searchResults?.images || [];

  // 💡 WHAT: Ek naya state object banakar return kar rahe hain jisme naya response aur images hain.
  // ❓ WHY: LangGraph ya state-machine based systems me state immutable hoti hai. Naye values update karke agle process me forward karne hote hain.
  return {
    ...state,
    response: response.content,
    images: images
  };
};