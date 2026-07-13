import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios"

export const chat =
async(req,res,next)=>{

 try{

  const {

   prompt,

   conversationId,

   agent,

   isAutonomous

} = req.body;

console.log(req.body)
console.log(req.file)

await addMessage(
 conversationId,
 "user",
 prompt
);

await axios.post(`https://ailuma-chat-service.onrender.com/save-message`,{
  conversationId,
  role:"user",
  content:prompt
})







  const result =
  await graph.invoke({

   prompt,

   conversationId,

   userId:
   req.headers[
    "x-user-id"
   ],
   agent,
   file:req.file,
   githubToken: req.headers["x-github-token"],
   isAutonomous: isAutonomous === "true"

  });


  console.log("after res",result)

  let finalResponse = result.response;
  if (isAutonomous && result.taskPlan) {
    finalResponse = `**Autonomous Mode Steps Taken:**\n${result.taskPlan.join("\n")}\n\n---\n\n${result.response}`;
  }

  await addMessage(
 conversationId,
 "assistant",
 finalResponse
);
await axios.post(
 `${"https://ailuma-chat-service.onrender.com"}/save-message`,
 {
  conversationId,
  role:"assistant",
  content:finalResponse,
  images:result.images,
  artifacts:
  result.artifacts || []
 }
)

  return res.json({

 success:true,

 answer:
 finalResponse,
 images:result.images,
 artifacts:
 result.artifacts || []

});

 }catch(error){

  next(error)

 }

}