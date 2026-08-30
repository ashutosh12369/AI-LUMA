// Helper function 'getModel' ko import kar rahe hain AI model ko fetch karne ke liye.
import { getModel } from "../utils/model.js";

// 'routerNode' function graph workflow mein ek traffic controller ya dispatcher (router) ka kaam karta hai.
// What: Iska main duty ye check karna aur pata lagana hai ki state/request ke according konsa specialized AI agent (jaise vision, chat, coding) sabse best fit hai.
export const routerNode = 
async(state)=>{

    // Step 1: Sabse pehle user selected predefined agent (Fast Path) ki condition check kar rahe hain.
    // Why: Agar user ne UI se directly koi agent choose kiya hai (aur 'auto' nahi chhodha), toh time aur AI cost (tokens) waste kiye bina directly us agent ko task forward kar do.
    if ( 
        state.agent && 
        state.agent !== "auto"
    ) {
        return {
            ...state,
            agent: state.agent
        };
    }

    // Step 2: File-based routing rules for Images
    // Why: Agar user ne file upload ki hai toh mostly LLM model pe logic chalane ki zaroorat nahi hai. Hum seedha file type dekh kar intent samajh sakte hain aur time/cost bacha sakte hain.
    if(state.file){
        // Agar file mimetype "image/" se shuru hota hai (e.g., image/jpeg, image/png).
        if( 
            state.file.mimetype.startsWith("image/")
        ){
            // Toh request sidhe "vision" agent (jo image process karta hai) ko bhej di jayegi.
            return{
                ...state,
                agent:"vision"
            };
        }
    }

    // Step 3: File-based routing rules for Documents and Spreadsheets
    if(state.file){
        // Agar uploaded file exactly PDF hai.
        if(state.file.mimetype==="application/pdf"){
            // RAG (Retrieval Augmented Generation) context build karne ke liye use "pdf_rag" agent pe forward karenge.
            return{
                ...state,
                agent:"pdf_rag"
            };
        }

        // Agar uploaded file ek data file hai jaise CSV ya Excel.
        // What: Hum check fail safes ensure kar rahe hain using both 'mimetype' or file extension matching (".csv", ".xlsx") taaki proper file detection confirm ho.
        if(state.file.mimetype==="text/csv" || state.file.originalname.endsWith(".csv") || state.file.originalname.endsWith(".xlsx")){
            // Data related prompt solving ke liye use "data" agent pe bhej denge (kyunki wo tabular data analyze karne mein skilled hai).
            return{
                ...state,
                agent:"data"
            };
        }
    }

    // Step 4: Semantic Routing based on LLM Prompt Logic (Fallback Mode)
    // Agar upar wale checks fail ho jate hain (meaning na manual agent selected tha aur na hi explicit file based mapping mili) toh fallback LLM router decide karega.
    const llm = 
    getModel("router");

    // Yahan hum LLM ko ek structured meta-prompt pass karte hain, jismein agents ki saari capabilities mention hai.
    // Why: Model user ka query intent read karega ("Search the news", "Write code", "Fix a bug") aur upar likhi dictionary mapping ke hisaab se sabse suitable agent ka word tag return karega.
    const result = 
    await llm.invoke(`

You are an agent router.

Available agents:
- chat
- search
- coding
- pdf
- ppt
- image 
- data
- github

Rules:
chat:
General conversation,
explanations,
learning,
questions.

search:
Current events,
latest information,
news,
recent developments,
internet lookup.

coding:
Generate code,
debug code,
build projects,
architecture,
API design.

pdf:
Questions about generate PDFs
or document context.

ppt:
Questions about generate ppts
or ppt context.

data:
Process CSV or Excel data,
generate charts,
data visualization.

github:
Read GitHub repositories,
find bugs in repo,
commit code to GitHub,
list repos.

Return ONLY one word:
chat
search
coding
pdf
data
github

User Query:
${state.prompt}

 `);

 // Step 5: AI Model ke string output ko normalize kar rahe hain.
 // Why: Strings mein additional newline ya spaces asakti hain. Unhe trim karke small case(toLowerCase) banana zaroori hai. Is se aage ka workflow unrecognised string error se bach jayega.
 return {
  ...state,
  agent:
  result.content
   .trim()
   .toLowerCase()
 };
};