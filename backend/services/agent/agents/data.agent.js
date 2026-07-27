import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";

export const dataAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "coding"); // Use coding limit since it generates code
    await deductCredits(state.userId, "coding");

    const llm = getModel("coding");

    let csvData = "";
    if (state.file && state.file.path) {
      const fs = await import("fs");
      csvData = fs.readFileSync(state.file.path, "utf-8");
    }

    if (!csvData) {
      return {
        ...state,
        response: "❌ Please upload a valid CSV file for data visualization."
      };
    }

    // Limit CSV size to avoid token overflow
    const lines = csvData.split("\n");
    if (lines.length > 500) {
      csvData = lines.slice(0, 500).join("\n") + "\n... (truncated)";
    }

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

    let parsed;
    try {
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse JSON from data agent", e);
      return {
        ...state,
        response: "❌ Failed to generate visualization format."
      };
    }

    return {
      ...state,
      response: "✅ Here is the data visualization based on your CSV file.",
      artifacts: parsed.artifacts
    };

  } catch (error) {
    console.error("Data Agent Error:", error);
    return {
      ...state,
      response: "❌ Failed to analyze data."
    };
  }
};
