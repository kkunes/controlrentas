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
        const modalHtml = `
            <div class="p-6 max-w-md mx-auto">
                ${mensaje}
                
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <button id="btn-cancelar" class="w-full sm:w-auto btn-secundario">
                        ${botonCancelar}
                    </button>
                    <button id="btn-confirmar" class="w-full sm:w-auto ${obtenerClasesBoton(tipo)}">
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

    const estilosToast = obtenerEstilosToast(tipo);

    const toast = document.createElement('div');
    toast.id = 'toast-notificacion';
    toast.className = `toast-base ${estilosToast.clases}`;
    toast.innerHTML = `
        <span class="toast-icono">${estilosToast.icono}</span>
        <span class="toast-mensaje">${mensaje}</span>
        <button onclick="this.parentElement.remove()" class="toast-cerrar">&times;</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duracion);
}

// Los estilos y animaciones ahora están en css/styles.css

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

// --- Funciones de utilidad para los estilos (pueden ir en otro archivo si es necesario) ---
function obtenerClasesBoton(tipo) {
    switch (tipo) {
        case 'danger':
            return 'btn-peligro';
        case 'warning':
            return 'btn-alerta';
        case 'info':
        default:
            return 'btn-info';
    }
}

function obtenerEstilosToast(tipo) {
    switch (tipo) {
        case 'success':
            return { clases: 'toast-success', icono: '✔️' };
        case 'error':
            return { clases: 'toast-error', icono: '❌' };
        case 'warning':
            return { clases: 'toast-warning', icono: '⚠️' };
        case 'info':
        default:
            return { clases: 'toast-info', icono: 'ℹ️' };
    }
}