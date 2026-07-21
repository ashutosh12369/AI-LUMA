import api from "../utils/axios";


export const sendPrompt =async(payload, config = {})=>{

 const { data } =await api.post( "/api/agent/chat",payload, config);
console.log(data)
 return data;

};