// Yeh 'plannerNode' function agent workflow me ek autonomous planning step ko represent karta hai.
// What: Iska main kaam ye sochna hai ki user ne jo badha goal diya hai, kya wo achieve ho gaya ya humein abhi aur intermediate steps/agents lene padenge.
export const plannerNode = async (state) => {
  // Step 1: State object mein 'isAutonomous' flag check karte hain.
  // Why: Agar user ne manually process trigger kiya hai (autonomous mode false), toh AI planning ki zarurat nahi hai aur ye node silently wapas bypass (return) ho jayega.
  if (!state.isAutonomous) {
    return state;
  }

  // Step 2: Planning ke liye 'router' model (LLM) ka instance get/load kar rahe hain.
  // Why: Planner ko logical reasoning capabilities chahiye hoti hain. Ek chhota/fast model generally best rehta hai next steps decide karne ke liye.
  const llm = getModel("router");

  // Step 3: Pura plan history (ab tak ke liye gaye saare steps) ko ek string mein compile kar rahe hain.
  // What: state.taskPlan ek array of strings hai jise join karke multi-line banaya jaa raha hai.
  // Why: Naya step sochne ke liye LLM (AI model) ko past steps ka context chahiye warna wo past ki cheezon mein stuck (infinite loop) ho sakta hai.
  const planHistory = state.taskPlan ? state.taskPlan.join("\\n") : "None";

  // Step 4: AI Planner ko prompt (instructions) invoke (call) karna.
  // Why: Hum explicitly define kar rahe hain - original goal (prompt), past actions (planHistory), aur current step output (response).
  // Model ko bola gaya hai ki strictly ya toh "DONE" likhe, ya fir kisi specific sub-agent (chat, coding, etc) ka naam de taaki execution continuous rahe.
  const result = await llm.invoke(`
You are the Autonomous Planner.
The user has provided a massive goal:
${state.prompt}

Recent steps taken:
${planHistory}

Current agent response:
${state.response}

Analyze if the OVERALL goal is fully achieved.
If the goal is achieved, reply ONLY with "DONE".
If the goal requires more steps, reply ONLY with the name of the next agent to use:
chat, search, coding, pdf, data, github.
`);

  // Step 5: Model ke decision raw output ko format / sanitize kar rahe hain.
  // Why: 'trim' faltu white-spaces (spaces, new lines) hatata hai aur 'toLowerCase' text cases standardize karta hai taaki direct string matching easily aur accurately ho sake.
  const decision = result.content.trim().toLowerCase();

  // Step 6: Purane plan array (state) ki ek naye array copy bana rahe hain. (Immutability Concept)
  // Why: Directly state variables ko push/mutate karna bad practice hai, especially Redux ya complex state engines mein. Isliye spread operator [...] use kiya hai.
  const newPlan = state.taskPlan ? [...state.taskPlan] : [];
  
  // Step 7: Naya action (step) is newPlan list mein record kar rahe hain.
  // What: Instead of saving entire big strings of response, hum system memory bachane ke liye sirf last interaction ki 'length' store kar rahe hain.
  newPlan.push(`[Step] Used agent, got response length: ${state.response?.length || 0}`);

  // Step 8: Finally, model ka decision logic evaluate karte hain.
  if (decision === "done") {
    // Agar decision "done" hai, iska matlab task successfully accomplish ho gaya hai.
    // Why: 'agent' field ko 'done' update karne se workflow orchestrator engine (graph runner) samajh jayega ki execution stop karni hai.
    return {
      ...state,
      agent: "done",
      taskPlan: newPlan
    };
  } else {
    // Agar output "done" nahi hai (matlab next agent recommend kiya hai).
    // What: Current iteration ka naya plan state update karke us specific agent ko control de denge (routing).
    return {
      ...state,
      agent: decision,
      taskPlan: newPlan
    };
  }
};