import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const FRONTEND_DIR = 'd:\\Downloads 1\\AI-LUMA\\AI-LUMA\\frontend\\src';
const BACKEND_DIR = 'd:\\Downloads 1\\AI-LUMA\\AI-LUMA\\backend';
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function processFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    if (code.trim().length === 0) return;
    console.log(`Processing: ${filePath}`);
    const prompt = `You are a helpful senior developer. Your task is to add detailed, easy-to-understand Hinglish (Hindi+English) comments to the following code to explain what every logical line or block does. 
Rules:
1. ONLY return the modified code.
2. DO NOT wrap the output in markdown code blocks like \`\`\`javascript or \`\`\`. Just return the raw raw code.
3. DO NOT change a single line of the actual executable code, only add
4. Make the comments very beginner-friendly for interview preparation.

Code to comment:
${code}`;
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });
    let newCode = chatCompletion.choices[0]?.message?.content || '';
    if (newCode.startsWith('```')) {
      newCode = newCode.split('\n').slice(1, -1).join('\n');
    }
    fs.writeFileSync(filePath, newCode, 'utf-8');
    console.log(`Success: ${filePath}`);
    await sleep(5000);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error?.message || error);
    await sleep(10000); 
  }
}
async function main() {
  console.log('Starting automated commenting script...');
  const frontendFiles = findFiles(FRONTEND_DIR);
  const backendFiles = findFiles(BACKEND_DIR);
  const allFiles = [...frontendFiles, ...backendFiles];
  console.log(`Found ${allFiles.length} JS/JSX files.`);
  for (let i = 0; i < allFiles.length; i++) {
    console.log(`[${i + 1}/${allFiles.length}]`);
    await processFile(allFiles[i]);
  }
  console.log('Finished commenting all files.');
}
main();
