// React se useState hook import kar rahe hain. Yeh local component state manage karne (jaise banner open hai ya nahi) ke kaam aata hai.
import { useState } from "react";
// Baaki custom UI components import kar rahe hain.
import AIBanner from "./AiBanner";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import MessageList from "./MessageList";
import Navbar from "./Navbar";

// ChatArea component ek wrapper hai jo main chat interface ke sabhi parts ko ek jagah jorta (assemble) karta hai.
function ChatArea() {
  
  // Banner state ko define kar rahe hain. Is object me 'open' (boolean), 'title' (string), aur 'message' (string) hoga.
  // Shuru me banner band hoga (open: false).
  const [banner, setBanner] = useState({
    open: false,
    title: "",
    message: ""
  });

  return (
    // Main container div: flex-1 ensures ki ye bachi hui saari height aur width le le.
    // flex-col isko vertical stack me badalta hai (top to bottom).
    <div className="flex-1 flex flex-col min-w-0">

      {/* Top Navbar: Header dikhata hai (Title, message count) */}
      <Navbar />

      {/* MessageList: Yeh list of messages (conversation history) show karta hai aur auto-scroll handle karta hai */}
      <MessageList />
      
      {/* AIBanner: Error ya info popup show karta hai. Ise conditionally controlled kiya ja raha hai 'banner' state se. */}
      <AIBanner
        open={banner.open}       // Banner dikhega ya nahi
        title={banner.title}     // Banner ka title
        message={banner.message} // Banner ka description
        onClose={() =>           // Jab close button pe click hoga, toh banner ki 'open' state false set ho jayegi
          setBanner({
            ...banner,           // Purana state copy kiya spread operator se
            open: false          // Sirf open property ko false kar diya
          })
        }
      />

      {/* ChatInput: User jahan type karega aur send karega.
          Isko 'setBanner' pass kiya gaya hai taaki agar error aaye toh ChatInput se seedhe banner ko open kiya ja sake. (Lifting state up concept) */}
      <ChatInput
        setBanner={setBanner}
      />

    </div>
  );
}

// Default export taaki pages me seedha use kiya ja sake.
export default ChatArea;