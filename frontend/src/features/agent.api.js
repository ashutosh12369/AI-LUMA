// Interview Prep (What & Why):
// What: Axios ek HTTP client library hai jo frontend se backend (API) tak requests bhejne ka kaam karti hai. Hum ek pre-configured api instance import kar rahe hain.
// Why: Hum fetch() API ki jagah axios use kar rahe hain kyunki axios automatically JSON parse kar deta hai aur base URL, headers jaisi cheezein interceptors ke through asani se manage hoti hain.
import api from "../utils/axios";

// Interview Prep (What & Why):
// What: Yeh ek async function hai `sendPrompt` jo frontend se backend ke `/api/agent/chat` route par POST request bhejta hai.
// Why: Async/Await ka use isliye kiya hai taaki network call complete hone tak execution ruki rahe bina UI ko freeze kiye (non-blocking). Isse callback hell se bhi bachav hota hai.
export const sendPrompt = async (payload, config = {}) => {
    // Interview Prep (What & Why):
    // What: `api.post` se backend ko data bheja ja raha hai. `payload` wo actual message ya data hai, aur `config` optional settings hain (jaise headers).
    // Why: Object destructuring `{ data }` ka use karke hum axios ke response object me se directly main data nikal rahe hain, taaki code clean rahe.
    const { data } = await api.post("/api/agent/chat", payload, config);

    // Interview Prep (What & Why):
    // What: Console pe received data print ho raha hai.
    // Why: Yeh debugging ke liye hota hai taaki development ke waqt pata chale ki API ne exact kya response bheja hai. Production me aam taur par inhe hata diya jata hai.
    console.log(data);

    // Interview Prep (What & Why):
    // What: Function se aakhiri processed data return ho raha hai.
    // Why: Jo bhi component (e.g. React component) is API function ko call karega, usko required data asani se mil jaye display ya state update karne ke liye.
    return data;
};