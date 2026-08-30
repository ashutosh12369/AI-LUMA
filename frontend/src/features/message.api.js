// Interview Prep (What & Why):
// What: Axios instance yahan import hua hai API network requests ke liye.
// Why: Centralized HTTP client use karne se auth token refresh, error handling sab ek jagah (interceptor me) manage ho jata hai.
import api from "../utils/axios";

// Interview Prep (What & Why):
// What: `getMessages` kisi specific chat (conversationId) ke saare messages backend se laata hai.
// Why: Async function banaya gaya hai taaki UI block na ho, aur data retrieve hone par turant destructure `{ data }` kar liya jata hai axios response se.
export const getMessages = async (conversationId) => {
  // Interview Prep (What & Why):
  // What: GET request bhej rahe hain jisme conversationId URL string ke andar dynamically embed kiya gaya hai (Template literal syntax se).
  // Why: REST architecture me GET requests hamesha URLs parameters/path par depend karti hain resources lene ke liye. Isse caching bhi better hoti hai.
  const { data } = await api.get(`/api/chat/get-messages/${conversationId}`);
  
  // Interview Prep (What & Why):
  // What: Data ko console me log karna developer ko track rakhne me madad karta hai.
  // Why: Confirm karne ke liye ki backend se format waisa hi aaya hai jaisa frontend expect kar raha hai (e.g. array of message objects).
  console.log(data);

  // Interview Prep (What & Why):
  // What: Aakhir me fetch kiya hua messages data return kiya ja raha hai.
  // Why: Taaki calling component isko redux store ya local component state me save karke chat interface pe render kar sake.
  return data;
};