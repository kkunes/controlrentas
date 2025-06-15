// js/ui.js

import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/**
 * Muestra un diálogo de confirmación personalizado.
 * @param {string} mensaje - El mensaje HTML a mostrar
 * @param {string} botonConfirmar - Texto del botón de confirmación
 * @param {string} botonCancelar - Texto del botón de cancelación
 * @param {'info'|'warning'|'danger'} tipo - Tipo de confirmación
 * @returns {Promise<boolean>} - Promesa que resuelve a true si se confirma, false si se cancela
 */
export function confirmarAccion(mensaje, botonConfirmar = 'Confirmar', botonCancelar = 'Cancelar', tipo = 'warning') {
    return new Promise((resolve) => {
        // Colores según el tipo
        let colorPrincipal, colorHover, colorBorde;
        
        switch (tipo) {
            case 'danger':
                colorPrincipal = 'from-rose-500 to-red-600';
                colorHover = 'hover:from-rose-600 hover:to-red-700';
                colorBorde = 'border-rose-400/30';
                break;
            case 'warning':
                colorPrincipal = 'from-amber-500 to-yellow-600';
                colorHover = 'hover:from-amber-600 hover:to-yellow-700';
                colorBorde = 'border-amber-400/30';
                break;
            case 'info':
            default:
                colorPrincipal = 'from-indigo-500 to-blue-600';
                colorHover = 'hover:from-indigo-600 hover:to-blue-700';
                colorBorde = 'border-indigo-400/30';
                break;
        }
        
        const modalHtml = `
            <div class="p-6 max-w-md mx-auto">
                ${mensaje}
                
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <button id="btn-cancelar"
                            class="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center border border-gray-200">
                        ${botonCancelar}
                    </button>
                    <button id="btn-confirmar"
                            class="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-br ${colorPrincipal} ${colorHover}
                            text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border ${colorBorde}">
                        ${botonConfirmar}
                    </button>
                </div>
            </div>
        `;
        
        mostrarModal(modalHtml);
        
        // Agregar event listeners
        document.getElementById('btn-confirmar').addEventListener('click', () => {
            ocultarModal();
            resolve(true);
        });
        
        document.getElementById('btn-cancelar').addEventListener('click', () => {
            ocultarModal();
            resolve(false);
        });
    });
}

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