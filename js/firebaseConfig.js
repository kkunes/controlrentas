// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD556FfWyh0m6cylpQ61V6gYOZqcUfShvQ",
  authDomain: "control-de-rentas.firebaseapp.com",
  projectId: "control-de-rentas",
  messagingSenderId: "207986191629",
  appId: "1:207986191629:web:0cc9538b447f28a6695444"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };