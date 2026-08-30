import fs from "fs"; 
// [What] Node.js ka built-in 'fs' (File System) module import kar rahe hain. 
// [Why] Taaki hum locally saved PDF files ko read kar sakein (buffer format mein) aur process hone ke baad unhe delete (unlink) kar sakein.

import {PDFParse} from "pdf-parse"; 
// [What] 'pdf-parse' library se PDFParse import kar rahe hain. 
// [Why] Yeh library PDF file ke binary data (buffer) ko raw text mein convert karne mein madad karti hai, jo RAG (Retrieval-Augmented Generation) pipeline ka pehla kadam hai.

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"; 
// [What] Langchain ka RecursiveCharacterTextSplitter import kar rahe hain.
// [Why] PDF ka text bohot bada ho sakta hai aur LLM ki context limit cross kar sakta hai. Yeh tool text ko chhote chunks mein divide karta hai (overlapping ke saath) taaki context loose na ho aur vector search efficient ho.

import { createVectorStore } from "../utils/vectorStore.js"; 
// [What] Ek custom utility function import kar rahe hain jo vector store create karta hai.
// [Why] Text chunks ko embeddings (numbers) mein convert karke database mein store karne ke liye, taaki baad mein user query ke hisaab se relevant chunks ko jaldi search (similarity search) kiya ja sake.

import {
  HumanMessage,
  SystemMessage
} from "@langchain/core/messages"; 
// [What] Langchain ke message types import kar rahe hain.
// [Why] LLM ko prompt dene ke liye roles define karne padte hain: SystemMessage (AI ka behavior set karne ke liye) aur HumanMessage (user ka actual question aur context pass karne ke liye).

import { getModel } from "../utils/model.js"; 
// [What] Ek custom utility function import kar rahe hain jo LLM (Large Language Model) instance return karta hai.
// [Why] Taaki hum easily configured LLM (jaise OpenAI gpt-4 ya Gemini) ka use karke apne prompts ko process kar sakein.

import { QdrantVectorStore } from "@langchain/qdrant"; 
// [What] QdrantVectorStore class import kar rahe hain.
// [Why] Qdrant ek vector database hai. Iska use hum temporary collections ko delete karne ya manage karne ke liye karenge, taaki memory/storage free ho sake processing ke baad.

