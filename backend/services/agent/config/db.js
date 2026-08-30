import mongoose from "mongoose";
// yaha hum mongoose library ko import kar rahe hain, jo ki MongoDB ke saath interact karne ke liye use hota hai

const connectDB = async () => {
  // yaha hum ek function banate hain jiska naam connectDB hai, jo ki asynchronous hai (async) 
  try {
    // yaha hum try block ka use kar rahe hain, jaha hum apna code likhenge jo ki database se connect hone ke liye use hoga
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URL);
    // yaha hum mongoose.connect() function ka use kar rahe hain, jo ki MongoDB ke saath connection establish karta hai, 
    // aur hum environment variable MONGO_URI ya MONGODB_URL ka use kar rahe hain, jaha humara database URL store hota hai

    console.log(
      "DB Connected"
    );
    // yadi connection successful hota hai, to hum console me "DB Connected" message print karte hain
  } catch (error) {
    // yadi koi error hota hai, to hum catch block me us error ko catch karte hain
    console.log("Db Error", error)
    // aur phir hum us error ko console me print karte hain, jisse hume pata chale ki kya problem hai
  }

};

export default connectDB
// yaha hum connectDB function ko export kar rahe hain, jisse hum is function ko dusre files me import kar sakein