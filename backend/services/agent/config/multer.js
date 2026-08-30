// Importing the multer library, jo ki ek popular middleware hai Node.js ke liye file uploads ke liye
import multer from "multer";
// Importing the path library, jo ki file paths ke saath kaam karne mein madad karta hai
import path from "path";
// Importing the fs library, jo ki file system ke saath kaam karne mein madad karta hai
import fs from "fs";

// Upload directory ka path set kar rahe hai, jahaan par files upload hongi
const uploadDir = path.resolve("./temp");

// Yeh check kar rahe hai ki upload directory exist karta hai ya nahi
if (!fs.existsSync(uploadDir)) {
    // Agar upload directory nahi hai, to hum use create kar rahe hai
    fs.mkdirSync(uploadDir, {
        // Recursive option set kar rahe hai, jisse nested directories bhi create ho saken
        recursive: true
    });
}

// Multer ke storage engine ko configure kar rahe hai, jo ki files ko disk par save karega
const storage = multer.diskStorage({
    // Destination function, jo ki file ko kahaan save karna hai, uska path return karta hai
    destination(req, file, cb) {
        // Upload directory ka path return kar rahe hai
        cb(null, uploadDir);
    },
    // Filename function, jo ki file ka naam return karta hai
    filename(req, file, cb) {
        // File ka naam return kar rahe hai, jo ki current timestamp aur original file name ka combination hai
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter function, jo ki file types ko filter karta hai
const fileFilter = (req, file, cb) => {
    // Yeh check kar rahe hai ki file type allowed hai ya nahi
    if (
        file.mimetype === "application/pdf" ||
        file.mimetype.startsWith("image/") ||
        file.mimetype === "text/csv" ||
        file.originalname.endsWith(".csv")
    ) {
        // Agar file type allowed hai, to hum callback function ko true return kar rahe hai
        cb(null, true);
    } else {
        // Agar file type allowed nahi hai, to hum error return kar rahe hai
        cb(new Error("Only PDF, Images, and CSV are allowed."));
    }
};

// Multer middleware ko configure kar rahe hai, jo ki storage engine aur file filter ko use karega
export default multer({
    // Storage engine ko set kar rahe hai
    storage,
    // File filter ko set kar rahe hai
    fileFilter,
    // File size limit ko set kar rahe hai, jo ki 20MB hai
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});