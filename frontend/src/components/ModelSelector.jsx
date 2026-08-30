// React library import kar rahe hain, jo ki React components banane aur JSX use karne ke liye required hai.
import React from 'react';

// ModelSelector ek functional component hai. Iska use mostly different AI models (jaise GPT-4, Claude) select karne ke dropdown/UI ke liye hota hai.
function ModelSelector() {
  // Component JSX return karta hai, jo screen par UI render karta hai.
  return (
    // HTML div element, jisme hum component ka content rakhenge.
    <div>
      {/* Abhi ke liye yahan sirf static text "ModelSelector" likha hai. Future mein yahan dropdown ya buttons aayenge. */}
      ModelSelector
    </div>
  );
}

// Default export kar rahe hain taaki dusre files (jaise Sidebar ya ChatArea) is component ko import karke use kar sakein.
export default ModelSelector;