// What: githubAgent ek asynchronous function hai jo GitHub ke related tasks ko handle karta hai.
// Why (Interview Prep): Agents pattern mein hum logic ko decouple karte hain. Yeh agent specifically GitHub actions (commit, read, list) ke liye responsible hai. "state" object workflow ka current context (userId, prompt, etc.) carry karta hai.
export const githubAgent = async (state) => {
  try {
    // What: Rate limiting check kar rahe hain based on userId and "coding" agent type.
    // Why: Server resources ko abuse se bachane ke liye (DoS attacks prevent karna) aur fair usage policy enforce karne ke liye.
    await checkAgentLimit(state.userId, "coding");
    
    // What: User ke credits deduct ho rahe hain action perform karne se pehle.
    // Why: Monetization and quota management. Action cost tabhi deduct hota hai jab limit check pass ho jaye.
    await deductCredits(state.userId, "coding");

    // What: Validate kar rahe hain ki user ne GitHub token provide kiya hai ya nahi.
    // Why: GitHub API access karne ke liye authentication zaruri hai (OAuth token). Agar token nahi hai to graceful error message return karte hain instead of crashing.
    if (!state.githubToken) {
      return {
        ...state,
        response: "❌ Please link your GitHub account first in the login screen to use the GitHub Agent."
      };
    }

    // What: Octokit ka instance initialize kar rahe hain user ke provided token ke sath.
    // Why: Octokit ek standard, officially supported GitHub SDK hai Node.js ke liye. Yeh API calls ko bohot asaan bana deta hai (built-in retries, parsing, types).
    const octokit = new Octokit({ auth: state.githubToken });
    
    // What: "coding" capability wala Large Language Model (LLM) retrieve kar rahe hain.
    // Why: LLM user ke natural language prompt ko samajh kar actionable structured data mein convert karega (Intention Parsing).
    const llm = getModel("coding");

    // What: GitHub API call karke authenticated user ki profile fetch kar rahe hain.
    // Why: Humein username chahiye hota hai repositories read/write karne ke liye. Yeh token ki validity bhi indirectly verify kar deta hai.
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const username = user.login;

    // What: LLM ko system prompt bhej rahe hain jismein available actions defined hain.
    // Why: Prompt Engineering through Few-Shot Prompting/JSON enforcement. Hum LLM ko force kar rahe hain ki woh ek strict JSON structure return kare taaki hamara code usko easily programmatic actions mein map kar sake.
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

    // What: LLM se jo response aaya usko parse karke JavaScript object bana rahe hain.
    let parsed;
    try {
      // Why: LLMs kabhi-kabhi JSON ke aas-paas markdown formatting (\`\`\`json) de dete hain, usko regex se clean karna zaroori hai parsing errors se bachne ke liye. Yeh robust error handling ka part hai.
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      // What & Why: Agar parsing fail hoti hai (e.g. LLM ne garbage return kiya), toh state maintain karte hue error message return karte hain taaki frontend gracefully handle kar sake.
      return { ...state, response: "Failed to parse GitHub agent command." };
    }

    // What: Router logic based on the action predicted by LLM.
    // Why (Interview Prep): Yeh ek Simple Dispatcher pattern hai jahan hum specific logic execute karte hain based on the intent parsed by AI.
    if (parsed.action === "reply") {
      // What & Why: LLM ne decide kiya ki iska answer simple text hona chahiye (koi GitHub action require nahi hai). Direct message return kar rahe hain.
      return { ...state, response: parsed.message };
    }

    if (parsed.action === "list_repos") {
      // What: GitHub API call karke user ke recent 10 repositories fetch kar rahe hain.
      // Why: Pagination aur sorting zaroori hai (per_page: 10, sort: updated) taaki payload light rahe aur sirf relevant (recent) data mile.
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({ sort: "updated", per_page: 10 });
      // What: Array map use karke repo objects ko string list mein format kar rahe hain.
      const repoList = repos.map(r => `- ${r.name} (${r.private ? "Private" : "Public"})`).join("\\n");
      return { ...state, response: `Here are your recently updated repositories:\\n\\n${repoList}` };
    }

    if (parsed.action === "read_file") {
      try {
        // What: Kisi specific repository ki file content fetch kar rahe hain.
        // Why: REST APIs usually content Base64 encoded format mein dete hain (especially for binary safety), isliye usko decode karna padega.
        const { data } = await octokit.rest.repos.getContent({
          owner: username,
          repo: parsed.repo,
          path: parsed.path,
        });
        // What & Why: Buffer ka use karke Base64 encoded content ko human-readable UTF-8 string mein convert kar rahe hain.
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return { ...state, response: `**Contents of ${parsed.path} in ${parsed.repo}:**\\n\\n\`\`\`\\n${content}\\n\`\`\`` };
      } catch (e) {
        // What & Why: Try-catch block specifically API calls ke round failures ko gracefully catch karta hai (e.g. file not found - 404).
        return { ...state, response: `❌ Failed to read file ${parsed.path} in repo ${parsed.repo}. Make sure the file exists and the repo is correct.` };
      }
    }

    if (parsed.action === "commit") {
      try {
        // What: File update ya create karne se pehle uska current SHA hash fetch kar rahe hain (agar wo file pehle se exist karti hai).
        // Why (Interview Prep): GitHub API require karta hai ki jab aap existing file update karein, toh uska current SHA dein (Optimistic Concurrency Control/Locking prevent karne ke liye). Agar file nahi hai to API 404 throw karega jo catch block handle karega.
        let sha;
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: username,
            repo: parsed.repo,
            path: parsed.path,
          });
          sha = data.sha;
        } catch (e) {
          // What: File exist nahi karti, so yeh ek "Create File" scenario ban jata hai.
        }

        // What: New content commit kar rahe hain repository mein.
        // Why: Content ko Base64 encode karna zaroori hai kyunki GitHub API create/update ke liye base64 payload mangta hai. 
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
        // What & Why: Detailed error handling for commit failures (like branch protection rules, permissions issue, etc).
        return { ...state, response: `❌ Failed to commit to ${parsed.repo}. Error: ${e.message}` };
      }
    }

    // What: Fallback logic agar LLM ne koi aisi action di jo defined nahi hai.
    // Why: Defensively code karna chahiye in case model hallucinates a non-existent action.
    return { ...state, response: "Action completed." };

  } catch (error) {
    // What: Global error handling for the entire agent function.
    // Why: Unhandled Promise Rejections app crash kar sakte hain. Catch block ensures ki user ko proper error message jaye aur debugging ke liye error console mein log ho.
    console.error("GitHub Agent Error:", error);
    return {
      ...state,
      response: "❌ Failed to perform GitHub action. Token may be invalid or expired."
    };
  }
};