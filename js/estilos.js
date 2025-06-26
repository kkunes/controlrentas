
// js/estilos.js - Utilidades para manejo de estilos visuales

/**
 * Configuración de colores y estilos por tipo
 */
export const COLORES_TIPOS = {
    danger: {
        principal: 'from-rose-500 to-red-600',
        hover: 'hover:from-rose-600 hover:to-red-700',
        borde: 'border-rose-400/30'
    },
    warning: {
        principal: 'from-amber-500 to-yellow-600',
        hover: 'hover:from-amber-600 hover:to-yellow-700',
        borde: 'border-amber-400/30'
    },
    info: {
        principal: 'from-indigo-500 to-blue-600',
        hover: 'hover:from-indigo-600 hover:to-blue-700',
        borde: 'border-indigo-400/30'
    },
    success: {
        principal: 'from-green-500 to-emerald-600',
        hover: 'hover:from-green-600 hover:to-emerald-700',
        borde: 'border-green-400/30'
    }
};

/**
 * Configuración de estilos para estados de inmuebles
 */
export const ESTILOS_ESTADOS_INMUEBLES = {
    'Disponible': {
        gradiente: 'from-green-500 to-emerald-600',
        icono: 'text-white'
    },
    'Ocupado': {
        gradiente: 'from-blue-500 to-indigo-600',
        icono: 'text-white'
    },
    'Mantenimiento': {
        gradiente: 'from-yellow-500 to-amber-600',
        icono: 'text-white'
    },
    'Fuera de Servicio': {
        gradiente: 'from-red-500 to-rose-600',
        icono: 'text-white'
    }
};

/**
 * Configuración de iconos para notificaciones toast
 */
export const ICONOS_TOAST = {
    success: '✔️',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
};

/**
 * Configuración de estilos para notificaciones toast
 */
export const ESTILOS_TOAST = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info'
};

/**
 * Obtiene las clases CSS para un botón según su tipo
 * @param {string} tipo - Tipo de botón (danger, warning, info, success)
 * @returns {string} - Clases CSS del botón
 */
export function obtenerClasesBoton(tipo) {
    const config = COLORES_TIPOS[tipo] || COLORES_TIPOS.info;
    return `px-5 py-2.5 bg-gradient-to-br ${config.principal} ${config.hover} text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border ${config.borde}`;
}

/**
 * Obtiene las clases CSS para el estado de un inquilino
 * @param {boolean} activo - Si el inquilino está activo
 * @returns {object} - Objeto con clases para borde y badge
 */
export function obtenerClasesEstadoInquilino(activo) {
    return {
        borde: activo ? 'border-green-500' : 'border-red-500',
        badge: activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        texto: activo ? 'Activo' : 'Inactivo',
        pathIcono: activo ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    };
}

/**
 * Obtiene las clases CSS para el estado de un inmueble
 * @param {string} estado - Estado del inmueble
 * @returns {object} - Objeto con clases para gradiente e icono
 */
export function obtenerClasesEstadoInmueble(estado) {
    return ESTILOS_ESTADOS_INMUEBLES[estado] || ESTILOS_ESTADOS_INMUEBLES['Disponible'];
}

/**
 * Obtiene el icono y las clases CSS para una notificación toast
 * @param {string} tipo - Tipo de notificación
 * @returns {object} - Objeto con icono y clases CSS
 */
export function obtenerEstilosToast(tipo) {
    return {
        icono: ICONOS_TOAST[tipo] || ICONOS_TOAST.info,
        clases: ESTILOS_TOAST[tipo] || ESTILOS_TOAST.info
    };
}

/**
 * Genera una tarjeta HTML base con las clases CSS apropiadas
 * @param {string} contenido - Contenido HTML de la tarjeta
 * @param {string} borderClass - Clase adicional para el borde (opcional)
 * @param {string} dataId - ID del elemento (opcional)
 * @returns {string} - HTML de la tarjeta
 */
export function generarTarjetaBase(contenido, borderClass = '', dataId = '') {
    const dataAttr = dataId ? `data-id="${dataId}"` : '';
    return `
        <div class="tarjeta-base ${borderClass}" ${dataAttr}>
            <div class="tarjeta-contenido">
                ${contenido}
            </div>
        </div>
    `;
}

/**
 * Genera el HTML para un modal con header estilizado
 * @param {string} titulo - Título del modal
 * @param {string} contenido - Contenido del modal
 * @param {string} icono - SVG del icono (opcional)
 * @returns {string} - HTML del modal
 */
export function generarModalConHeader(titulo, contenido, icono = '') {
    const iconoHtml = icono ? `<svg class="modal-icono" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icono}</svg>` : '';
    
    return `
        <div class="modal-header">
            <div class="modal-header-content">
                <div class="modal-titulo">
                    ${iconoHtml}
                    <h3 class="modal-titulo-texto">${titulo}</h3>
                </div>
            </div>
        </div>
        <div class="space-y-6 px-4">
            ${contenido}
        </div>
    `;
}

/**
 * Genera HTML para estado vacío
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} icono - SVG del icono
 * @returns {string} - HTML del estado vacío
 */
export function generarEstadoVacio(mensaje, icono) {
    return `
        <div class="estado-vacio">
            <svg class="estado-vacio-icono" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${icono}
            </svg>
            <p class="estado-vacio-texto">${mensaje}</p>
        </div>
    `;
}
