import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { getMemory } from "../utils/memory.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
// 💡 WHAT: codingAgent function user ke prompt ko process karke either code files (projects) ya markdown explanations generate karta hai.
// ❓ WHY: Async isliye banaya kyuki database limits, credit checks aur LLM inference (AI generation) I/O tasks hain jo time lete hain.
export const codingAgent = async (state) => {
  
  // 💡 WHAT: Check kar rahe hain ki user ne apni daily/monthly agent usage limit cross to nahi ki.
  // ❓ WHY: System ki stability aur cost-control ke liye. Interviewer poochega ki API abuses kaise rokte ho, uska answer yahi hai.
  await checkAgentLimit(
    state.userId,
    "coding"
  );
  
  // 💡 WHAT: User ke account balance se is transaction/request ke credits deduct/cut kar rahe hain.
  // ❓ WHY: Business logic maintain karne ke liye taaki premium features ke liye logic enforce kiya ja sake.
  await deductCredits(
    state.userId,
    "coding"
  );

  // 💡 WHAT: Helper function jo LLM dwara diye gaye code block format (like ```javascript) ko clean karta hai.
  // ❓ WHY: AI model kabhi-kabhi markdown backticks (```) bhej deta hai. Humein raw code chahiye files banane ke liye, isliye Regex se unhe hata dete hain.
  function cleanCode(code = "") {
    return code
      .replace(/```[\w-]*\n?/g, "")
      .replace(/```/g, "")
      .trim();
  }

  // 💡 WHAT: 'coding' ke liye specific LLM (Large Language Model) fetch kar rahe hain.
  // ❓ WHY: Coding tasks ke liye normally jyada powerful models (jaise Claude 3.5 Sonnet ya GPT-4) chahiye hote hain as compared to normal chat.
  const llm =
    getModel("coding");

  // 💡 WHAT: LLM ko invoke karke ek bada system prompt aur user ka message bhej rahe hain jisme strict guidelines hain.
  // ❓ WHY: Few-shot prompting aur strict constraints (jaise "Return ONLY FILE: index.html") use kiye hain taaki AI predictable format me output de jisko hum parse (extract) kar sakein.
  const response = await llm.invoke(`You are AI-LUMA Coding Agent.

Your first task is to identify the user's intent.

=========================
INTENT DETECTION
=========================

Classify the request into ONE of these:

1. CODE_GENERATION
2. CODE_REVIEW
3. CODE_EXPLANATION
4. DEBUGGING
5. OPTIMIZATION
6. CONVERSION
7. DOCUMENTATION

=========================
CODE REVIEW
=========================

If the user provides code and asks:

- review
- explain
- optimize
- debug
- find bugs
- improve
- refactor

DO NOT generate a new project.

Instead return Markdown only.

Include:

# Overview

## What this code does

## Problems

## Improvements

## Best Practices

## Optimized snippets (if required)

For explanations:

- Never wrap variable names in triple backticks.
- Use single backticks only for inline code.
- Use triple backticks ONLY for complete code blocks.


=========================
CODE GENERATION
=========================

Default stack:

HTML
CSS
JavaScript

Do NOT use any framework unless explicitly requested.

Examples:

"Build portfolio"
→ HTML CSS JS

"Create ecommerce"
→ HTML CSS JS

"Create dashboard"
→ HTML CSS JS

"React dashboard"
→ React

"Next.js blog"
→ Next.js

=========================
WEBSITE RULE
=========================

Unless the user explicitly requests multiple pages,

ALWAYS build a SINGLE PAGE website.

Use sections:

Home
About
Services
Features
Pricing
Testimonials
Contact
Footer

Navigation should smoothly scroll.

Do NOT generate:

about.html
contact.html
pricing.html

unless the user explicitly asks.

=========================
PROJECT FILES
=========================

For default websites generate only:

FILE: index.html

FILE: style.css

FILE: script.js

Generate extra files ONLY if necessary.

=========================
DESIGN
=========================

Modern UI

Glassmorphism when suitable

Responsive

CSS Variables

Grid

Flexbox

Smooth Scroll

Hover Effects

Subtle Animations

Professional spacing

Compact CSS

=========================
IMAGES
=========================

Always use real Unsplash images.

Never use placeholders.

=========================
JAVASCRIPT
=========================

Keep JS minimal.

Only interactive logic.

No unnecessary functions.

=========================
OUTPUT
=========================

If intent is CODE_GENERATION

Return ONLY:

FILE: index.html

...

FILE: style.css

...

FILE: script.js

...

No markdown.

No explanation.

If intent is REVIEW / EXPLAIN / DEBUG

Return Markdown only.

Do NOT generate project files.

=========================
TOKEN BUDGET
=========================

Maximum ~2000 output tokens.

Prefer concise but beautiful code.

Generate only what is required.

User Request:

${state.prompt}`);

  // 💡 WHAT: AI ka text output (content) extract karke aage-peeche ke empty spaces (trim) hata rahe hain.
  // ❓ WHY: Data processing ke dauran unexpected whitespaces bugs create kar sakte hain parsing logic me.
  const content =
    response.content?.trim();
  console.log(content)
  // 💡 WHAT: Files ka ek empty array banaya jisme generated files ke objects (name, content) daalenge.
  // ❓ WHY: Hume multiple files return karni hain frontend ko render karne ke liye, array is the best data structure.
  const files = [];

  // 💡 WHAT: Regular Expression (Regex) use karke AI response me se 'FILE: filename' aur uske code ko alag-alag tukdo (groups) me tod rahe hain.
  // ❓ WHY: AI natural language text deta hai. Humein use structured JSON format me chahiye, isliye pattern matching karke file ka naam aur code extract kar rahe hain.
  const matches = [
    ...content.matchAll(
      /FILE:\s*([^\n]+)\n([\s\S]*?)(?=\nFILE:\s*[^\n]+\n|$)/g
    )
  ];

  // 💡 WHAT: Agar regex match mil gaya (yani AI ne file generate ki hai), to if block chalega.
  // ❓ WHY: Agar user ne code review/debug manga hai, to files generate nahi hoti aur array khali rehta hai. Isliye check karna zaroori hai.
  if(matches.length){

    // 💡 WHAT: Har ek file block pe loop chala rahe hain.
    // ❓ WHY: Regex matches multiple honge (jaise html, css, js files), un sabko ek array of objects format me map karna hai frontend ke liye.
    matches.forEach(match => {

      files.push({
  // match[1] regex ka pehla group hai (File ka naam)
  name: match[1].trim(),
  // match[2] regex ka doosra group hai (File ka content jise clean kar rahe hain)
  content: cleanCode(match[2]),
});

    });

  }else{

    // 💡 WHAT: Agar match nahi hua, yaani file tag missing tha, to fallback/default file name logic laga rahe hain.
    // ❓ WHY: Error handling aur robustness. Agar LLM strict format bhool gaya tab bhi backend crash hone ke bajaye at least 1 file zaroor banayega.
    let fileName = "main.js";

    const prompt =
      state.prompt.toLowerCase();

    // 💡 WHAT: User prompt ke keywords match karke default file type guess kar rahe hain.
    // ❓ WHY: User ki intent samajhne ke liye taaki code editor correct syntax highlighting dikha sake.
    if(prompt.includes("html")){
      fileName = "index.html";
    }
    else if(prompt.includes("css")){
      fileName = "style.css";
    }
    else if(prompt.includes("python")){
      fileName = "main.py";
    }
    else if(prompt.includes("java")){
      fileName = "Main.java";
    }
    else if(prompt.includes("c++")){
      fileName = "main.cpp";
    }

  }


  // 💡 WHAT: Check kar rahe hain ki output text me "FILE:" keyword majood hai ya nahi.
  // ❓ WHY: Agar "FILE:" keyword nahi hai iska matlab user ne code generating ke bajaye Code Review/Debug (chat-like) pucha hai.
  if (!content.includes("FILE:")) {
  // 💡 WHAT: Agar review manga tha, to direct text/markdown wapas bhej dete hain bina artifacts banaye.
  // ❓ WHY: System ko versatile banane ke liye, ek hi agent chat bhi karega aur code environment bhi banayega as per intent.
  return {
    ...state,
    response: content,
    artifacts: []
  };
}

  // 💡 WHAT: Agar project files ban gayi hain, to state ke sath response aur artifacts return kar rahe hain.
  // ❓ WHY: Artifacts (UI component) UI engine ko bataega ki yeh normal chat nahi hai, balki Code Editor render karna hai jisme files hongi.
  return {

    ...state,

    response:
      "Code generated successfully.",

    artifacts:[
      {
        id:Date.now(),
        type:"project",
        title:state.prompt,
        files,
        createdAt:
          new Date().toISOString()
      }
    ]

  };

};
