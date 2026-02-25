// src/firebase.js
// ⚠️  SUBSTITUA pelos dados do seu projeto no Firebase Console
// Acesse: https://console.firebase.google.com → Seu projeto → Configurações → Configuração do SDK

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJmmWko25zbL8oJ7hYKxIDmj3Giv8Pt7s",
  authDomain: "beach-tennis-pro-bd5c8.firebaseapp.com",
  projectId: "beach-tennis-pro-bd5c8",
  storageBucket: "beach-tennis-pro-bd5c8.firebasestorage.app",
  messagingSenderId: "50398184907",
  appId: "1:50398184907:web:6f897e3062a2ca71b3224e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
