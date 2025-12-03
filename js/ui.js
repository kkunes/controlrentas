// js/ui.js

import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

/**
 * Muestra el loader principal de la aplicación.
 */
export function mostrarLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

/**
 * Oculta el loader principal de la aplicación.
 */
export function ocultarLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

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

        return;
    }
    if (!modalContent) {

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
 * Muestra una notificación flotante (toast) con un mensaje y estilo.
 * Las notificaciones aparecen en el contenedor con id 'notificacionContainer'.
 *
 * @param {string} mensaje - El texto que se mostrará en la notificación.
 * @param {'success'|'error'|'info'|'warning'} [tipo='info'] - El tipo de notificación, que determina el color y el ícono.
 * @param {number} [duracion=3000] - El tiempo en milisegundos que la notificación permanecerá visible.
 * @param {'esquina'|'centro'} [posicion='esquina'] - Dónde mostrar la notificación.
 */
export function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3000, posicion = 'esquina') {
    // Forzar la duración para las advertencias para asegurar que se auto-cierren.
    if (tipo === 'warning') {
        duracion = 4000;
    }

    const containerId = posicion === 'centro' ? 'notificacionContainerCentrado' : 'notificacionContainer';
    let contenedor = document.getElementById(containerId);

    // Si el contenedor no existe (especialmente el centrado), lo creamos
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = containerId;
        document.body.appendChild(contenedor);
        // Re-aplicamos los estilos desde el CSS
        // (El CSS ya tiene las reglas para el nuevo ID)
    }

    const toast = document.createElement('div');
    const estilos = obtenerEstilosToast(tipo);

    toast.className = `toast-notification ${estilos.clases}`;
    toast.innerHTML = `
        <div class="toast-icon">${estilos.icono}</div>
        <div class="toast-content">
            <p class="toast-title">${estilos.titulo}</p>
            <p class="toast-message">${mensaje}</p>
        </div>
        <button class="toast-close-btn" aria-label="Cerrar">&times;</button>
    `;

    // Aplicar animación de entrada diferente si está en el centro
    if (posicion === 'centro') {
        toast.style.transform = 'translateY(20px) scale(0.95)';
    }

    contenedor.appendChild(toast);

    // Forzar la animación de entrada.
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const cerrarToast = () => {

        if (!toast.classList.contains('show')) return;
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    const temporizador = setTimeout(cerrarToast, duracion);

    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
        clearTimeout(temporizador);
        cerrarToast();
    });
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

/**
 * Devuelve las clases CSS, el ícono y el título para un tipo de notificación.
 * @param {'success'|'error'|'info'|'warning'} tipo - El tipo de notificación.
 * @returns {{clases: string, icono: string, titulo: string}}
 */
function obtenerEstilosToast(tipo) {
    switch (tipo) {
        case 'success':
            return { clases: 'toast-success', icono: '✔️', titulo: 'Éxito' };
        case 'error':
            return { clases: 'toast-error', icono: '❌', titulo: 'Error' };
        case 'warning':
            return { clases: 'toast-warning', icono: '⚠️', titulo: 'Advertencia' };
        case 'info':
        default:
            return { clases: 'toast-info', icono: 'ℹ️', titulo: 'Información' };
    }
}

/**
 * Toggle pill menu visibility with animation
 * @param {string} menuId - The ID of the menu to toggle (without 'pill-menu-' prefix)
 */
window.togglePillMenu = function (menuId) {
    const menu = document.getElementById(`pill-menu-${menuId}`);
    if (!menu) return;

    const isVisible = menu.style.display !== 'none';

    // Close all other pill menus
    document.querySelectorAll('.pill-menu').forEach(otherMenu => {
        if (otherMenu !== menu) {
            otherMenu.style.display = 'none';
        }
    });

    // Toggle current menu
    if (isVisible) {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
};

// Close pill menus when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.pill-menu') && !event.target.closest('button[onclick*="togglePillMenu"]')) {
        document.querySelectorAll('.pill-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});