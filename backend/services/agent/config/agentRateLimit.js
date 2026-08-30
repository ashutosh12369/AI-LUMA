import redis from "../../../shared/redis/redis.js";

// yaha hum limits object define kar rahe hai, jismein humne alag-alag agents ke liye limits set kiye hai
const LIMITS = {
  chat: 20,
  coding: 5,
  pdf: 5,
  ppt: 5,
  image: 3,
  search:5
};

// yaha hum checkAgentLimit function define kar rahe hai, jo ki async hai aur userId aur agent ke parameters leta hai
export const checkAgentLimit = async (userId, agent) => {

  // yaha hum agent ke liye max limit nikal rahe hai, agar agent LIMITS object mein nahi hai to hum chat ke limit ko default maan rahe hai
  const max = LIMITS[agent] ?? LIMITS.chat;

  // yaha hum redis key banate hai, jismein agent aur userId shaamil hai
  const key = `rate:${agent}:${userId}`;

  // yaha hum redis mein key ke liye current count nikal rahe hai, agar key nahi hai to redis incr method 1 return karega
  const count = await redis.incr(key);

  // yaha hum check kar rahe hai agar count 1 hai, to hum key ko 60 seconds ke liye expire kar dete hai
  if (count === 1) {
    await redis.expire(key, 60);
  }

  // yaha hum key ke liye remaining time to live (ttl) nikal rahe hai
  const ttl = await redis.ttl(key);

  // yaha hum check kar rahe hai agar count max limit se zyada hai, to hum error throw karte hai
  if (count > max) {

    // yaha hum remaining time ko minutes aur seconds mein convert kar rahe hai
    const minutes = Math.floor(ttl / 60);
    const seconds = ttl % 60;

    // yaha hum time ko user-friendly format mein convert kar rahe hai
    const time =
      minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

    // yaha hum error object banate hai aur usmein status, data aur message set karte hai
    const error = new Error(
      `Rate limit exceeded for ${agent}.`
    );

    error.status = 429;

    error.data = {
      success: false,
      agent,
      limit: max,
      remainingTime: ttl,
      retryAfter: time,
      message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`
    };

    // yaha hum error throw karte hai
    throw error;
  }

  // yaha hum object return karte hai jismein remaining aur limit hai
  return {
    remaining: max - count,
    limit: max
  };
};