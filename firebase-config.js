// firebase-config.js - Firebase v10+ (ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// COLE AQUI AS SUAS CHAVES DO FIREBASE CONSOLE:
const firebaseConfig = {
  apiKey: "AIzaSyDVZSlNvtLOER3YdotvGi-G7VvDtSQwV7M",
  authDomain: "sistema-team-penning.firebaseapp.com",
  projectId: "sistema-team-penning",
  storageBucket: "sistema-team-penning.firebasestorage.app",
  messagingSenderId: "1025888364244",
  appId: "1:1025888364244:web:d4c5d0582899a855ddbd41"
};

// Inicialização
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exportando métodos utilitários
export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
};