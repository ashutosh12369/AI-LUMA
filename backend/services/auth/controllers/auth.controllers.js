import crypto from "crypto";

import { getAuth }
  from "firebase-admin/auth";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";
import { app } from "../config/firebase.js";


// Interview Prep: login function
// What: Handle user login via Firebase IdToken, aur agar naya user hai to DB me create karega.
// Why: Single Sign-On (SSO) ke liye Firebase use ho raha hai for secure authentication bina password store kiye.
export const login = async (
  req,
  res
) => {

  try {


    // What: Client side se Firebase IdToken nikal rahe hain.
    // Why: Client authentication verify karne ke liye ye token backend bhejta hai.
    const { token } = req.body;

    // What: Firebase Admin SDK se token verify karte hain.
    // Why: Ye ensure karta hai ki token valid hai aur expired ya tampered nahi hai.
    const decoded =
      await getAuth(app)
        .verifyIdToken(token);

    console.log(decoded);


    // What: Database me user dhundhte hain based on firebaseUid.
    // Why: Check karne ke liye ki user already registered hai ya first time login kar raha hai.
    let user =
      await User.findOne({
        firebaseUid:
          decoded.uid,
      });

    if (!user) {

      // What: Agar user DB me nahi mila to naya record create kar rahe hain.
      // Why: First time user onboarding (Signup).
      user =
        await User.create({

          firebaseUid:
            decoded.uid,

          email:
            decoded.email,

          name:
            decoded.name,

          avatar:
            decoded.picture,

          provider:
            decoded.firebase
              ?.sign_in_provider,
        });
    }

    // What: Unique Session ID generate kar rahe hain user ke liye.
    // Why: State management and secure session tracking ke liye, kyunki direct JWT nahi use kar rahe idhar session based logic hai.
    const sessionId =
      crypto.randomUUID();

    // What: Redis me user ka session ID store karte hain with 7 days expiry.
    // Why: Quick lookup for active sessions. Redis use karna scale ke liye achha hai (in-memory DB = fast).
    await redis.set(
      `user-session:${user._id}`,
      sessionId,
      "EX",
      60 * 60 * 24 * 7
    );

    // What: Redis me actual session data (cache) store karte hain.
    // Why: Har request me DB hit se bachne ke liye user ki basic details cache me rakhte hain.
    await redis.set(

      `session:${sessionId}`,

      JSON.stringify({

        userId:
          user._id,

        email:
          user.email,
        avatar:
          user.avatar,
        name: user.name,
        plan: user.plan,
        credits: user.credits,
        totalCredits: user.totalCredits


      }),

      "EX",

      60 * 60 * 24 * 7
    );

    // What: Session ID ko HTTP-only cookie me set kar rahe hain.
    // Why: XSS attacks se bachne ke liye HTTP-only cookie best practice hai (JavaScript isko read nahi kar sakti).
    res.cookie(

      "session",

      sessionId,

      {
        httpOnly: true,

        secure: true,

        sameSite: "none",

        maxAge:
          1000 *
          60 *
          60 *
          24 *
          7,
      }
    );

    // What: Frontend ko successful response aur user data bhejte hain.
    // Why: Client state update karne ke liye (login complete).
    return res.json({

      success: true,

      user,
    });

  } catch (error) {

    // What: Error handling (mostly invalid token pe).
    // Why: Application crash na ho aur client ko proper unauthorized status (401) mile.
    return res
      .status(401)
      .json({
        message:
          error.message,
      });

  }

};



// Interview Prep: logout function
// What: User ko system se log out karta hai.
// Why: Security ke liye active session ko invalid karna aur cookies hatana zaroori hai.
export const logout =
  async (req, res) => {

    try {

      // What: Cookie se current session ID nikalte hain.
      // Why: Redis se specific session ko delete karne ke liye.
      const sessionId =
        req.cookies?.session;

      if (sessionId) {

        // What: Redis se session token delete karte hain.
        // Why: Backend se session destroy karna taaki koi old token use na kar sake.
        await redis.del(
          `session:${sessionId}`
        );

      }

      // What: Client browser se cookie clear kar rahe hain.
      // Why: Client side se logout complete karne ke liye. Same options (httpOnly, secure, sameSite) match karni chahiye.
      res.clearCookie(
        "session",
        {
          httpOnly: true,
          secure: true,
          sameSite: "none"
        }
      );

      // What: Success message return karte hain.
      // Why: Frontend ko bata rahe hain ki logout process pura ho gaya.
      return res.status(200).json({

        success: true,

        message: "Logged out successfully"

      });

    } catch (error) {

      // What: Server error handle karte hain.
      // Why: Robust error reporting ke liye without crashing node app.
      return res.status(500).json({

        success: false,

        message: error.message

      });

    }

  };



