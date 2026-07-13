// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeFDe53e-GKN8RH3bhwPqAqkiq-yOTqK8",
  authDomain: "ai-luma.firebaseapp.com",
  projectId: "ai-luma",
  storageBucket: "ai-luma.firebasestorage.app",
  messagingSenderId: "56472027251",
  appId: "1:56472027251:web:648fe0d2dca82c75e0aa06",
  measurementId: "G-PSQCDCP3GM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth(app)
export const googleProvider =
  new GoogleAuthProvider();

export const githubProvider =
  new GithubAuthProvider();