/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Verified Firebase Web SDK configuration from the HODSONS1 Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyDYIVKEtgKw2lqTJMMUQcARwK7R8F3a8Y3",
  authDomain: "hodsons-848af.firebaseapp.com",
  projectId: "hodsons-848af",
  storageBucket: "hodsons-848af.firebasestorage.app",
  messagingSenderId: "920497141342",
  appId: "1:920497141342:web:8d09a5f071aa19b052e6cf",
  measurementId: "G-8SNX99YQ2W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Staff-facing login shortcut. SNA maps to the Firebase Auth email account.
export const FIREBASE_STAFF_EMAIL = "sna@hodsons-848af.firebaseapp.com";
