import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0334361765",
  appId: "1:170737440346:web:e5347dc18a41aa2ea9ea63",
  apiKey: "AIzaSyCrn6_drT2G57S_a5YoZPvWC_FdEnnMMq0",
  authDomain: "gen-lang-client-0334361765.firebaseapp.com",
  firestoreDatabaseId: "default",
  storageBucket: "gen-lang-client-0334361765.firebasestorage.app",
  messagingSenderId: "170737440346",
  measurementId: ""
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
