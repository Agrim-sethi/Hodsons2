/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYIVKEtgKw2lqTJMMUQcARw7K8R3F8a3Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hodsons-848af.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hodsons-848af",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hodsons-848af.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "920497141342",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:920497141342:web:8d09a5f071aa19b052e6cf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8SNX99YQ2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
