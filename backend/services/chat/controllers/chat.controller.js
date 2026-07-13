import Conversation
from "../models/conversation.model.js";
import SharedArtifact from "../models/sharedArtifact.model.js";
import crypto from "crypto";

export const createConversation =async(req,res)=>{

 try{
 const userId =req.headers["x-user-id"];
 console.log("userId",userId)
  const conversation =await Conversation.create({
   userId:userId
  });

  res.json(
   conversation
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}


export const getConversations =async(req,res)=>{

 try{
 const userId =req.headers["x-user-id"];
  const conversations =await Conversation.find({

   userId:userId

  })
  .sort({
   isPinned:-1,
   updatedAt:-1
  });

  res.json(
   conversations
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}

import Message
from "../models/message.model.js";

export const saveMessage =async(req,res)=>{

 try{

  const {
   conversationId,
   role,
   content,
   images,
  artifacts
  } = req.body;

  const message =await Message.create({

   conversationId,

   role,
  images,
   content,
   artifacts:
  artifacts || []

  });

  res.json(
   message
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}



export const getMessages =async(req,res)=>{

 try{

  const messages =await Message.find({

   conversationId:
   req.params.id

  })
  .sort({
   createdAt:1
  });

  res.json(
   messages
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}


export const updateConversation=async (req,res)=>{
try {
    const {conversationId,title}=req.body
    const conversation=await Conversation.findByIdAndUpdate( conversationId,{
        title
    })
     res.json(
   conversation
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

}
}

export const shareArtifact = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { title, type, files } = req.body;
    const shareId = crypto.randomBytes(8).toString("hex");
    const shared = await SharedArtifact.create({
      shareId,
      title,
      type,
      files,
      createdBy: userId
    });
    res.json({ shareId: shared.shareId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSharedArtifact = async (req, res) => {
  try {
    const shared = await SharedArtifact.findOne({ shareId: req.params.shareId });
    if (!shared) return res.status(404).json({ message: "Artifact not found" });
    res.json(shared);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteConversation =async(req,res)=>{

 try{
  const userId =req.headers["x-user-id"];
  const conversationId =req.params.id;
  await Conversation.findOneAndDelete({_id:conversationId,userId:userId});
  await Message.deleteMany({conversationId:conversationId});

  res.json({
   message:"Conversation deleted"
  });

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}

export const deleteAllConversations =async(req,res)=>{

 try{
  const userId =req.headers["x-user-id"];
  const conversations =await Conversation.find({userId:userId});
  const conversationIds =conversations.map(c=>c._id);
  await Message.deleteMany({conversationId:{$in:conversationIds}});
  await Conversation.deleteMany({userId:userId});

  res.json({
   message:"All conversations deleted"
  });

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}

export const togglePin =async(req,res)=>{

 try{
  const {conversationId} =req.body;
  const conversation =await Conversation.findById(conversationId);
  conversation.isPinned =!conversation.isPinned;
  await conversation.save();

  res.json(
   conversation
  );

 }catch(error){

  res.status(500).json({
   message:error.message
  });

 }

}

export const moveToFolder = async (req, res) => {
  try {
    const { conversationId, folder } = req.body;
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { folder },
      { new: true }
    );
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};