// Interview Prep: updatePlan function
// What: User ka plan aur credits update karne ki internal API hai.
// Why: Subscription purchase ke baad user ka tier/limits modify karna padta hai.
export const updatePlan = async (req, res) => {

  try {

    // What: Request body se details extract karte hain.
    // Why: Kaunsa user, kaunsa plan, kitne credits aaye hain ye pata chalega.
    const {

      userId,

      plan,

      credits

    } = req.body;

    // What: Database me user check kar rahe hain by ID.
    // Why: Ensure karne ke liye ki legitimate record modify kar rahe hain.
    const user = await User.findById(userId);

    if (!user) {

      // What: User nahi mila to 404 error return karna.
      // Why: Client/Admin ko pata chale ki data exist nahi karta.
      return res.status(404).json({

        success: false,

        message: "User not found"

      });

    }



    // What: User ki properties modify kar rahe hain.
    // Why: Plan aur balance update ho jaye (Business logic of billing).
    user.plan = plan;

    user.credits += credits;

    user.totalCredits += credits;

    // What: Expiry date 30 days aage set kar rahe hain.
    // Why: Monthly subscription model implement kiya gaya hai.
    user.planExpiresAt = new Date(

      Date.now() +

      30 * 24 * 60 * 60 * 1000

    );

    // What: Updated user document MongoDB me save karna.
    // Why: Persistent storage me changes reflect ho jayein.
    await user.save();


    // What: Redis se user ka existing session nikalte hain.
    // Why: Cache me bhi user details hain, DB change hone ke baad cache bhi update karna zaroori hai.
    const sessionId = await redis.get(
      `user-session:${user._id}`
    );

    if (sessionId) {

      // What: Redis ke session object me naya plan aur credits update karte hain.
      // Why: Taaki agle request pe DB query ke bina hi updated credits frontend ko mile.
      await redis.set(

        `session:${sessionId}`,

        JSON.stringify({

          userId: user._id,

          email: user.email,

          avatar: user.avatar,

          name: user.name,

          plan: user.plan,

          credits: user.credits,

          totalCredits: user.totalCredits

        }),

        "EX",

        60 * 60 * 24 * 7

      );

    }

    // What: Success response for internal microservice or billing system.
    // Why: Caller service ko confirmation chahiye hota hai ki update ho gaya hai.
    return res.json({

      success: true

    });

  }

  catch (error) {

    console.log(error);

    // What: Server side generic error catch.
    // Why: Unhandled rejections prevent karta hai.
    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};





// Interview Prep: deductCredits function
// What: User jab koi AI agent use kare, to uske base pe uske credits minus karne ka logic.
// Why: Pay-as-you-go ya limited tier feature maintain karne ke liye.
export const deductCredits = async (req, res) => {

    try {

        // What: Request se userId aur agent(type of service) nikal rahe hain.
        // Why: Identify karna ki kis service ke liye deduction karna hai.
        const {

            userId,

            agent

        } = req.body;

        // What: Ek dictionary (map) banayi hai services ke cost ki.
        // Why: Hardcoded values ki jagah ek jagah costs manage karna better pattern hai. Interviewer is logic ko pasand karenge.
        const COST = {

             chat:1,

  search:5,

  coding:10,

  pdf:10,

  ppt:10,

  image:10

        };

        // What: User ko DB se fetch karte hain.
        // Why: Uska current balance check karne ke liye.
        const user = await User.findById(userId);

        if(!user){

            return res.status(404).json({

                success:false,

                message:"User not found"

            });

        }

        // What: Kitne credits katne hain wo calculate karte hain. Fallback 1 liya hai.
        // Why: Agar koi undefined agent aa jaye, to default minimum charge lagana chahiye as safety net.
        const requiredCredits =
        COST[agent] || 1;

        // What: Check karte hain if user has enough balance.
        // Why: Negative credits hone se rokne ke liye (Validation check).
        if(user.credits < requiredCredits){

            return res.status(400).json({

                success:false,

                message:"Not enough credits."

            });

        }

        // What: User account se credits minus kar rahe hain.
        // Why: Payment logic execution (State mutation).
        user.credits -= requiredCredits;

        // What: Save in Database.
        // Why: Persistent change karna zaroori hai.
        await user.save();

        // What: Phir se cache session ko dhundh rahe hain Redis se.
        // Why: User ki memory me state purani (bina deduction ki) na reh jaye.
        const sessionId =
        await redis.get(
            `user-session:${user._id}`
        );

        if(sessionId){

            // What: Cache memory update with new deducted credits.
            // Why: Cache consistency ensure karne ke liye (Stale data problem se bachav).
            await redis.set(

                `session:${sessionId}`,

                JSON.stringify({

                    userId:user._id,

                    email:user.email,

                    avatar:user.avatar,

                    name:user.name,

                    plan:user.plan,

                    credits:user.credits,

                    totalCredits:user.totalCredits

                }),

                "EX",

                60*60*24*7

            );

        }

        // What: Return updated credits to client.
        // Why: Client pe balance automatically kam dikhe UI pe bina page refresh kare.
        return res.json({

            success:true,

            credits:user.credits

        });

    }

    catch(error){

        console.log(error);
          console.log(error)
        // What: Error handling.
        // Why: Fail safe approach against unexpected system breakdowns.
        return res.status(500).json({

            success:false,

            message:error.message

        });

    }

};