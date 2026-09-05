/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYIVKEtgKw2lqTJMMUQcARwK7R8F3a8Y3",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hodsons-848af.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hodsons-848af",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hodsons-848af.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "920497141342",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:920497141342:web:8d09a5f071aa19b052e6cf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8SNX99YQ2W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Staff can sign in with the short SNA ID while Firebase continues to use
// the underlying email/password account. The environment variable can
// override this mapping for a different staff account in another deployment.
export const FIREBASE_STAFF_EMAIL = (
  import.meta.env.VITE_FIREBASE_STAFF_EMAIL || "sna@hodsons-848af.firebaseapp.com"
).trim();
