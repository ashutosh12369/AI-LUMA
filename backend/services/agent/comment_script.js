// Importing necessary modules: fs for file system operations, path for path manipulation, Groq for AI-powered code commenting, and dotenv for environment variable management.
import fs from 'fs';
// Importing path module to handle file paths and directories in a way that is compatible with different operating systems.
import path from 'path';
// Importing Groq SDK to leverage its AI capabilities for code commenting.
import Groq from 'groq-sdk';
// Importing dotenv to load environment variables from a .env file.
import dotenv from 'dotenv';

// Loading environment variables from a .env file to keep sensitive information like API keys separate from the code.
dotenv.config();

// Initializing a new instance of the Groq client with the API key stored in an environment variable for secure authentication.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Defining the directory paths for the frontend and backend codebases.
const FRONTEND_DIR = 'd:\\Downloads 1\\AI-LUMA\\AI-LUMA\\frontend\\src';
const BACKEND_DIR = 'd:\\Downloads 1\\AI-LUMA\\AI-LUMA\\backend';

// Function to recursively find all JavaScript and JSX files within a given directory and its subdirectories.
function findFiles(dir, fileList = []) {
  // Reading the contents of the current directory.
  const files = fs.readdirSync(dir);
  // Iterating over each file or subdirectory in the current directory.
  for (const file of files) {
    // Constructing the full path of the current file or subdirectory.
    const filePath = path.join(dir, file);
    // Checking if the current item is a subdirectory.
    if (fs.statSync(filePath).isDirectory()) {
      // Skipping certain directories that are not relevant for code commenting, such as node_modules, dist, build, and .git.
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        // Recursively searching for files in the subdirectory.
        findFiles(filePath, fileList);
      }
    } else {
      // Checking if the current file has a .js or .jsx extension.
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        // Adding the file path to the list of files to be processed.
        fileList.push(filePath);
      }
    }
  }
  // Returning the list of files found.
  return fileList;
}

// Function to introduce a delay in execution, useful for avoiding rate limits when interacting with external APIs.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Asynchronous function to process a single file by adding comments using the Groq AI model.
async function processFile(filePath) {
  try {
    // Reading the contents of the file to be processed.
    const code = fs.readFileSync(filePath, 'utf-8');
    
    // Skipping empty files or files that are already heavily commented, as a simple heuristic to avoid unnecessary processing.
    if (code.trim().length === 0) return;

    // Logging the start of processing for the current file.
    console.log(`Processing: ${filePath}`);

    // Crafting a prompt for the Groq AI model, including the code to be commented and the rules for commenting.
    const prompt = `You are a helpful senior developer. Your task is to add detailed, easy-to-understand Hinglish (Hindi+English) comments to the following code to explain what every logical line or block does. 
Rules:
1. ONLY return the modified code.
2. DO NOT wrap the output in markdown code blocks like \`\`\`javascript or \`\`\`. Just return the raw raw code.
3. DO NOT change a single line of the actual executable code, only add // comments above the lines.
4. Make the comments very beginner-friendly for interview preparation.

Code to comment:
${code}`;

    // Using the Groq API to generate a completion based on the provided prompt, specifying the model and temperature for the generation.
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });

    // Extracting the generated code with comments from the Groq API response.
    let newCode = chatCompletion.choices[0]?.message?.content || '';
    
    // Removing markdown code blocks from the generated code if present, to adhere to the rules specified in the prompt.
    if (newCode.startsWith('```')) {
      newCode = newCode.split('\n').slice(1, -1).join('\n');
    }

    // Overwriting the original file with the newly generated code that includes comments.
    fs.writeFileSync(filePath, newCode, 'utf-8');
    // Logging the successful processing of the file.
    console.log(`Success: ${filePath}`);
    
    // Introducing a delay to avoid hitting rate limits of the Groq API.
    await sleep(5000);
  } catch (error) {
    // Logging any errors that occur during the processing of a file.
    console.error(`Error processing ${filePath}:`, error?.message || error);
    // Introducing a longer delay if an error occurs, to back off and potentially avoid overwhelming the API with repeated requests.
    await sleep(10000); 
  }
}

// Main asynchronous function to orchestrate the automated commenting process.
async function main() {
  // Logging the start of the automated commenting script.
  console.log('Starting automated commenting script...');
  // Finding all relevant JavaScript and JSX files in the frontend directory.
  const frontendFiles = findFiles(FRONTEND_DIR);
  // Finding all relevant JavaScript and JSX files in the backend directory.
  const backendFiles = findFiles(BACKEND_DIR);
  // Combining the lists of files from the frontend and backend into a single list.
  const allFiles = [...frontendFiles, ...backendFiles];

  // Logging the total number of files found for processing.
  console.log(`Found ${allFiles.length} JS/JSX files.`);

  // Iterating over each file found, to process it individually.
  for (let i = 0; i < allFiles.length; i++) {
    // Logging the current file being processed, along with its index in the list of all files.
    console.log(`[${i + 1}/${allFiles.length}]`);
    // Processing the current file.
    await processFile(allFiles[i]);
  }
  
  // Logging the completion of the automated commenting process.
  console.log('Finished commenting all files.');
}

// Calling the main function to start the automated commenting script.
main();