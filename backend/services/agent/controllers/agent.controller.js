import redis from "../../../shared/redis/redis.js";
// Memory / Chat History ko fast access karne ke liye hum Redis import karte hain (instead of slow DB queries).
import { graph } from "../graph/supervisor.graph.js";
// Ye hamara LangGraph ka compiled "AI Brain" hai jisme saare agents connected hain.
import { addMessage } from "../utils/memory.js";
// User aur AI ki baaton ko memory mein save karne ke liye helper function.
import axios from "axios";
// Doosri microservices (jaise Chat Service) se baat karne ke liye Axios HTTP client.

export const chat = async(req, res, next) => {
// Ye main controller function hai jahan frontend se user ka message (prompt) aata hai.
  try {
    // Req body se zaruri cheezein extract kar rahe hain (Destructuring).
    const {
      prompt,          // User ne kya likha hai
      conversationId,  // Ye chat kis room/thread ki hai
      agent,           // User ne konsa specific agent select kiya hai (e.g., pdf, coding)
      isAutonomous     // Kya user ne Auto-Pilot mode ON kiya hai?
    } = req.body;

    console.log(req.body);
    console.log(req.file); // Agar user ne koi file upload ki hai (e.g. Image, PDF)

    // Sabse pehle, user ke message ko local memory (Redis) mein save karlo taaki context na tute.
    await addMessage(
      conversationId,
      "user",
      prompt
    );

    // Sath hi sath, is user message ko permanent storage ke liye "Chat Microservice" ko bhej do (Inter-service communication).
    await axios.post(`https://ailuma-chat-service.onrender.com/save-message`,{
      conversationId,
      role: "user",
      content: prompt
    });

    // Yahan hum LangGraph engine ko start kar rahe hain `graph.invoke()` se.
    // Ye function AI ko prompt dega, AI sochega, aur finally ek result dega.
    const result = await graph.invoke({
      prompt,
      conversationId,
      userId: req.headers["x-user-id"], // Gateway ne jo user ID header mein daali thi
      agent,
      file: req.file,
      githubToken: req.headers["x-github-token"],
      isAutonomous: isAutonomous === "true" // Auto-pilot flag pass kar rahe hain
    }, { recursionLimit: 150 }); 
    // recursionLimit 150 isliye rakha hai taaki Auto-Pilot mode mein AI multiple steps (loop) le sake bina crash hue (Fixing 25 limit bug).

    console.log("after res", result);

    let finalResponse = result.response;
    
    // Agar Auto-Pilot ON tha aur AI ne koi "Task Plan" generate kiya hai, toh us plan ko final answer ke upar attach kar do.
    if (isAutonomous && result.taskPlan) {
      finalResponse = `**Autonomous Mode Steps Taken:**\n${result.taskPlan.join("\n")}\n\n---\n\n${result.response}`;
    }

    // AI ka jo final answer aaya, use bhi Redis memory mein save kar lo.
    await addMessage(
      conversationId,
      "assistant",
      finalResponse
    );

    // AI ka final answer, generated images, aur artifacts ko permanent save karne ke liye wapas Chat Microservice ko call kar rahe hain.
    await axios.post(
      `https://ailuma-chat-service.onrender.com/save-message`,
      {
        conversationId,
        role: "assistant",
        content: finalResponse,
        images: result.images,
        artifacts: result.artifacts || []
      }
    );

    // Frontend (React) ko response bhej do.
    return res.json({
      success: true,
      answer: finalResponse,
      images: result.images,
      artifacts: result.artifacts || []
    });

  } catch(error) {
    // Agar kuch crash ho jaye, toh error ko error handling middleware (Gateway/Next) ke paas bhej do.
    next(error);
  }
};