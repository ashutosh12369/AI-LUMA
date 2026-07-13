import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { Octokit } from "@octokit/rest";

export const githubAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "coding");
    await deductCredits(state.userId, "coding");

    if (!state.githubToken) {
      return {
        ...state,
        response: "❌ Please link your GitHub account first in the login screen to use the GitHub Agent."
      };
    }

    const octokit = new Octokit({ auth: state.githubToken });
    const llm = getModel("coding");

    // Get current user to know username
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const username = user.login;

    // A simple prompt to the LLM to figure out what to do with GitHub
    const aiResponse = await llm.invoke(`
You are a GitHub expert AI.
The authenticated user is: ${username}.

User Prompt: ${state.prompt}

You can perform one of the following actions. Return STRICTLY valid JSON, nothing else.

Action 1: Reply to user
{
  "action": "reply",
  "message": "Your helpful response here"
}

Action 2: List repositories
{
  "action": "list_repos"
}

Action 3: Read file from a repository
{
  "action": "read_file",
  "repo": "repository_name",
  "path": "path/to/file.js"
}

Action 4: Create or update file (commit)
{
  "action": "commit",
  "repo": "repository_name",
  "path": "path/to/file.js",
  "content": "new file content",
  "message": "commit message"
}

Based on the user's prompt, choose the best action. Return JSON only.
`);

    let parsed;
    try {
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      return { ...state, response: "Failed to parse GitHub agent command." };
    }

    if (parsed.action === "reply") {
      return { ...state, response: parsed.message };
    }

    if (parsed.action === "list_repos") {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({ sort: "updated", per_page: 10 });
      const repoList = repos.map(r => `- ${r.name} (${r.private ? "Private" : "Public"})`).join("\\n");
      return { ...state, response: `Here are your recently updated repositories:\\n\\n${repoList}` };
    }

    if (parsed.action === "read_file") {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner: username,
          repo: parsed.repo,
          path: parsed.path,
        });
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return { ...state, response: `**Contents of ${parsed.path} in ${parsed.repo}:**\\n\\n\`\`\`\\n${content}\\n\`\`\`` };
      } catch (e) {
        return { ...state, response: `❌ Failed to read file ${parsed.path} in repo ${parsed.repo}. Make sure the file exists and the repo is correct.` };
      }
    }

    if (parsed.action === "commit") {
      try {
        // Try to get file SHA to update if it exists
        let sha;
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: username,
            repo: parsed.repo,
            path: parsed.path,
          });
          sha = data.sha;
        } catch (e) {
          // File doesn't exist, which is fine (create new)
        }

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: username,
          repo: parsed.repo,
          path: parsed.path,
          message: parsed.message || `Update ${parsed.path}`,
          content: Buffer.from(parsed.content).toString("base64"),
          sha
        });
        return { ...state, response: `✅ Successfully committed changes to \`${parsed.path}\` in repository \`${parsed.repo}\`!` };
      } catch (e) {
        return { ...state, response: `❌ Failed to commit to ${parsed.repo}. Error: ${e.message}` };
      }
    }

    return { ...state, response: "Action completed." };

  } catch (error) {
    console.error("GitHub Agent Error:", error);
    return {
      ...state,
      response: "❌ Failed to perform GitHub action. Token may be invalid or expired."
    };
  }
};
