import Conversation from "../models/conversation.model.js";
import SharedArtifact from "../models/sharedArtifact.model.js";
import crypto from "crypto";

// Yeh function naya conversation create karne ke liye hai.
// Interview tip: Create operation hamesha naya resource database me dalta hai.
export const createConversation = async(req, res) => {
 try {
  // Client request ke headers se 'x-user-id' nikal rahe hain, taaki pata chale kis user ka conversation hai.
  // Why? Authentication middleware generally user ID headers ya req object me set karta hai.
  const userId = req.headers["x-user-id"];
  console.log("userId", userId);
  
  // Database me naya conversation record bana rahe hain user id ke basis par.
  // What? Conversation.create MongoDB me naya document insert karega.
  const conversation = await Conversation.create({
   userId: userId
  });

  // Response me newly created conversation object bhej rahe hain client ko.
  // Why? Frontend ko new data chahiye UI update karne ke liye.
  res.json(conversation);
 } catch(error) {
  // Agar koi error aati hai (like db connection error), toh 500 (Internal Server Error) status bhejte hain.
  res.status(500).json({
   message: error.message
  });
 }
}

// User ke saare existing conversations fetch karne ka function.
// Why? User dashboard ya sidebar me unki history dikhane ke liye.
export const getConversations = async(req, res) => {
 try {
  // User ko identify karne ke liye uski ID headers se extract kar rahe hain.
  const userId = req.headers["x-user-id"];
  
  // Database me iss user ID ke corresponding saare documents dhundh rahe hain.
  const conversations = await Conversation.find({
   userId: userId
  })
  // Results ko sort kar rahe hain. Pehle pinned (isPinned: -1 means descending, true/1 pehle aayega).
  // Fir latest updated walo ko top par dikhane ke liye updatedAt: -1 (descending) kiya.
  // Interview tip: Sorting hamesha pagination se pehle lagani chahiye optimal results ke liye.
  .sort({
   isPinned: -1,
   updatedAt: -1
  });

  // Client ko array of conversations return kar rahe hain.
  res.json(conversations);
 } catch(error) {
  // Error handling, taaki app crash na ho aur client ko proper error message mile.
  res.status(500).json({
   message: error.message
  });
 }
}

import Message from "../models/message.model.js";

