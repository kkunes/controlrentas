// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
// Si no usas Firebase Storage en ninguna parte de tu aplicación, puedes comentar o eliminar la siguiente línea:
//import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD556FfWyh0m6cylpQ61V6gYOZqcUfShvQ",
  authDomain: "control-de-rentas.firebaseapp.com",
  projectId: "control-de-rentas",
  // Si eliminaste Firebase Storage, puedes quitar esta línea también:
  //storageBucket: "control-de-rentas.appspot.com",
  messagingSenderId: "207986191629",
  appId: "1:207986191629:web:0cc9538b447f28a6695444"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Si no usas Firebase Storage, comenta o elimina la siguiente línea:
//export const storage = getStorage(app);

export { db, app };