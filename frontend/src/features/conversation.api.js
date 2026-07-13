import api from "../utils/axios";


export const getConversations =async()=>{

 const response =await api.get( "/api/chat/get-conversations"
 );

 return response.data;

};
export const updateConversations =async(conversationId,title)=>{

 const response =await api.post( "/api/chat/update-conversation",{
    conversationId,title
 }
 );

 return response.data;

};

export const createConversation =async()=>{

 const response =await api.post("/api/chat/create-conversation",{});

 return response.data;

};
export const deleteConversation =async(conversationId)=>{

 const response =await api.delete(`/api/chat/delete-conversation/${conversationId}`);

 return response.data;

};
export const deleteAllConversations =async()=>{

 const response =await api.delete("/api/chat/delete-all-conversations");

 return response.data;

};
export const togglePinConversation =async(conversationId)=>{

 const response =await api.post("/api/chat/toggle-pin",{ conversationId });

 return response.data;

};

export const shareArtifact = async (artifact) => {
  const response = await api.post("/api/chat/share-artifact", artifact);
  return response.data;
};

export const moveToFolder = async (conversationId, folder) => {
  const response = await api.post("/api/chat/move-to-folder", { conversationId, folder });
  return response.data;
};