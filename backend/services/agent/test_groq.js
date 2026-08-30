import { ChatGroq } from "@langchain/groq";
async function test() {
  try {
    const groq = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: "invalid_key",
      maxRetries: 0
    });
    await groq.invoke("hi");
  } catch(e) {
    console.log("STATUS:", e.status);
    console.log("MESSAGE:", e.message);
  }
}
test();
