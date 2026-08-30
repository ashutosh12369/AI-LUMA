// 💡 WHAT: dataAgent function data visualization task handle karta hai. Ye ek CSV file aur prompt lekar Chart.js ki interactive file generate karta hai.
// ❓ WHY: LLMs structured data process kar sakte hain. Data viz feature platform ko powerful banata hai by dynamically writing custom scripts specific to user's dataset.
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";

// 💡 WHAT: Async function jo 'state' parameter leta hai jisme file path, user details aur prompt shamil hota hai.
// ❓ WHY: File I/O (file read/write) aur network request (LLM API call) dono operations blocking nature ke hote hain, isliye async/await use karna best practice hai.
export const dataAgent = async (state) => {
  try {
    // 💡 WHAT: Rate limiter check kar rahe hain jisse pata chale ki user limits ke andar hai ya nahi.
    // ❓ WHY: "coding" tag use kiya hai kyunki visualization bhi under-the-hood code generation hi hai. Abuse aur API costs control karna zaroori hai.
    await checkAgentLimit(state.userId, "coding"); 
    
    // 💡 WHAT: Credits deduct kar rahe hain task process karne se pehle.
    // ❓ WHY: Pre-processing charge model isliye rakhte hain taaki processing hone ke baad system fail na ho balance debit karne me (financial consistency).
    await deductCredits(state.userId, "coding");

    // 💡 WHAT: LLM engine/model ko load kar rahe hain jo code generate karega.
    // ❓ WHY: Data tasks me reasoning aur code writing ki zarurat hoti hai, isliye powerful 'coding' model select kiya hai instead of standard chat model.
    const llm = getModel("coding");

    // 💡 WHAT: csvData variable initialize kiya jisme hum CSV file ka content (string format) read karke dalenge.
    // ❓ WHY: Model ko as a raw text data dena hota hai.
    let csvData = "";
    
    // 💡 WHAT: Check kar rahe hain ki user ne file di hai, aur kya uski path valid hai.
    // ❓ WHY: Agar object (state.file) undefined hai to property access karne par server crash (TypeError) ho jayega.
    if (state.file && state.file.path) {
      // 💡 WHAT: Node.js ka native 'fs' (file system) module dynamically load kar rahe hain.
      // ❓ WHY: Dynamic import (await import) memory save karta hai jab function execute hota hai tabhi module load hota hai.
      const fs = await import("fs");
      // 💡 WHAT: File ko synchronously read kar rahe hain as UTF-8 string.
      // ❓ WHY: File ka content jab tak nahi padh lete tab tak aage badhne ka fayda nahi, isliye readFileSync (though async readFile bhi use ho sakta tha for high concurrency).
      csvData = fs.readFileSync(state.file.path, "utf-8");
    }

    // 💡 WHAT: Validation step to ensure file content actually extract hua hai ya nahi.
    // ❓ WHY: LLM without data kuch visualize nahi kar sakta, isliye early-return karke execution rok dena (Fail-fast principle).
    if (!csvData) {
      return {
        ...state,
        response: "❌ Please upload a valid CSV file for data visualization."
      };
    }

    // 💡 WHAT: CSV data ko lines (array) me tod rahe hain.
    // ❓ WHY: File bahut badi ho sakti hai (like 10,000 rows). Har LLM ka ek token/context limit hota hai, usse zyada bada payload error dega (Token Limit Exceeded).
    const lines = csvData.split("\n");
    
    // 💡 WHAT: Agar 500 se zyada rows/lines hain, to start ki 500 lines slice kar lete hain.
    // ❓ WHY: Visualization model structure (schema) samajh kar basic chart bana deta hai 500 rows se bhi. Isse tokens save hote hain cost aur speed dono optimize hoti hai.
    if (lines.length > 500) {
      csvData = lines.slice(0, 500).join("\n") + "\n... (truncated)";
    }

    // 💡 WHAT: AI model ko instruct (prompt) bhej rahe hain jisme bataya gaya hai ki JSON me answer chahiye.
    // ❓ WHY: Strict instruction "stricly as valid JSON" aur prompt structure data-to-code generation (Chart.js syntax) enforce kar raha hai frontend render ke liye.
    const aiResponse = await llm.invoke(`
You are a Data Visualization expert.
The user has provided a CSV file and a prompt.
Your task is to analyze the data and generate a beautiful, interactive chart using Chart.js in vanilla HTML/JS.

User Prompt: ${state.prompt}

CSV Data:
${csvData}

Requirements:
- You must write the response strictly as valid JSON containing an "artifacts" array with one artifact.
- The artifact must have a "title", "type": "react", and a "files" array.
- The files array must contain EXACTLY three files: "index.html", "style.css", and "script.js".
- In index.html, include the Chart.js CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- In index.html, create a <canvas id="myChart"></canvas>
- In script.js, write the logic to parse the provided CSV data (you can hardcode the parsed data into the JS array to make it self-contained) and render a beautiful Chart.js chart.
- Make it visually stunning with modern colors and responsive design.
- The root of your response MUST be the raw JSON object. Do not wrap in markdown \`\`\`json.
`);

    // 💡 WHAT: 'parsed' variable me JSON data store karenge aage parsing logic ke liye.
    // ❓ WHY: Block-scoped try/catch variable scope handle karne ke liye.
    let parsed;
    try {
      // 💡 WHAT: LLM ka raw text response extract kar rahe hain.
      // ❓ WHY: LLM hamesha text string deta hai, humein ise Javascript object me badalna (parse) hoga.
      let content = aiResponse.content;
      
      // 💡 WHAT: String ke pehle '{' aur aakhri '}' braces ko find kar rahe hain.
      // ❓ WHY: LLM sometimes mana karne ke baad bhi "Here is your JSON:" jaisi normal baatein text me likh deta hai (hallucination). Braces extract karna ek safety mechanism hai pure JSON nikalne ka.
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      
      // 💡 WHAT: Agar braces mile, to string ko sirf JSON portion me kaat (substring) lenge.
      // ❓ WHY: Garbage text hatane ke liye taaki JSON.parse() fail na ho.
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }
      
      // 💡 WHAT: Safed/Cleaned JSON string ko Object me convert kar rahe hain.
      // ❓ WHY: Frontend me render ke liye Object/Array format lazmi hai string format nahi.
      parsed = JSON.parse(content);
    } catch (e) {
      // 💡 WHAT: Agar JSON format me kuch gadbad huyi aur JSON parse fail ho gaya.
      // ❓ WHY: Error handle na karein to backend crash (Unhandled Exception) ho jayega. Gracefully error return karna better UX hai.
      console.error("Failed to parse JSON from data agent", e);
      return {
        ...state,
        response: "❌ Failed to generate visualization format. " + e.message
      };
    }

    // 💡 WHAT: Final state return kar rahe hain 'artifacts' array ke sath.
    // ❓ WHY: Ye object flow ke mutabiq frontend ko diya jayega. 'artifacts' frontend widget/renderer (IDE ya file view) trigger karega.
    return {
      ...state,
      response: "✅ Here is the data visualization based on your CSV file.",
      artifacts: parsed.artifacts
    };

  } catch (error) {
    // 💡 WHAT: Overall file I/O ya LLM invoke (network error, token limits) kisi bhi catastrophic error ko yahan pakad rahe hain.
    // ❓ WHY: Server-side code hamesha safe rehna chahiye. Try-catch root level par application ka uptime maintain karta hai.
    console.error("Data Agent Error:", error);
    return {
      ...state,
      response: "❌ Failed to analyze data."
    };
  }
};