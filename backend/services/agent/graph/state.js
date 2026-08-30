import { Annotation } from "@langchain/langgraph"; // Langgraph se Annotation import kar rahe hain, ye state ko define karne me madad karta hai (What)

// AgentState object export kar rahe hain jo pure agent system ka state store karega.
// Interview prep: Langgraph me agents stateful hote hain, har step ke baad state update hoti hai (Why)
export const AgentState =
Annotation.Root({

 // prompt: User se milne wala input prompt store karne ke liye (What)
 prompt:
 Annotation(),

 // conversationId: Har session/conversation ka unique id track karne ke liye, taki context maintain rahe (Why)
 conversationId:
 Annotation(),

 // userId: Kis user ne request ki hai, authentication/authorization ya personal data ke liye (Why)
 userId:
 Annotation(),

 // agent: Current active agent ya sub-agent ka data store karne ke liye (What)
 agent:
 Annotation(),

 // response: Agent ka final generated response yaha aayega (What)
 response:
 Annotation(),

 // images: Agar process me koi images involve/generate hui hain, unhe track karne ke liye (What)
 images:
  Annotation(),

 // model: Kaunsa AI model use karna hai (e.g., GPT-4, Claude), isko configure karne ke liye (Why)
 model:
 Annotation(),

 // file: Uploaded files ko track karne ke liye, jo user as input provide karta hai (What)
  file:
 Annotation(),

 // artifacts: Agent dwara create kiye gaye structured documents/files ko hold karne ke liye (Why)
 artifacts:
 Annotation(),

 // searchResults: Web search ke results ko temporary memory me rakhne ke liye taki model padh sake (Why)
 searchResults:
 Annotation(),

 // codeContext: Codebase ka context ya snippets jise agent code tasks ke liye refer karega (Why)
 codeContext:
 Annotation(),

 // pdfContext: PDF document se extract kiya hua text ya data yaha store hoga (What)
 pdfContext:
 Annotation(),

 // githubToken: Github API calls karne ke liye auth token, taki repos access kar sake (Why)
 githubToken:
 Annotation(),

 // isAutonomous: Ye flag decide karta hai ki agent loop me chalega (autonomous) ya ek baar response dega (Why)
 isAutonomous:
 Annotation(),

 // taskPlan: Agent ka step-by-step plan store karne ke liye, taki wo apni progress track kar sake (Why)
 taskPlan:
 Annotation()

});