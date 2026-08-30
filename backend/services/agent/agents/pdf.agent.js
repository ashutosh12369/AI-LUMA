import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import PDFDocument from "pdfkit";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getDownloadUrl } from "../utils/getDownloadUrl.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
// What: pdfAgent ek module/function hai jo user prompts ko le kar structured PDF files dynamically generate karta hai.
// Why (Interview Prep): Ye agent architectural pattern mein ek specialized node hai (Separation of Concerns). Yeh text-to-pdf pipeline implement karta hai by piping LLM output to a PDF generation library.
export const pdfAgent = async (state) => {

  try {
    // What: User quota check karna for "pdf" service.
    // Why: PDF generation is resource-intensive (CPU bound tasks plus LLM cost). Rate limit protect karta hai ki user system abuse na kare.
    await checkAgentLimit(
      state.userId,
      "pdf"
    );

    // What: User ke profile se platform credits deduct ho rahe hain.
    // Why: Business logic execute karna for billing/usage tracking. Pehle limit check, fir charge.
    await deductCredits(
      state.userId,
      "pdf"
    );  

    // What: PDF context ke liye specific Large Language Model (LLM) ka instance get kar rahe hain.
    const llm =
      getModel("pdf");

    // What: LLM ko strictly structure bata rahe hain (Rules) ki kya content banaye for PDF.
    // Why (Interview Prep): "No markdown, No code blocks" jaise rules isliye dale gaye hain kyunki typical PDF libraries (jaise PDFKit) standard Markdown natively parse nahi kar paati without external dependencies. So raw text is easier to layout on PDF coordinates.
    const aiResponse =
      await llm.invoke(`

Create a professional document about:

${state.prompt}

Rules:

- Generate a professional title.
- Generate introduction.
- Generate multiple sections.
- Generate bullet points where required.
- Generate conclusion.
- No markdown.
- No code blocks.
- No ** symbols.
- No ### headings.
- Return plain text only.

`);

    // What: LLM response extract karna ya fallback mein seedha user prompt use karna.
    // Why: Defensive Programming. Agar LLM service down hai (aiResponse undef/null), toh fallback value (state.prompt) use hoti hai taaki pipeline completely fail na ho (Optional Chaining \`?.\` operator use kiya hai).
    const rawContent =
      aiResponse?.content?.trim() ||
      state.prompt;

    // What: Raw string data ko newlines (\\n) pe split karke unhe array of strings (lines) bana rahe hain, aur empty lines nikal rahe hain.
    // Why: Hamein dynamically first line/title nikalna hai. Filter method empty/whitespace lines ko ignore karne ke liye hai (Data Sanitization).
    const lines =
      rawContent
        .split("\n")
        .filter(line => line.trim());

    // What: Pehli line ko as "Title" treat karna agar wo lamba na ho (< 120 chars).
    // Why: Heuristics based logic. Normally documents ki pehli line title hoti hai. Agar line bohot lambi hai toh wo paragraph hoga, tab fallback string set kar do.
    const generatedTitle =
      lines?.[0]?.length < 120
        ? lines[0]
        : state.prompt;

    // What: LLM instructions shayad break karke markdown leak kar de, usko regex se double-check/clean kar rahe hain.
    // Why: Reliability. Generative models kabhi kabhi system instructions (prompt rules) ignore karte hain, isliye post-processing (regex replace) lagana production-grade systems mein ek standard practice hai.
    const cleanContent =
      rawContent
        .replace(/\*\*/g, "")
        .replace(/```/g, "")
        .replace(/###/g, "")
        .replace(/##/g, "")
        .replace(/#/g, "")
        .trim();

    // What: PDF file ka ek unique reference name bana rahe hain timestamp lagakar.
    // Why: Same bucket pe name collisions ko easily avoid karne ki technique.
    const fileName =
      `pdf-${Date.now()}.pdf`;

    // What: PDFDocument instance (PDFKit library object) initialize kar rahe hain metadata ke sath.
    // Why: Metadata (Title, Author, Subject) PDF ki file properties mein dikhta hai, yeh professional lagta hai aur accessibility/SEO type document parsers ke liye important hota hai. bufferPages memory buffer lagata hai better handling ke liye.
    const doc =
      new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
        info: {
          Title: generatedTitle,
          Author: "AI-LUMA",
          Subject: state.prompt,
          Creator: "AI-LUMA PDF Agent"
        }
      });

    // What: Ek empty array initialize kar rahe hain jo PDF stream chunks hold karega.
    const chunks = [];

    // What & Why (Interview Prep): Node.js Streams ka practical use. \`doc\` ek readable stream emit karta hai jab bhi naya data write hota hai. Hum "data" event pe listen karke byte chunks ko memory array mein collect kar rahe hain, kyuki cloud upload usually final buffered data maangta hai (unless piped directly).
    doc.on("data", chunk => {
      chunks.push(chunk);
    });

    // What: PDF renderer se text format set karwa ke title draw kar rahe hain document pe.
    // Why: Method chaining (\`.fontSize().fillColor().text()\`) object-oriented design mein readability badhata hai (Builder pattern jaisa look).
    doc
      .fontSize(26)
      .fillColor("#111827")
      .text(
        generatedTitle,
        {
          align: "center"
        }
      );

    // What: Vertical space/cursor position next line/paragraph me le jana.
    doc.moveDown();

    // What: Document generate hone ki current system time stamp lagana ek sub-heading/metadata ki tarah cover/top page par.
    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .text(
        `Generated on ${new Date().toLocaleString()}`,
        {
          align: "center"
        }
      );

    // What: Thoda extra vertical visual margin/spacing create karna (3 lines) pehle content se pehle.
    doc.moveDown(3);

    // What: Jo cleaned/sanitized text AI se nikla tha, usko PDF canvas/page par print karna.
    // Why: \`lineGap\` property inter-line spacing (leading) adjust karti hai jisse dense AI text padhne me asaan lagta hai (Typography basics).
    doc
      .fontSize(12)
      .fillColor("#374151")
      .text(
        cleanContent,
        {
          align: "left",
          lineGap: 6
        }
      );

    // What: Document content aur footer ke beech visual gap.
    doc.moveDown(2);

    // What: Footer add kar rahe hain "Generated by..."
    // Why: Branding watermarking ki tarah kaam karta hai in programmatic documents.
    doc
      .fontSize(10)
      .fillColor("#9CA3AF")
      .text(
        "Generated by AI-LUMA",
        {
          align: "center"
        }
      );

    // What: PDF generator ki data stream ko finish aur close kar dena.
    // Why: Streams require explicit closing so the system knows no more data will be written.
    doc.end();

    // What & Why (Interview Prep): Wrapping event emitters in Promises. PDFKit is event-based (stream), not Promise-based by default. Node.js mein modern async/await control flow manage karne ke liye Stream completion ("end" or "error" events) ko ek Promise me wrap kiya hai taaki control block tab tak aage na badhe jab tak stream end na ho. Yeh bohot common aur important interview concept hai.
    await new Promise(
      (resolve, reject) => {

        // Resolve the promise when PDF stream successfully finishes.
        doc.on(
          "end",
          resolve
        );

        // Reject the promise if an error occurs during PDF generation.
        doc.on(
          "error",
          reject
        );

      }
    );

    // What: Array of Buffer chunks (pieces of file) ko combine (concatenate) karke ek final single memory Buffer object banana.
    // Why: File upload ya binary transmission usually single buffer ya complete stream demand karta hai.
    const pdfBuffer =
      Buffer.concat(chunks);

    // What: Ek cloud blob storage (AWS S3) pe is consolidated buffer file ko upload karna with MIME "application/pdf".
    await uploadToS3(
      pdfBuffer,
      fileName,
      "application/pdf"
    );

    // What: Cloud storage se ek temporary secure presigned URL le aana jisko public user access kar sake.
    const downloadUrl =
      await getDownloadUrl(
        fileName,
        24*60*60
      );

    // What: Markdown formatted message generate karna with the generated URL.
    // Why: Frontend markdown parse karke natively button/link render kar sake isliye UI layer abstraction maintain ki gayi hai.
    return {

      ...state,

      response: `
# PDF Generated Successfully

${generatedTitle}

[Download PDF](${downloadUrl})

Link expires in 10 minutes.
`.trim()

    };

  } catch (error) {

    // What: Catch block for capturing and logging any synchronous or asynchronous failure in the whole pipeline.
    // Why: Unhandled rejections crash the Node app. Proper error handling avoids crashes and aids in observability/monitoring tools.
    console.log(
      "PDF Agent Error:",
      error
    );

    // What: Fallback object response return kiya ja raha hai for user feedback.
    return {

      ...state,

      response:
        "Failed to generate PDF."

    };

  }

};
