// What: imageAgent ek asynchronous function hai jo AI ka use karke text se image generate karta hai.
// Why (Interview Prep): Is architecture mein different AI tasks ko separate agents mein divide kiya gaya hai (Single Responsibility Principle). Yeh function external image API interact karta hai.
import axios from "axios";
// What & Why: LLM model ko fetch karne ke liye helper function. Abstraction provide karta hai taaki direct model logic yahin pe pollute na kare.
import { getModel } from "../utils/model.js";
// What & Why: AWS S3 storage utility. Generated image ko apni internal storage (cloud) mein save karna zaroori hai taaki image persist kare aur hum public URLs manage kar sakein.
import { uploadToS3 } from "../utils/uploadToS3.js";
// What & Why: Presigned URL generator. User ko image dikhane ke liye ek temporary/secure link chahiye jo S3 provide karta hai.
import { getDownloadUrl } from "../utils/getDownloadUrl.js";
// What & Why: Rate limiting. Har agent ke paas apni rate limiting hoti hai taaki system resources exhaust na ho.
import { checkAgentLimit } from "../config/agentRateLimit.js";
// What & Why: Payment/Credit tracking system. AI calls expensive hote hain toh virtual currency system manage kiya gaya hai.
import { deductCredits } from "../utils/deductCredits.js";

// What: Main worker function for image generation.
export const imageAgent = async (state) => {
  try {
    // What: Check if the user has exceeded their image generation limits.
    // Why: To prevent abuse (e.g., bot attacks, scraping). Agar limit exceed hogi, toh error throw hoga aur aage ka expensive code execute nahi hoga.
    await checkAgentLimit(
      state.userId,
      "image"
    );
    // What: Deduct AI credits for this operation.
    // Why: Business logic enforcement. Pehle limit check, fir credit deduct. Yeh ek atomic-like operation approach hai.
    await deductCredits(
      state.userId,
      "image"
    );

    // What: LLM instance specifically initialized for "image" context fetch kar rahe hain.
    const llm =
      getModel("image");

    // What: User ka simple prompt LLM (text model) ko bhej rahe hain taaki usko ek high-quality image generation prompt mein enhance/convert kiya ja sake.
    // Why: Users aam-taur par "a cat" likhte hain, but image generators (Midjourney/DALL-E type) ko better results ke liye detailed keywords ("cinematic, 8k, highly detailed") chahiye hote hain. LLM as a "Prompt Engineer" act kar raha hai.
    const promptResponse =
      await llm.invoke(`
You are an elite AI image prompt engineer.
Convert the user request into a highly detailed image generation prompt.
Requirements:
- Cinematic lighting
- Professional composition
- Ultra realistic
- High detail
- Beautiful color palette
- Sharp focus
- 8K quality
- Photorealistic
- Depth of field
- Professional photography
- Stunning visuals

Return only the image prompt.
User Request:
${state.prompt}
`);

    // What: LLM ke response ko sanitize (trim) kar rahe hain.
    // Why: Ekdam clean string hi image generation API ko pass karni hoti hai, white spaces API endpoints ko confuse kar sakte hain.
    const enhancedPrompt =
      promptResponse.content.trim();

    // What: Pollinations.ai (ya kisi aur provider) ki API ka URL form kar rahe hain.
    // Why (Interview Prep): URL mein user input direct bhej rahe hain. encodeURIComponent use karna bohot zaroori hai taaki spaces/special characters valid URL format mein convert ho jayein (URL Encoding) - varna HTTP request fail ho jayegi.
    const imageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        enhancedPrompt
      )}`;

    // What: Axios se ek GET request bhej rahe hain us image API pe.
    // Why (Interview Prep): Hum responseType: "arraybuffer" use kar rahe hain kyunki default response format JSON ya text hota hai. Image ek binary data hai, toh "arraybuffer" zaroori hai use properly download karne ke liye memory mein.
    const imageResponse =
      await axios.get(
        imageUrl,
        {
          responseType:
            "arraybuffer"
        }
      );

    // What: ArrayBuffer (Network Data) ko Node.js ke Buffer object mein convert kar rahe hain.
    // Why: Node.js mein file handling aur S3 upload functions naturally "Buffer" format expect karte hain.
    const imageBuffer =
      Buffer.from(
        imageResponse.data
      );

    // What: Ek unique filename generate kar rahe hain based on current UNIX timestamp.
    // Why: Filename collisions (overwriting) prevent karne ke liye. Date.now() millisecond accuracy deta hai.
    const fileName =
      `image-${Date.now()}.png`;

    // What: Us binary buffer (image) ko cloud bucket (S3) mein upload kar rahe hain with "image/png" MIME type.
    // Why: MIME type (Content-Type) explicitly batana zaroori hai warna browsers link kholne par usko render karne ki jagah raw download treat kar lenge.
    await uploadToS3(
      imageBuffer,
      fileName,
      "image/png"
    );

    // What: S3 object ka ek time-bound secure download URL generate kar rahe hain (expires in 24 hours).
    // Why: Security. Objects private hote hain by default (security best practice), hum signed URLs issue karte hain taaki access controlled aur temporary rahe.
    const downloadUrl =
      await getDownloadUrl(
        fileName,
        24*60*60
      );

    // What: State ko spread (...) karke nayi properties (\`response\`) append kar rahe hain.
    // Why: Immutable State updates ka pattern follow ho raha hai. Markdown (markdown text/links) UI rendering ke liye bheja ja raha hai.
    return {
      ...state,
      response: `
# Image Generated Successfully
![Generated Image](${downloadUrl})

[Download Image](${downloadUrl})
Link expires in 10 minutes.
`
    };

  } catch (error) {
    // What: Graceful error handling for the entire image pipeline (from LLM to network API to S3).
    // Why: System stability. Agar axios get fail hota hai (API down) ya S3 upload, server crash nahi hona chahiye. User ko fallback error response dikhega.
    console.log(
      "Image Agent Error:",
      error
    );

    return {
      ...state,
      response:
        `Failed to generate image.
Error: ${error.message}`
    };

  }

};