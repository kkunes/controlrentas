// js/ui.js

import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/**
 * Muestra un modal con contenido HTML.
 * @param {string} htmlContent - El contenido HTML a mostrar dentro del modal.
 */
export function mostrarModal(htmlContent) {
    const modal = document.getElementById('miModal');
    // Asegúrate de que este ID sea 'modalContenido' para coincidir con index.html y el CSS
    const modalContent = document.getElementById('modalContenido');

    if (!modal) {
        console.error("Error UI: Elemento 'miModal' (contenedor del modal) no encontrado en el DOM.");
        return;
    }
    if (!modalContent) {
        console.error("Error UI: Elemento 'modalContenido' (área de contenido del modal) no encontrado en el DOM.");
        return;
    }

    modalContent.innerHTML = htmlContent;
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Asume que 'flex' es la clase para mostrarlo en Tailwind CSS
}

/**
 * Oculta el modal.
 */
export function ocultarModal() {
    const modal = document.getElementById('miModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // Opcional: Limpiar el contenido del modal cuando se oculta
        const modalContent = document.getElementById('modalContenido'); // ¡Aquí también el cambio!
        if (modalContent) {
            modalContent.innerHTML = '';
        }
    }
}

/**
 * Muestra una notificación temporal.
 * @param {string} message - El mensaje a mostrar.
 * @param {'success'|'error'|'info'|'warning'} type - El tipo de notificación para estilos (success, error, info, warning).
 * @param {number} duration - Duración en milisegundos (por defecto 3000ms).
 */
export function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3500) {
    // Elimina notificaciones previas
    const prev = document.getElementById('toast-notificacion');
    if (prev) prev.remove();

    // Colores y estilos por tipo
    let bg = 'bg-blue-600', border = 'border-blue-700', icon = 'ℹ️';
    if (tipo === 'success') {
        bg = 'bg-green-600'; border = 'border-green-700'; icon = '✔️';
    } else if (tipo === 'error') {
        bg = 'bg-red-600'; border = 'border-red-700'; icon = '❌';
    } else if (tipo === 'warning') {
        bg = 'bg-yellow-500'; border = 'border-yellow-600'; icon = '⚠️';
    }

    const toast = document.createElement('div');
    toast.id = 'toast-notificacion';
    toast.className = `
        fixed top-6 right-6 z-50 max-w-xs w-full
        ${bg} ${border} border-l-4 text-white px-5 py-4 rounded-lg shadow-lg flex items-center animate-fade-in
    `;
    toast.innerHTML = `
        <span class="mr-3 text-xl">${icon}</span>
        <span class="flex-1">${mensaje}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-lg font-bold focus:outline-none">&times;</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duracion);
}

// Animación fade-in (puedes poner esto en tu CSS global)
const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-in { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: none; } }
.animate-fade-in { animation: fade-in 0.3s ease; }
`;
document.head.appendChild(style);

/**
 * Elimina un documento de una colección específica en Firestore.
 * Esta función es la que realiza la operación en la base de datos.
 * Las funciones de UI deben importar esta, pero no la exponen globalmente.
 * La función global `eliminarDocumento` en `main.js` es la que gestiona
 * la confirmación y las callbacks de actualización de UI.
 *
 * @param {object} db - La instancia de Firestore.
 * @param {string} collectionName - El nombre de la colección.
 * @param {string} docId - El ID del documento a eliminar.
 */
export async function eliminarDocumento(db, collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        // No mostrar notificación aquí; la maneja la función global en main.js
    } catch (error) {
        console.error(`Error al eliminar documento en ${collectionName}/${docId}:`, error);
        throw new Error("No se pudo eliminar el documento. Intente de nuevo.");
    }
}