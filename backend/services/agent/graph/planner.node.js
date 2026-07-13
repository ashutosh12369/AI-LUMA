import { getModel } from "../utils/model.js";

export const plannerNode = async (state) => {
  if (!state.isAutonomous) {
    return state;
  }

  const llm = getModel("router");

  const planHistory = state.taskPlan ? state.taskPlan.join("\\n") : "None";

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

  const decision = result.content.trim().toLowerCase();

  const newPlan = state.taskPlan ? [...state.taskPlan] : [];
  newPlan.push(`[Step] Used agent, got response length: ${state.response?.length || 0}`);

  if (decision === "done") {
    return {
      ...state,
      agent: "done",
      taskPlan: newPlan
    };
  } else {
    // Overwrite the agent to the new one decided by the planner
    return {
      ...state,
      agent: decision,
      taskPlan: newPlan
    };
  }
};
