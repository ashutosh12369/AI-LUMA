import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testOpenRouter() {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Say test' }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("SUCCESS:", response.data.choices[0].message.content);
  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
  }
}
testOpenRouter();
