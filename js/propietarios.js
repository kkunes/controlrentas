import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';

export async function registrarPropietario(nombre, telefono) {
    try {
        await addDoc(collection(db, "propietarios"), {
            nombre,
            telefono
        });
        alert("Propietario registrado con éxito.");
    } catch (error) {
        alert("Error al registrar propietario: " + error.message);
    }
}