export const pdfRagAgent = async (state) => {
// [What] 'pdfRagAgent' naam ka asynchronous function export kar rahe hain jo state (context/data) accept karta hai.
// [Why] Yeh function RAG pipeline ka core engine hai. Jab bhi user PDF ke saath question puchta hai, yeh function trigger hota hai.

  try {
// [What] Try block start kar rahe hain.
// [Why] Taaki agar file reading, parsing ya LLM calling ke dauran koi error aaye, toh server crash na ho aur error handle ho sake.

    const buffer = fs.readFileSync(state.file.path); 
// [What] fs.readFileSync ka use karke uploaded PDF file ko memory mein (as a Buffer) read kar rahe hain.
// [Why] PDFParse library ko text extract karne ke liye raw binary data chahiye hota hai, jo ye buffer provide karta hai.

    const pdf = new PDFParse({
      data: buffer
    });
// [What] PDFParse ka naya instance bana rahe hain jismein read kiya hua buffer pass kar rahe hain.
// [Why] Taaki library PDF document ke internal structure ko samajh kar usme se human-readable text extract karne ke liye taiyaar ho jaye.

    const result = await pdf.getText(); 
// [What] getText() method ko await kar rahe hain jo actually text extraction perform karta hai.
// [Why] Extraction me thoda time lag sakta hai (I/O operation), isliye await use kiya hai.

    const text = result.text; 
// [What] Result object me se sirf 'text' property ko extract kar rahe hain.
// [Why] Humein baki metadata nahi chahiye, sirf raw text chahiye jisko chunks me divide kiya jayega.

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
// [What] RecursiveCharacterTextSplitter configure kar rahe hain with chunkSize 1000 aur overlap 200.
// [Why] ChunkSize 1000 limits the size taaki LLM easily process kar sake. ChunkOverlap 200 ensure karta hai ki paragraphs ke beech ka context break na ho (ek chunk ka end doosre ki shuruwat me ho).

    const docs = await splitter.createDocuments([text]); 
// [What] Pure PDF text ko list of Document objects me convert kar rahe hain using splitter.
// [Why] Vector databases raw string nahi lete, unhe Document object chahiye hota hai jisme text aur metadata dono store hote hain.

    const collectionName = `pdf-${Date.now()}`; 
// [What] Current timestamp ka use karke ek unique collection name bana rahe hain (e.g., pdf-168923...).
// [Why] Taaki har PDF upload ka ek separate vector collection bane, aur doosre users/files ka data aapas me mix na ho.

    const vectorStore = await createVectorStore(collectionName, docs); 
// [What] Vector store create kar rahe hain aur usme documents ko embed karke store kar rahe hain.
// [Why] Text chunks ko embeddings (vector representations) mein convert karke database me load karna zaroori hai tabhi similarity search kaam karega.

    const relevantDocs = await vectorStore.similaritySearch(state.prompt, 5); 
// [What] User ke question (state.prompt) ke basis par top 5 most relevant documents (chunks) fetch kar rahe hain.
// [Why] RAG ka mukhya hissa yahi hai: LLM ko pura document dene ke bajaye, sirf wo 5 chunks do jo user ke sawal se related hain, isse accuracy badhti hai aur tokens bachte hain.

    console.log(relevantDocs); 
// [What] Fetch kiye gaye relevant chunks ko terminal/console me print kar rahe hain.
// [Why] Debugging ke liye, taaki pata chale ki similarity search sahi chunks la raha hai ya nahi.

    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n"); 
// [What] Jo top 5 chunks mile, unke sirf text (pageContent) ko nikal kar double newline (\n\n) ke saath join kar rahe hain.
// [Why] LLM ko context as a single string pass karna hota hai prompt ke andar, taaki woh easily read kar sake.

    const llm = getModel("pdf-rag"); 
// [What] "pdf-rag" use-case ke liye specific LLM model instance fetch kar rahe hain.
// [Why] Different tasks ke liye humein different model configurations (temperature, context window) chahiye hoti hai, yeh helper usko manage karta hai.

    const messages = [
      new SystemMessage(`
        You are AI-LUMA PDF Assistant.
        Rules:
        - Answer ONLY from the uploaded PDF.
        - Never make up information.
        - If the answer is not present in the uploaded PDF, reply:
        "I couldn't find this information in the uploaded PDF."
        - Use Markdown formatting.
      `),
// [What] SystemMessage set kar rahe hain jo AI ko strict rules (guardrails) deta hai.
// [Why] Yeh hallucination (AI ka khud se galat information banana) rokne ke liye sabse zaroori hai. Interview me isse prompt engineering ka part kehte hain.

      new HumanMessage(`
        Context:
        ${context}
        Question:
        ${state.prompt}
      `)
// [What] HumanMessage set kar rahe hain jismein join kiya hua 'context' aur user ka 'Question' pass kar rahe hain.
// [Why] RAG (Retrieval-Augmented Generation) pattern yehi hai. Hum retrieve kiya context LLM ko de rahe hain taaki woh uske basis par user ke sawal ka jawab de sake.
    ];

    const response = await llm.invoke(messages); 
// [What] LLM ko messages pass karke invoke kar rahe hain aur response ka wait kar rahe hain.
// [Why] LLM prompt aur context ko process karega aur final answer generate karega. Yeh network call hai isliye await zaroori hai.

    return {
      ...state,
      docs,
      response: response.content
    };
// [What] Naya state object return kar rahe hain jisme purana state, process kiye gaye docs, aur LLM ka final response shamil hai.
// [Why] LangGraph ya state-management systems me state ko update karke aage badhana hota hai taaki UI ya next node is data ka use kar sake.

  } finally {
// [What] Finally block start kar rahe hain jo success ya error dono cases me chalega.
// [Why] Cleanup operations yahan hote hain taaki resources (disk space, db memory) leak na ho, chahe process fail hi kyun na ho gaya ho.

    try {
      fs.unlinkSync(state.file.path); 
// [What] Temporary locally saved PDF file ko disk se delete kar rahe hain.
// [Why] Storage space bachane ke liye. Ek baar data vector store me chala gaya toh raw file ki zaroorat nahi hai.

      await QdrantVectorStore.deleteCollection(collectionName); 
// [What] Qdrant database se us specific collection (vectors) ko delete kar rahe hain.
// [Why] Kyunki yeh stateless/one-time query lag rahi hai. Agar hum collections delete nahi karenge toh vector database jaldi hi full ho jayega. (Note: Agar persistence chahiye hoti toh isey delete nahi karte).

    } catch (err) {
      console.log(err.message); 
// [What] Agar cleanup me koi error aaye (jaise file pehle hi delete ho chuki ho), toh use log kar rahe hain.
// [Why] Taaki cleanup error ki wajah se main thread crash na ho, par humein issue ka pata chal jaye.
    }
  }
};