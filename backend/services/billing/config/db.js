import mongoose from "mongoose";
// yaha hum mongoose library ko import kar rahe hain, jo ki MongoDB ke saath interact karne ke liye use hoti hai

const connectDB = async () => {
  // yaha hum ek function banate hain jiska naam connectDB hai, jo ki async hai, matlab yeh function asynchronous tarah se execute hogi
  try {
    // yaha hum try block ka use kar rahe hain, jisme hum apna code likhenge, agar koi error aata hai to catch block me jaayega
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URL);
    // yaha hum mongoose ke connect function ko call kar rahe hain, jisme hum MongoDB ke URL ko pass kar rahe hain, jo ki environment variable me store hai
    // agar MONGO_URI nahi mila to MONGODB_URL ko use karega

    console.log(
      "DB Connected"
    );
    // yaha hum console me message print kar rahe hain, ki database successfully connect ho gayi hai

  } catch (error) {
    // yaha hum catch block ka use kar rahe hain, jisme hum error ko handle karenge
    console.log("Db Error", error)
    // yaha hum console me error ko print kar rahe hain, jo ki database connect hone me aaya hai
  }

};

export default connectDB
// yaha hum connectDB function ko export kar rahe hain, taaki hum isse alag file me import karke use kar sakein