// Interview Prep (What & Why):
// What: Axios instance import ho raha hai API requests karne ke liye.
// Why: Pre-configured axios instance (jaise authentication tokens, base URL) baar-baar likhne ki zaroorat nahi padti, code DRY (Don't Repeat Yourself) rehta hai.
import api from "../utils/axios";

// Interview Prep (What & Why):
// What: `createOrder` ek asynchronous function hai jo backend par order create karne ki request bhejta hai, aur usme `plan` as an argument leta hai.
// Why: Payment aur order creation jaisi calls time leti hain, isliye `async` ka use kiya hai taaki request background me chale aur resolve hone par hi agla step run ho.
export const createOrder = async (plan) => {
    // Interview Prep (What & Why):
    // What: `/api/billing/create-order` endpoint par POST request ja rahi hai jisme payload `plan` object hai.
    // Why: Data server pe create karna hai isliye POST request method ka use hua hai (GET sirf fetch karne ke liye hota hai). Object `{ plan }` shorthand syntax hai `{ plan: plan }` ka, jo code ko concise banata hai.
    const { data } = await api.post(
        "/api/billing/create-order",
        { plan }
    );

    // Interview Prep (What & Why):
    // What: Axios response me se nikala gaya `data` return ho raha hai.
    // Why: API response ka data (jaise order id, payment token) direct frontend component me use ho sake checkout process aage badhane ke liye.
    return data;
};