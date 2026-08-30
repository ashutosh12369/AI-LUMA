// Interview Prep (What & Why):
// What: Yeh detectLanguage naam ka ek function hai jo file name accept karta hai.
// Why: Code editor ya syntax highlighter components mein file extension ke hisaab se sahi language format apply karne ke liye yeh logic zaroori hai.
export const detectLanguage = (
  fileName = ""
) => {

  // Interview Prep (What & Why):
  // What: FileName ko lowercase mein convert kiya ja raha hai.
  // Why: File extension case-sensitive na ho (jaise .JS ya .js dono ko handle kar sake) isliye comparison se pehle lowercase karna best practice hai.
  const name =
    fileName.toLowerCase();

  // Interview Prep (What & Why):
  // What: String ka endsWith method use karke extension check kiya jaa raha hai.
  // Why: Yeh simple if statements O(1) time mein specific extension dhoondte hain aur corresponding language ka naam return karte hain jo syntax highlighter ko samajh aaye.
  if (name.endsWith(".html"))
    return "html";

  if (name.endsWith(".css"))
    return "css";

  if (name.endsWith(".js"))
    return "javascript";

  if (name.endsWith(".jsx"))
    return "javascript";

  if (name.endsWith(".ts"))
    return "typescript";

  if (name.endsWith(".tsx"))
    return "typescript";

  if (name.endsWith(".json"))
    return "json";

  if (name.endsWith(".py"))
    return "python";

  if (name.endsWith(".java"))
    return "java";

  if (name.endsWith(".cpp"))
    return "cpp";

  if (name.endsWith(".c"))
    return "c";

  // Interview Prep (What & Why):
  // What: Agar upar diye gaye koi bhi condition match na kare to "plaintext" return kiya jaata hai.
  // Why: Yeh ek fallback mechanism hai taaki application error na throw kare aur unknown files as plain text render ho jayein.
  return "plaintext";

};