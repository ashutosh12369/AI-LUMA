// Node.js ka 'fs' (file system) module promises ke saath import kar rahe hain. 
// Why: Taaki hum file operations (jaise file read karna ya delete karna) ko asynchronously bina thread block kiye perform kar sakein.
import fs from "fs/promises";

// LangChain library se 'HumanMessage' aur 'SystemMessage' classes import kar rahe hain.
// What: Yeh classes AI model ko instructions (SystemMessage) aur user inputs (HumanMessage) structured format mein bhejne ke liye use hoti hain.
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Custom helper function 'getModel' ko import kar rahe hain.
// Why: Ye function specific type ka AI model fetch karne ka kaam karta hai, is case mein hume 'vision' model chahiye.
import { getModel } from "../utils/model.js";

// Rate limiting logic import kar rahe hain taaki API abuse ko roka ja sake.
// What: Yeh check karega ki user ne 'image' agent (vision AI) ka apna usage limit cross toh nahi kiya hai na.
import { checkAgentLimit } from "../config/agentRateLimit.js";

// Credit deduction logic import kar rahe hain.
// Why: Har successful API call / agent usage par user ke account se credits deduct karne ke liye (billing / monetization logic).
import { deductCredits } from "../utils/deductCredits.js";

// 'visionAgent' ek async function hai jo workflow graph ka ek autonomous state node represent karta hai.
// Input: 'state' object jismein current user ki id, file details, text prompt wagaira hoti hain.
export const visionAgent = async (state) => {

  try {
    // Step 1: Sabse pehle user ki rate limit check karte hain. 
    // Why: Agar user ki limit exceed ho gayi hai toh error throw hoga aur aage ka expensive LLM network call bach jayega.
    await checkAgentLimit(
      state.userId,
      "image"
    );

    // Step 2: User ke account se image processing task ke hisaab se balance/credits deduct karte hain.
    await deductCredits(
      state.userId,
      "image"
    );

    // Step 3: LLM (Large Language Model) ka instance banate hain.
    // Yahan hum explicitly 'vision' model (e.g. GPT-4-Vision) maang rahe hain jo images ko read aur process kar sakta hai.
    const llm =
      getModel("vision");

    // Step 4: Upload ki gayi image file ko disk se buffer ke form mein read kar rahe hain.
    const imageBuffer =
      await fs.readFile(
        state.file.path
      );

    // Step 5: File buffer ko Base64 string format mein convert kar rahe hain.
    // Why: API-based Vision AI models directly file paths accept nahi karte, unhe over the network bhejne ke liye image ko base64 encoded text strings mein convert karna padta hai.
    const base64Image =
      imageBuffer.toString("base64");

    // Step 6: 'messages' naam ka ek array banate hain jismein LLM ke liye context (persona) aur actual prompt hoga.
    const messages = [
      // SystemMessage: Model ka persona, restrictions aur guidelines define karta hai (system prompt).
      // Why: Taaki model strictly ek image analyzer ki tarah behave kare aur unwanted ya fake answers (hallucinations) generate na kare.
      new SystemMessage(`

You are AI-LUMA Vision Agent.

Rules:

- Analyze only the uploaded image.
- Answer the user's question accurately.
- If text exists in the image, extract it.
- If charts or tables exist, explain them.
- If something is unclear, say so.
- Use Markdown when helpful.
- Do not hallucinate.

`),

      // HumanMessage: Yeh end-user ka actual input hai. Isme query text aur processed base64 image dono attach kar ke bhej rahe hain.
      new HumanMessage({
        content: [
          {
            // User ka likha hua text prompt, agar wo empty hai toh fallback default text "Describe this image." bhejenge.
            type: "text",
            text:
              state.prompt ||
              "Describe this image."
          },
          {
            // Base64 image string ko properly format karke (data URI format) pass kar rahe hain. Mimetype dynamically 'state.file' se uthaya hai.
            type: "image_url",
            image_url: {
              url: `data:${state.file.mimetype};base64,${base64Image}`
            }
          }
        ]
      })
    ];

    // Step 7: Model ko practically invoke/call kar rahe hain messages array input dekar.
    const response =
      await llm.invoke(
        messages
      );

    // Step 8: Updated state ko return kar rahe hain workflow cycle aage badhane ke liye.
    // What: Spread operator (...) use karke pura purana state clone kiya aur usme output 'response' field set kar diya.
    return {
      ...state,
      response:
        response.content
    };

  }
  finally {
    // Finally block hamesha chalega, chahe task fail(catch) ho ya successfully pass ho jaye.
    // Why: Server ki disk memory bachaane (cleanup) ke liye. Temporary processed files delete karna zaroori hai warna disk storage jaldi full ho jayegi.
    if (state.file) {
      try {
        // Asynchronously file ko physical file system se delete kar rahe hain.
        await fs.unlink(
          state.file.path
        );
        // Deletion success ho gaya, iska log monitor karne ke liye print kar diya.
        console.log(
          "Deleted:",
          state.file.path
        );
      }
      catch (err) {
        // Agar file already deleted hai ya system permission issues aaye, toh crash karne ke bajaye error gracefully handle karke log kar lo.
        console.log(
          err.message
        );
      }
    }
  }
};