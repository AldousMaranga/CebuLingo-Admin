// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBe3Kc_kUL7Iof8isz1N0cAaLWKqwEuZ38",
  authDomain: "cebulingo-admin.firebaseapp.com",
  projectId: "cebulingo-admin",
  storageBucket: "cebulingo-admin.firebasestorage.app",
  messagingSenderId: "273042664545",
  appId: "1:273042664545:web:48a3a2981bdd3bc0320e20"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
