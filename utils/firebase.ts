/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web configuration for the HODSONS1 project.
// These values are intentionally public client configuration values.
// Keep the project identity tied to the same Firebase project used by Firestore.
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
// This keeps the Firebase email out of the staff-facing UI while retaining
// normal Firebase Email/Password authentication underneath.
export const FIREBASE_STAFF_EMAIL = "sna@hodsons-848af.firebaseapp.com";
