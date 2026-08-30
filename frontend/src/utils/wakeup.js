// Interview Prep (What & Why):
// What: wakeUpServers ek utility function hai jo multiple server endpoints par request bhejta hai.
// Why: Free tier cloud hosting (jaise Render) par backend services sleep mode mein chali jaati hain. Unhe background mein pehle se "wake up" (active) karne ke liye yeh script load hote hi chalayi jaati hai.
export const wakeUpServers = () => {
  // Interview Prep (What & Why):
  // What: SERVICES naam ka ek array define kiya gaya hai.
  // Why: Ismein sabhi required microservices ke health check ya root URLs list kiye gaye hain taaki ek saath sabko ping kiya ja sake.
  const SERVICES = [
    'https://ai-luma.onrender.com',
    'https://ai-luma-auth.onrender.com/api/auth/health',
    'https://ai-luma-agent.onrender.com/api/agent/health',
    'https://ai-luma-chat.onrender.com/api/chat/health',
    'https://ai-luma-billing.onrender.com/api/billing/health'
  ];

  console.log('[WakeUp] Pinging all microservices to wake them up...');
  
  // Interview Prep (What & Why):
  // What: Promise.allSettled aur fetch ka use karke saare URLs par concurrent GET requests bheji ja rahi hain.
  // Why: Promise.allSettled isliye use kiya hai kyunki agar ek server fail bhi ho jaye tab bhi baaki servers ka status check chalta rahega. 'no-cors' ka matlab hai humein CORS error ki fikar nahi hai, bas request server tak pahunch jaye.
  Promise.allSettled(
    SERVICES.map((url) =>
      fetch(url, { method: 'GET', mode: 'no-cors' })
      .catch((err) => console.log('Ping failed for', url))
    )
  )
  .then(() => {
    // Interview Prep (What & Why):
    // What: Jab saare requests fulfill ya reject ho jayein, toh message log hota hai.
    // Why: Yeh confirm karne ke liye hai ki saari services ko ping bheja ja chuka hai aur app ab ready to use ho sakti hai.
    console.log('[WakeUp] All services pinged successfully.');
  });
};