// Chat conversation ke andar messages ko database me save karne ke liye.
// What? Ek specific chat window me jo bhi messages exchange honge wo yaha store honge.
export const saveMessage = async(req, res) => {
 try {
  // Request body se zaroori parameters destructure kar rahe hain.
  // role (user/ai), content (actual text), images (attachments), artifacts (any extra file/obj).
  const {
   conversationId,
   role,
   content,
   images,
   artifacts
  } = req.body;

  // DB me message create/insert kar rahe hain using mongoose create() method.
  const message = await Message.create({
   conversationId,
   role,
   images,
   content,
   // Agar artifacts pass nahi hua to empty array fallback rakha hai taaki DB constraint pass ho.
   artifacts: artifacts || []
  });

  // Successfully save hone ke baad message ko wapas bhej rahe hain.
  res.json(message);
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// Ek specific conversation ke saare messages laane wala function.
export const getMessages = async(req, res) => {
 try {
  // Message model me 'conversationId' filter lagakar search kar rahe hain.
  const messages = await Message.find({
   // Route me /:id se jo id aayegi usko req.params.id se extract kiya hai.
   conversationId: req.params.id
  })
  // createdAt ke basis par ascending order (1) me sort kiya, taaki purane messages pehle aaye (chat format).
  // Interview tip: Chat apps me message hamesha chronological order me hone chahiye.
  .sort({
   createdAt: 1
  });

  res.json(messages);
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// Existing conversation ke details (jaise uska title) update karne ka function.
export const updateConversation = async (req, res) => {
 try {
    // Client kya update karna chahta hai, wo body se le rahe hain.
    const {conversationId, title} = req.body;
    
    // findByIdAndUpdate MongoDB method hai jo document dhoond kar directly update karta hai.
    const conversation = await Conversation.findByIdAndUpdate(conversationId, {
        title
    });
    
    // Note: By default mongoose update ke baad old document return karta hai unless {new: true} pass kiya ho.
    res.json(conversation);
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// Artifacts (jaise documents, images, ya files) ko shareable link banane ke liye function.
export const shareArtifact = async (req, res) => {
  try {
    // Current user id from headers.
    const userId = req.headers["x-user-id"];
    // Frontend se title, type (kya kisam ka artifact hai), aur actual files object receive kar rahe hain.
    const { title, type, files } = req.body;
    
    // Ek random 8 bytes string generate kar rahe hain as 'shareId'.
    // Why? Use crypto so that it's unique and hard to guess for public sharing URLs.
    const shareId = crypto.randomBytes(8).toString("hex");
    
    // SharedArtifact model ke zariye DB me entry insert kar rahe hain.
    const shared = await SharedArtifact.create({
      shareId,
      title,
      type,
      files,
      createdBy: userId
    });
    
    // Client ko sirf shareId bhej rahe hain taaki wo public URL bana sake.
    res.json({ shareId: shared.shareId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Share kiye hue artifact ko fetch karne ka route, bina user auth ke (public).
export const getSharedArtifact = async (req, res) => {
  try {
    // URL params se shareId le kar DB me search kar rahe hain.
    const shared = await SharedArtifact.findOne({ shareId: req.params.shareId });
    
    // Agar nahi mila to 404 Not Found error return karenge.
    if (!shared) return res.status(404).json({ message: "Artifact not found" });
    
    // Agar mil gaya to pure object ko client ko bhej denge.
    res.json(shared);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Kisi ek specific conversation ko aur uske saare messages ko delete karne ka function.
export const deleteConversation = async(req, res) => {
 try {
  const userId = req.headers["x-user-id"];
  const conversationId = req.params.id;
  
  // findOneAndDelete ye ensure karta hai ki sirf vahi delete ho jiska 'conversationId' ho aur jisko current 'userId' belong karta ho (Security check).
  // Why? Taaki koi doosra user kisi aur ki chat delete na kar paaye.
  await Conversation.findOneAndDelete({_id: conversationId, userId: userId});
  
  // Us chat ke corresponding saare messages ko deleteMany se DB se udaa diya.
  // Interview Tip: This is called cascading delete manual implementation. Relational DB me ye ON DELETE CASCADE se hota.
  await Message.deleteMany({conversationId: conversationId});

  res.json({
   message: "Conversation deleted"
  });
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// User ke saare chats delete karne ka function (Delete All).
export const deleteAllConversations = async(req, res) => {
 try {
  const userId = req.headers["x-user-id"];
  
  // Pehle saari conversations find karke la rahe hain jisme userId current user ki ho.
  const conversations = await Conversation.find({userId: userId});
  // Array of IDs extract kar rahe hain in saari chats ka.
  const conversationIds = conversations.map(c => c._id);
  
  // $in operator ka use karke array me di hui saari IDs wale messages ko bulk delete maar rahe hain.
  await Message.deleteMany({conversationId: {$in: conversationIds}});
  // Phir user ki saari conversations ko delete kar diya.
  await Conversation.deleteMany({userId: userId});

  res.json({
   message: "All conversations deleted"
  });
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// Kisi conversation ko list me topmost pin karne ke liye toggle function.
export const togglePin = async(req, res) => {
 try {
  // Request body se conversation ki ID nikali.
  const {conversationId} = req.body;
  
  // Document ko DB se find kiya.
  const conversation = await Conversation.findById(conversationId);
  // Current boolean value ko reverse kar diya. (True to False, False to True).
  // Why? Ek hi API endpoint se pin aur unpin dono ho jayega.
  conversation.isPinned = !conversation.isPinned;
  // Updated document DB me save kiya.
  await conversation.save();

  res.json(conversation);
 } catch(error) {
  res.status(500).json({
   message: error.message
  });
 }
}

// Conversation ko kisi specific folder me move/assign karne ka function.
export const moveToFolder = async (req, res) => {
  try {
    const { conversationId, folder } = req.body;
    // findByIdAndUpdate se document dhoondha aur 'folder' attribute ko update kiya.
    // {new: true} pass kiya, taaki updated document immediately return ho jaye naye folder data ke saath.
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