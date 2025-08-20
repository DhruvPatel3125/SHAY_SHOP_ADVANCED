import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRiL06qm-Itm51ozGe-3FWYAElcKlm7rk",
  authDomain: "shayrooms-973d9.firebaseapp.com",
  projectId: "shayrooms-973d9",
  storageBucket: "shayrooms-973d9.appspot.com", // ✅ corrected
  messagingSenderId: "185335220426",
  appId: "1:185335220426:web:903f039c7d9d2ce6250c33",
  measurementId: "G-S2HYC5PX84",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth & Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
