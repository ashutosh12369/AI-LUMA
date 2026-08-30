import { ChatOpenRouter } from "@langchain/openrouter";
async function test() {
  try {
    const or = new ChatOpenRouter({
      model: "deepseek/deepseek-chat",
      apiKey: "invalid_key",
      maxRetries: 0
    });
    await or.invoke("hi");
  } catch(e) {
    console.log("STATUS:", e.status);
    console.log("MESSAGE:", e.message);
  }
}
test();
