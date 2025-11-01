// js/inmuebles.js
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarLoader, ocultarLoader, mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { mostrarHistorialPagosInmueble } from './pagos.js'; // Importar para mostrar historial de pagos
import { mostrarPropietarios, editarPropietario, eliminarPropietario } from './propietarios.js'; // Importar funciones de propietarios

import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm"; // Si usas módulos

/**
 * Muestra la lista de inmuebles en forma de tarjetas.
 */
export async function mostrarInmuebles(estadoFiltro = null, tipoFiltro = null) {
    mostrarLoader();
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inmuebles.", 'error');
        ocultarLoader();
        return;
    }

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        let inmueblesList = [];
        inmueblesSnap.forEach(doc => {
            inmueblesList.push({ id: doc.id, ...doc.data() });
        });

        // Obtener todos los inquilinos
const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
let inquilinosList = [];
inquilinosSnap.forEach(doc => {
    inquilinosList.push({ id: doc.id, ...doc.data() });
});

// Para cada inmueble, busca el inquilino actual
inmueblesList.forEach(inmueble => {
    if (inmueble.estado !== "Ocupado") {
        inmueble.inquilinoActual = null;
        return;
    }
    const hoy = new Date().toISOString().slice(0, 10);

    // Filtra inquilinos asignados a este inmueble y con contrato/desocupación vigente
    const posibles = inquilinosList.filter(i => {
        // Normaliza y compara IDs como string
        if (String(i.inmuebleAsociadoId).trim() !== String(inmueble.id).trim()) return false;

        // Normaliza fechas
        const finContrato = i.fechaFinContrato ? i.fechaFinContrato.slice(0, 10) : null;
        const desocupacion = i.fechaDesocupacion ? i.fechaDesocupacion.slice(0, 10) : null;

        // Es actual si:
        // - No tiene fecha de fin de contrato o es hoy/futuro
        // - Y no tiene fecha de desocupación o es hoy/futuro
        const contratoVigente = !finContrato || finContrato >= hoy;
        const desocupacionVigente = !desocupacion || desocupacion >= hoy;

        return contratoVigente && desocupacionVigente;
    });

    // Si hay varios, toma el más reciente por fechaInicioContrato o fechaInicio
    if (posibles.length > 0) {
        posibles.sort((a, b) => {
            const aInicio = a.fechaInicioContrato || a.fechaInicio || '';
            const bInicio = b.fechaInicioContrato || b.fechaInicio || '';
            return bInicio.localeCompare(aInicio); // descendente
        });
        inmueble.inquilinoActual = posibles[0];
    } else {
        inmueble.inquilinoActual = null;
    }
});

        // Filtrar por estado si se solicita
        if (estadoFiltro && estadoFiltro !== "Todos") {
            inmueblesList = inmueblesList.filter(inmueble => inmueble.estado && inmueble.estado.toLowerCase() === estadoFiltro.toLowerCase());
        }
        // Filtrar por tipo si se solicita
        if (tipoFiltro && tipoFiltro !== "Todos") {
            inmueblesList = inmueblesList.filter(inmueble => inmueble.tipo && inmueble.tipo.toLowerCase() === tipoFiltro.toLowerCase());
        }

        // Ordenar los inmuebles para que los disponibles salgan primero
        inmueblesList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        // Generar el HTML de las tarjetas
        let tarjetasInmueblesHtml = "";
        if (inmueblesList.length === 0) {
            tarjetasInmueblesHtml = `<p class="text-gray-500 text-center py-8">No hay inmuebles registrados.</p>`;
        } else {
            tarjetasInmueblesHtml = inmueblesList.map(inmueble => {
                // Define color de borde según estado
                let borderColor = 'border-green-500'; // Disponible
                let estadoBg = 'bg-green-100 text-green-800';
                let estadoIcon = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // Checkmark icon
                
                if (inmueble.estado === 'Ocupado') {
                    borderColor = 'border-orange-500';
                    estadoBg = 'bg-orange-100 text-orange-800';
                    estadoIcon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock icon
                } else if (inmueble.estado === 'Mantenimiento') {
                    borderColor = 'border-gray-500';
                    estadoBg = 'bg-gray-100 text-gray-800';
                    estadoIcon = 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'; // Settings icon
                }

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${borderColor} overflow-hidden transform hover:-translate-y-1" data-id="${inmueble.id}">
                        <div class="p-4 sm:p-5 md:p-6">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">${inmueble.nombre}</h3>
                                </div>
                                <span class="${estadoBg} px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${estadoIcon}" />
                                    </svg>
                                    ${inmueble.estado}
                                </span>
                            </div>
                            
                            <div class="space-y-3 mb-6">
                                <div class="flex items-center justify-between text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <div class="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span class="text-sm font-medium">${inmueble.direccion}</span>
                                    </div>
                                    ${inmueble.latitud && inmueble.longitud ? `
                                        <div class="flex flex-col gap-1">
                                            <button onclick="mostrarMapaInmueble('${inmueble.id}')" 
                                                class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                </svg>
                                                Mapa
                                            </button>
                                            <button onclick="compartirUbicacion('${inmueble.latitud}', '${inmueble.longitud}', '${inmueble.nombre}')" 
                                                class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center justify-center gap-1">
                                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                                                Compartir
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span class="text-sm font-medium">${inmueble.tipo}</span>
                                </div>
                                
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-sm font-medium">${(inmueble.rentaMensual ?? 0).toFixed(2)}</span>
                                    <span class="text-xs text-gray-500 ml-1">/mes</span>
                                </div>
                                
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <span class="text-sm font-medium">
        ${
            inmueble.inquilinoActual
                ? `<button onclick="mostrarTarjetaInquilino('${inmueble.inquilinoActual.id}')" class="text-indigo-600 hover:underline font-semibold">${inmueble.inquilinoActual.nombre}</button>`
                : '<span class="text-gray-400 italic">Sin inquilino actual</span>'
        }
    </span>
</div>

                                ${inmueble.numeroCFE ? `
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span class="text-sm font-medium">CFE: ${inmueble.numeroCFE}</span>
                                </div>
                                ` : ''}
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                ${inmueble.urlContrato ? `
                                    <a href="${inmueble.urlContrato}" target="_blank" rel="noopener noreferrer"
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md"
                                        title="Ver contrato en Drive">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Contrato</span>
                                    </a>
                                ` : ''}
                                
                                <button onclick="mostrarHistorialPagosInmueble('${inmueble.id}', '${inmueble.nombre}')" 
                                    title="Ver historial de pagos del inmueble"
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Pagos</span>
                                </button>
                                <button onclick="mostrarHistorialMantenimientoInmueble('${inmueble.id}', '${inmueble.nombre}')" 
                                    title="Ver historial de mantenimiento del inmueble"
                                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    </svg>
                                    <span class="hidden sm:inline">Mantenimiento</span>
                                    <span class="sm:hidden">Mant.</span>
                                </button>
                                <button onclick="editarInmueble('${inmueble.id}')" 
                                    title="Editar información del inmueble"
                                    class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Editar</span>
                                </button>
                                <button onclick="eliminarDocumento('inmuebles', '${inmueble.id}', mostrarInmuebles)" 
                                    title="Eliminar este inmueble"
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Eliminar</span>
                                </button>
                                <button onclick="mostrarHistorialInquilinos('${inmueble.id}', '${inmueble.nombre}')" 
                                    title="Ver historial de inquilinos del inmueble"
                                    class="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Inquilinos</span>
                                </button>
                                ${inmueble.coloresPintura && inmueble.coloresPintura.length > 0 ? `
                                    <button onclick="mostrarColoresPintura('${inmueble.id}')" 
                                        title="Ver colores de pintura"
                                        class="text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105" style="background-image: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #14b8a6, #06b6d4, #3b82f6, #8b5cf6, #d946ef);">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                                        <span>Colores</span>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="handle-move cursor-move text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors duration-200" title="Arrastrar para reordenar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                <span class="text-xs">Reordenar</span>
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Filtros
        const tipos = ["Todos", "Casa", "Apartamento", "Local Comercial", "Oficina", "Terreno"];
        const estados = ["Todos", "Disponible", "Ocupado", "Mantenimiento"];

        contenedor.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div class="flex gap-2">
                    <button onclick="mostrarPropietarios()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Propietario
                    </button>
                    <button onclick="mostrarFormularioNuevoInmueble()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Inmueble</button>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <div class="flex flex-col">
                        <label for="busquedaInmueble" class="text-xs text-gray-600 mb-1">Buscar inmueble:</label>
                        <div class="relative">
                            <input type="text" id="busquedaInmueble" placeholder="Buscar por nombre o dirección..." 
                                class="form-control pl-8 pr-2 py-1 w-72">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div class="flex flex-col">
                        <label for="filtroTipo" class="text-xs text-gray-600 mb-1">Filtrar por tipo:</label>
                        <select id="filtroTipo" class="form-control">
                            ${tipos.map(tipo => `<option value="${tipo}" ${tipo === (tipoFiltro || "Todos") ? "selected" : ""}>${tipo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="flex flex-col">
                        <label for="filtroEstado" class="text-xs text-gray-600 mb-1">Filtrar por estado:</label>
                        <select id="filtroEstado" class="form-control">
                            ${estados.map(estado => `<option value="${estado}" ${estado === (estadoFiltro || "Todos") ? "selected" : ""}>${estado}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div id="listaInmuebles" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                ${tarjetasInmueblesHtml}
            </div>
        `;

        // Listeners para los filtros
        document.getElementById('filtroTipo').addEventListener('change', function () {
            mostrarInmuebles(document.getElementById('filtroEstado').value, this.value);
        });
        document.getElementById('filtroEstado').addEventListener('change', function () {
            mostrarInmuebles(this.value, document.getElementById('filtroTipo').value);
        });
        
        // Listener para el cuadro de búsqueda
        document.getElementById('busquedaInmueble').addEventListener('input', function() {
            const busqueda = this.value.toLowerCase();
            const tarjetas = document.querySelectorAll('#listaInmuebles > div');
            
            tarjetas.forEach(tarjeta => {
                const nombre = tarjeta.querySelector('h3')?.textContent.toLowerCase() || '';
                const direccion = tarjeta.querySelector('.text-gray-600 .text-sm')?.textContent.toLowerCase() || '';
                
                if (nombre.includes(busqueda) || direccion.includes(busqueda)) {
                    tarjeta.style.display = '';
                } else {
                    tarjeta.style.display = 'none';
                }
            });
        });

        // Sortable
        const listaInmuebles = document.getElementById('listaInmuebles');
        if (listaInmuebles) {
            Sortable.create(listaInmuebles, {
                animation: 150,
                handle: '.handle-move', // Solo se puede arrastrar desde el handle
                onEnd: async function (evt) {
                    const ids = Array.from(listaInmuebles.children).map(card => card.dataset.id);
                    for (let i = 0; i < ids.length; i++) {
                        await updateDoc(doc(db, "inmuebles", ids[i]), { orden: i });
                    }
                    mostrarNotificacion("Orden actualizado.", "success");
                }
            });
        }

    } catch (error) {
        console.error("Error al obtener inmuebles:", error);
        mostrarNotificacion("Error al cargar los inmuebles.", 'error');
    } finally {
        ocultarLoader();
    }
}

/**
 * Muestra el formulario para registrar un nuevo inmueble o editar uno existente.
 * @param {string} [id] - ID del inmueble a editar (opcional).
 */
export async function mostrarFormularioNuevoInmueble(id = null) {
    let inmueble = null;
    if (id) {
        try {
            const docSnap = await getDoc(doc(db, "inmuebles", id));
            if (docSnap.exists()) {
                inmueble = { id: docSnap.id, ...docSnap.data() };
            }
        } catch (error) {
            console.error("Error al obtener el inmueble para editar:", error);
            mostrarNotificacion("Error al cargar los datos del inmueble para editar.", 'error');
            return;
        }
    }

    const tituloModal = id ? "Editar Inmueble" : "Registrar Nuevo Inmueble";
    const coloresPinturaHtml = inmueble?.coloresPintura?.map((color, index) => `
        <div class="grid grid-cols-1 md:grid-cols-7 gap-2 color-entry mb-2 items-center">
            <input type="text" name="color_area_${index}" placeholder="Área" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.area || ''}" required>
            <input type="text" name="color_zona_${index}" placeholder="Zona" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.zona || ''}">
            <input type="text" name="color_marca_${index}" placeholder="Marca" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.marca || ''}">
            <input type="text" name="color_linea_${index}" placeholder="Línea" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.linea || ''}">
            <input type="text" name="color_nombre_${index}" placeholder="Nombre del color" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.color}" required>
            <input type="text" name="color_codigo_${index}" placeholder="Código" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" value="${color.codigo || ''}">
            <button type="button" class="text-red-500 hover:text-red-700" onclick="this.parentElement.remove()">Eliminar</button>
        </div>
    `).join('') || '';

    const modalContent = `
        <div class="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
            <div class="px-6 py-4">
                <div class="flex items-center justify-center gap-3">
                    <svg class="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                        <h3 class="text-2xl font-bold text-center">${tituloModal}</h3>
                        <p class="text-center text-green-100 mt-1">Complete los datos del inmueble</p>
                    </div>
                </div>
            </div>
        </div>
        
        <form id="formInmueble" class="space-y-6 max-h-[80vh] overflow-y-auto px-2">
            <!-- Información Básica -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Información Básica
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label for="nombre" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Nombre/Identificador
                        </label>
                        <input type="text" id="nombre" name="nombre" 
                            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                            value="${inmueble?.nombre ?? ''}" 
                            placeholder="Ej: Casa 123" required>
                    </div>
                    <div class="space-y-2">
                        <label for="tipo" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Tipo de Inmueble
                        </label>
                        <select id="tipo" name="tipo" 
                            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" required>
                            <option value="">Selecciona un tipo</option>
                            <option value="Casa" ${inmueble?.tipo === 'Casa' ? 'selected' : ''}>Casa</option>
                            <option value="Apartamento" ${inmueble?.tipo === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
                            <option value="Local Comercial" ${inmueble?.tipo === 'Local Comercial' ? 'selected' : ''}>Local Comercial</option>
                            <option value="Oficina" ${inmueble?.tipo === 'Oficina' ? 'selected' : ''}>Oficina</option>
                            <option value="Terreno" ${inmueble?.tipo === 'Terreno' ? 'selected' : ''}>Terreno</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Ubicación -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ubicación
                </h4>
                <div class="space-y-4">
                    <div>
                        <label for="direccion" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Dirección Completa
                        </label>
                        <input type="text" id="direccion" name="direccion" 
                            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                            value="${inmueble?.direccion ?? ''}" 
                            placeholder="Ej: Calle Principal #123, Colonia" required>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="latitud" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Latitud
                            </label>
                            <input type="text" id="latitud" name="latitud" 
                                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                                value="${inmueble?.latitud ?? ''}" 
                                placeholder="Ej: 19.4326">
                        </div>
                        <div>
                            <label for="longitud" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Longitud
                            </label>
                            <input type="text" id="longitud" name="longitud" 
                                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                                value="${inmueble?.longitud ?? ''}" 
                                placeholder="Ej: -99.1332">
                        </div>
                    </div>
                    
                    <div class="flex justify-center">
                        <button type="button" id="btnObtenerUbicacion" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Obtener Mi Ubicación Actual
                        </button>
                    </div>
                </div>
            </div>

            <!-- Detalles Financieros -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detalles Financieros
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label for="rentaMensual" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Renta Mensual
                        </label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500">$</span>
                            </div>
                            <input type="number" id="rentaMensual" name="rentaMensual" step="0.01" 
                                class="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                                value="${inmueble?.rentaMensual ?? ''}" 
                                placeholder="0.00" required>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label for="estado" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Estado del Inmueble
                        </label>
                        ${id ? `
                        <select id="estado" name="estado" 
                            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" required>
                            <option value="Disponible" ${inmueble?.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
                            <option value="Ocupado" ${inmueble?.estado === 'Ocupado' ? 'selected' : ''}>Ocupado</option>
                            <option value="Mantenimiento" ${inmueble?.estado === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                        </select>
                        ` : `
                        <div class="flex items-center bg-green-50 px-4 py-2.5 rounded-lg border border-green-200">
                            <svg class="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="text-green-700 font-medium">Disponible</span>
                            <input type="hidden" id="estado" name="estado" value="Disponible">
                        </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Servicios -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Servicios
                </h4>
                <div class="space-y-4">
                    <div>
                        <label for="numeroCFE" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Número de Servicio CFE
                        </label>
                        <input type="text" id="numeroCFE" name="numeroCFE" 
                            class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                            value="${inmueble?.numeroCFE ?? ''}" 
                            placeholder="Ej: 123456789012">
                        <p class="mt-1 text-xs text-gray-500 flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Número de servicio para el pago de luz (aparece en el recibo de CFE).
                        </p>
                    </div>
                </div>
            </div>

            <!-- Colores de Pintura -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Colores de Pintura
                </h4>
                <div id="colores-pintura-container" class="space-y-4">
                    ${coloresPinturaHtml}
                </div>
                <button type="button" id="btn-agregar-color" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Agregar Color
                </button>
            </div>

            <!-- Documentación -->
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentación
                </h4>
                <div class="space-y-2">
                    <label for="urlContrato" class="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        URL del Contrato
                    </label>
                    <input type="url" id="urlContrato" name="urlContrato" 
                        class="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200" 
                        value="${inmueble?.urlContrato ?? ''}" 
                        placeholder="Ej: https://drive.google.com/file/...">
                    <p class="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 12h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enlace a Google Drive, Dropbox, u otro servicio de almacenamiento.
                    </p>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                </button>
                <button type="submit" 
                    class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    ${id ? "Actualizar" : "Registrar"} Inmueble
                </button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    document.getElementById('btn-agregar-color').addEventListener('click', () => {
        const container = document.getElementById('colores-pintura-container');
        const index = container.children.length;
        const newColorEntry = document.createElement('div');
        newColorEntry.className = 'grid grid-cols-1 md:grid-cols-7 gap-2 color-entry mb-2 items-center';
        newColorEntry.innerHTML = `
            <input type="text" name="color_area_${index}" placeholder="Área" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" required>
            <input type="text" name="color_zona_${index}" placeholder="Zona" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <input type="text" name="color_marca_${index}" placeholder="Marca" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <input type="text" name="color_linea_${index}" placeholder="Línea" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <input type="text" name="color_nombre_${index}" placeholder="Nombre del color" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" required>
            <input type="text" name="color_codigo_${index}" placeholder="Código" class="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
            <button type="button" class="text-red-500 hover:text-red-700" onclick="this.parentElement.remove()">Eliminar</button>
        `;
        container.appendChild(newColorEntry);
    });

    // Añadir evento para obtener la ubicación actual
    document.getElementById('btnObtenerUbicacion').addEventListener('click', async () => {
        // Mostrar notificación de espera
        mostrarNotificacion("Obteniendo ubicación...", "info");
        
        try {
            // Usar un servicio de geolocalización por IP como alternativa
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data && data.latitude && data.longitude) {
                document.getElementById('latitud').value = data.latitude;
                document.getElementById('longitud').value = data.longitude;
                mostrarNotificacion("Ubicación aproximada obtenida por IP", "success");
            } else {
                throw new Error("No se pudo obtener la ubicación");
            }
        } catch (error) {
            console.error("Error al obtener ubicación:", error);
            mostrarNotificacion("No se pudo obtener la ubicación. Usando coordenadas predeterminadas.", "warning");
            
            // Usar coordenadas predeterminadas como respaldo
            document.getElementById('latitud').value = "19.4326";
            document.getElementById('longitud').value = "-99.1332";
        }
    });

    document.getElementById('formInmueble').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Asegurarse de que rentaMensual es un número
        data.rentaMensual = parseFloat(data.rentaMensual);
        
        // Convertir latitud y longitud a números si existen
        if (data.latitud) data.latitud = parseFloat(data.latitud);
        if (data.longitud) data.longitud = parseFloat(data.longitud);

        const coloresPintura = [];
        const colorEntries = document.querySelectorAll('.color-entry');
        colorEntries.forEach((entry, index) => {
            const area = formData.get(`color_area_${index}`);
            const zona = formData.get(`color_zona_${index}`);
            const marca = formData.get(`color_marca_${index}`);
            const linea = formData.get(`color_linea_${index}`);
            const color = formData.get(`color_nombre_${index}`);
            const codigo = formData.get(`color_codigo_${index}`);
            if (area && color) {
                coloresPintura.push({ area, zona, marca, linea, color, codigo });
            }
        });
        data.coloresPintura = coloresPintura;

        try {
            if (id) {
                await updateDoc(doc(db, "inmuebles", id), data);
                mostrarNotificacion("Inmueble actualizado con éxito.", 'success');
            } else {
                await addDoc(collection(db, "inmuebles"), data);
                mostrarNotificacion("Inmueble registrado con éxito.", 'success');
            }
            ocultarModal();
            mostrarInmuebles(); // Recargar la lista de inmuebles
         
        } catch (err) {
            console.error("Error al guardar el inmueble:", err);
            mostrarNotificacion("Error al guardar el inmueble.", 'error');
        }
    });
}

/**
 * Función para editar un inmueble, mostrando el formulario.
 * @param {string} id - ID del inmueble a editar.
 */
export async function editarInmueble(id) {
    mostrarFormularioNuevoInmueble(id);
}

export async function mostrarColoresPintura(id) {
    try {
        const docSnap = await getDoc(doc(db, "inmuebles", id));
        if (docSnap.exists()) {
            const inmueble = docSnap.data();
            const colores = inmueble.coloresPintura || [];

            const coloresHtml = colores.map(c => `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 text-base font-bold text-gray-700">${c.area}</td>
                    <td class="px-4 py-2 text-base font-bold text-gray-700">${c.zona || ''}</td>
                    <td class="px-4 py-2 text-base font-bold text-gray-800">${c.marca || '-'}</td>
                    <td class="px-4 py-2 text-base font-bold text-gray-800">${c.linea || '-'}</td>
                    <td class="px-4 py-2 text-base font-bold text-gray-800">${c.color}</td>
                    <td class="px-4 py-2 text-base font-bold text-gray-800 font-mono">${c.codigo || '-'}</td>
                </tr>
            `).join('');

            const modalContent = `
                <div class="px-6 py-4 text-white rounded-t-xl -mx-6 -mt-6 mb-6" style="background-image: linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #14b8a6, #06b6d4, #3b82f6, #8b5cf6, #d946ef);">
                    <h3 class="text-2xl font-bold text-center">Colores de Pintura - ${inmueble.nombre}</h3>
                </div>
                <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-4">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zona</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Línea</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${coloresHtml.length > 0 ? coloresHtml : '<tr><td colspan="6" class="text-center py-4">No hay colores registrados.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="flex justify-end mt-6">
                    <button type="button" onclick="ocultarModal()" class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm">Cerrar</button>
                </div>
            `;

            mostrarModal(modalContent);
        } else {
            mostrarNotificacion("Inmueble no encontrado.", 'error');
        }
    } catch (error) {
        console.error("Error al mostrar los colores:", error);
        mostrarNotificacion("Error al cargar los colores.", 'error');
    }
}

/**
 * Muestra un mapa con la ubicación del inmueble
 * @param {string} inmuebleId - ID del inmueble
 */
export async function mostrarMapaInmueble(inmuebleId) {
    try {
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        if (!inmuebleDoc.exists()) {
            mostrarNotificacion("Inmueble no encontrado", "error");
            return;
        }

        const inmueble = inmuebleDoc.data();
        
        if (!inmueble.latitud || !inmueble.longitud) {
            // Si no hay coordenadas, mostrar un formulario para añadirlas
            mostrarFormularioUbicacion(inmuebleId, inmueble);
            return;
        }
        
        // Validar que las coordenadas sean números válidos
        const lat = parseFloat(inmueble.latitud);
        const lng = parseFloat(inmueble.longitud);
        
        if (isNaN(lat) || isNaN(lng)) {
            mostrarNotificacion("Las coordenadas del inmueble no son válidas", "error");
            return;
        }

        const modalContent = `
            <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-xl font-bold text-center">Ubicación de ${inmueble.nombre}</h3>
            </div>
            
            <div class="mb-4">
                <div class="bg-gray-100 rounded-lg overflow-hidden" style="height: 400px;" id="map-container">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        frameborder="0" 
                        scrolling="no" 
                        marginheight="0" 
                        marginwidth="0" 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=${inmueble.longitud-0.01}%2C${inmueble.latitud-0.01}%2C${inmueble.longitud+0.01}%2C${inmueble.latitud+0.01}&amp;layer=mapnik&amp;marker=${inmueble.latitud}%2C${inmueble.longitud}" 
                        style="border: none;">
                    </iframe>
                </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 mb-6">
                <div class="flex-1 bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-700 mb-2">Dirección</h4>
                    <p class="text-gray-600">${inmueble.direccion || 'No especificada'}</p>
                </div>
                <div class="flex-1 bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-700 mb-2">Coordenadas</h4>
                    <p class="text-gray-600">Latitud: ${inmueble.latitud}</p>
                    <p class="text-gray-600">Longitud: ${inmueble.longitud}</p>
                </div>
            </div>
            
            <div class="flex flex-wrap justify-between gap-2">
                <div class="flex gap-2">
                    <a href="https://www.google.com/maps?q=${inmueble.latitud},${inmueble.longitud}" target="_blank"
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Abrir en Google Maps
                    </a>
                    
                    <button onclick="compartirUbicacion('${inmueble.latitud}', '${inmueble.longitud}', '${inmueble.nombre}')" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Compartir
                    </button>
                </div>
                
                <button onclick="ocultarModal()" 
                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
                    Cerrar
                </button>
            </div>
        `;
        
        mostrarModal(modalContent);
        
    } catch (error) {
        console.error("Error al mostrar el mapa:", error);
        mostrarNotificacion("Error al cargar el mapa", "error");
    }
}

/**
 * Muestra un formulario para ingresar ubicación manualmente
 */
function mostrarFormularioUbicacionManual() {
    const modalContent = `
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Ingresar Ubicación Manualmente</h3>
            <p class="text-center text-blue-100 text-sm">Busca la ubicación en Google Maps y copia las coordenadas</p>
        </div>
        
        <div class="space-y-6">
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div class="flex items-center gap-2 text-yellow-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="font-medium">No se pudo obtener la ubicación automáticamente</p>
                </div>
                <p class="mt-2 text-sm text-yellow-600">Sigue estos pasos para ingresar la ubicación manualmente:</p>
                <ol class="mt-2 text-sm text-yellow-600 list-decimal pl-5 space-y-1">
                    <li>Abre <a href="https://maps.google.com" target="_blank" class="text-blue-600 hover:underline">Google Maps</a> en una nueva pestaña</li>
                    <li>Busca la dirección del inmueble</li>
                    <li>Haz clic derecho en el punto exacto y selecciona "¿Qué hay aquí?"</li>
                    <li>En la parte inferior aparecerán las coordenadas (ej: 19.4326, -99.1332)</li>
                    <li>Copia esos números en los campos de abajo</li>
                </ol>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="latitudManual" class="block text-sm font-medium text-gray-700">Latitud</label>
                    <input type="text" id="latitudManual" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: 19.4326">
                </div>
                <div>
                    <label for="longitudManual" class="block text-sm font-medium text-gray-700">Longitud</label>
                    <input type="text" id="longitudManual" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: -99.1332">
                </div>
            </div>
            
            <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" 
                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
                    Cancelar
                </button>
                
                <button id="btnGuardarUbicacionManual" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Ubicación
                </button>
            </div>
        </div>
    `;
    
    mostrarModal(modalContent);
    
    // Evento para guardar la ubicación manual
    document.getElementById('btnGuardarUbicacionManual').addEventListener('click', () => {
        const latitud = document.getElementById('latitudManual').value.trim();
        const longitud = document.getElementById('longitudManual').value.trim();
        
        if (!latitud || !longitud) {
            mostrarNotificacion("Por favor, ingresa ambas coordenadas", "error");
            return;
        }
        
        // Validar que sean números válidos
        const latNum = parseFloat(latitud);
        const lonNum = parseFloat(longitud);
        
        if (isNaN(latNum) || isNaN(lonNum)) {
            mostrarNotificacion("Las coordenadas deben ser números válidos", "error");
            return;
        }
        
        // Validar rango de coordenadas
        if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
            mostrarNotificacion("Las coordenadas están fuera de rango válido", "error");
            return;
        }
        
        // Asignar valores a los campos del formulario principal
        document.getElementById('latitud').value = latNum;
        document.getElementById('longitud').value = lonNum;
        
        mostrarNotificacion("Ubicación guardada correctamente", "success");
        ocultarModal();
    });
}

/**
 * Muestra un formulario para añadir coordenadas a un inmueble
 * @param {string} inmuebleId - ID del inmueble
 * @param {Object} inmueble - Datos del inmueble
 */
export async function mostrarFormularioUbicacion(inmuebleId, inmueble) {
    const modalContent = `
        <div class="px-4 py-3 bg-yellow-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Añadir Ubicación</h3>
            <p class="text-center text-yellow-100 text-sm">Este inmueble no tiene coordenadas registradas</p>
        </div>
        
        <form id="formUbicacion" class="space-y-6">
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                <div class="flex items-center gap-2 text-yellow-700 mb-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="font-medium">Inmueble: ${inmueble.nombre}</p>
                </div>
                <p class="text-sm text-yellow-600">Para compartir la ubicación, necesitas añadir las coordenadas geográficas.</p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="latitudForm" class="block text-sm font-medium text-gray-700">Latitud</label>
                    <input type="text" id="latitudForm" name="latitud" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: 19.4326" required>
                </div>
                <div>
                    <label for="longitudForm" class="block text-sm font-medium text-gray-700">Longitud</label>
                    <input type="text" id="longitudForm" name="longitud" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: -99.1332" required>
                </div>
            </div>
            
            <div class="flex justify-center">
                <button type="button" id="btnObtenerUbicacionForm" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Obtener Mi Ubicación Actual
                </button>
            </div>
            
            <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" 
                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
                    Cancelar
                </button>
                
                <button type="submit" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Ubicación
                </button>
            </div>
        </form>
    `;
    
    mostrarModal(modalContent);
    
    // Evento para obtener la ubicación actual
    document.getElementById('btnObtenerUbicacionForm').addEventListener('click', () => {
        // Mostrar formulario para ingresar ubicación manualmente
        mostrarFormularioUbicacionManualParaForm(inmuebleId);
    });
    
    // Evento para guardar la ubicación
    document.getElementById('formUbicacion').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const latitud = parseFloat(document.getElementById('latitudForm').value);
        const longitud = parseFloat(document.getElementById('longitudForm').value);
        
        if (isNaN(latitud) || isNaN(longitud)) {
            mostrarNotificacion("Por favor, ingresa coordenadas válidas", "error");
            return;
        }
        
        try {
            await updateDoc(doc(db, "inmuebles", inmuebleId), {
                latitud,
                longitud
            });
            
            mostrarNotificacion("Ubicación guardada correctamente", "success");
            ocultarModal();
            
            // Mostrar el mapa con las nuevas coordenadas
            setTimeout(() => {
                mostrarMapaInmueble(inmuebleId);
            }, 500);
            
        } catch (error) {
            console.error("Error al guardar la ubicación:", error);
            mostrarNotificacion("Error al guardar la ubicación", "error");
        }
    });
}

/**
 * Muestra un formulario para ingresar ubicación manualmente para un inmueble específico
 * @param {string} inmuebleId - ID del inmueble
 */
function mostrarFormularioUbicacionManualParaForm(inmuebleId) {
    const modalContent = `
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Ingresar Ubicación Manualmente</h3>
            <p class="text-center text-blue-100 text-sm">Busca la ubicación en Google Maps y copia las coordenadas</p>
        </div>
        
        <div class="space-y-6">
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div class="flex items-center gap-2 text-yellow-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="font-medium">No se pudo obtener la ubicación automáticamente</p>
                </div>
                <p class="mt-2 text-sm text-yellow-600">Sigue estos pasos para ingresar la ubicación manualmente:</p>
                <ol class="mt-2 text-sm text-yellow-600 list-decimal pl-5 space-y-1">
                    <li>Abre <a href="https://maps.google.com" target="_blank" class="text-blue-600 hover:underline">Google Maps</a> en una nueva pestaña</li>
                    <li>Busca la dirección del inmueble</li>
                    <li>Haz clic derecho en el punto exacto y selecciona "¿Qué hay aquí?"</li>
                    <li>En la parte inferior aparecerán las coordenadas (ej: 19.4326, -99.1332)</li>
                    <li>Copia esos números en los campos de abajo</li>
                </ol>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="latitudManualForm" class="block text-sm font-medium text-gray-700">Latitud</label>
                    <input type="text" id="latitudManualForm" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: 19.4326">
                </div>
                <div>
                    <label for="longitudManualForm" class="block text-sm font-medium text-gray-700">Longitud</label>
                    <input type="text" id="longitudManualForm" 
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                        placeholder="Ej: -99.1332">
                </div>
            </div>
            
            <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" 
                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
                    Cancelar
                </button>
                
                <button id="btnGuardarUbicacionManualForm" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Ubicación
                </button>
            </div>
        </div>
    `;
    
    mostrarModal(modalContent);
    
    // Evento para guardar la ubicación manual
    document.getElementById('btnGuardarUbicacionManualForm').addEventListener('click', async () => {
        const latitud = document.getElementById('latitudManualForm').value.trim();
        const longitud = document.getElementById('longitudManualForm').value.trim();
        
        if (!latitud || !longitud) {
            mostrarNotificacion("Por favor, ingresa ambas coordenadas", "error");
            return;
        }
        
        // Validar que sean números válidos
        const latNum = parseFloat(latitud);
        const lonNum = parseFloat(longitud);
        
        if (isNaN(latNum) || isNaN(lonNum)) {
            mostrarNotificacion("Las coordenadas deben ser números válidos", "error");
            return;
        }
        
        // Validar rango de coordenadas
        if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
            mostrarNotificacion("Las coordenadas están fuera de rango válido", "error");
            return;
        }
        
        try {
            // Guardar directamente en la base de datos
            await updateDoc(doc(db, "inmuebles", inmuebleId), {
                latitud: latNum,
                longitud: lonNum
            });
            
            mostrarNotificacion("Ubicación guardada correctamente", "success");
            ocultarModal();
            
            // Mostrar el mapa con las nuevas coordenadas
            setTimeout(() => {
                mostrarMapaInmueble(inmuebleId);
            }, 500);
            
        } catch (error) {
            console.error("Error al guardar la ubicación:", error);
            mostrarNotificacion("Error al guardar la ubicación", "error");
        }
    });
}

// Hacer las funciones disponibles globalmente
window.mostrarMapaInmueble = mostrarMapaInmueble;
window.mostrarFormularioUbicacion = mostrarFormularioUbicacion;
window.mostrarFormularioUbicacionManual = mostrarFormularioUbicacionManual;
window.mostrarFormularioUbicacionManualParaForm = mostrarFormularioUbicacionManualParaForm;
window.mostrarColoresPintura = mostrarColoresPintura;

/**
 * Muestra el historial de inquilinos de un inmueble en un modal.
 * @param {string} inmuebleId - ID del inmueble.
 * @param {string} inmuebleNombre - Nombre del inmueble.
 */
/**
 * Comparte la ubicación de un inmueble
 * @param {string|number} latitud - Latitud del inmueble
 * @param {string|number} longitud - Longitud del inmueble
 * @param {string} nombre - Nombre del inmueble
 */
export function compartirUbicacion(latitud, longitud, nombre) {
    try {
        // Validar que las coordenadas sean números válidos
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        
        if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Coordenadas inválidas");
        }
        
        // Crear URL de Google Maps
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        
        // Usar directamente el método alternativo de compartir
        copiarAlPortapapeles(mapsUrl);
        mostrarOpcionesCompartir(mapsUrl, nombre);
    } catch (error) {
        console.error("Error al compartir ubicación:", error);
        mostrarNotificacion("Error al compartir: " + error.message, "error");
    }
}

/**
 * Copia un texto al portapapeles
 * @param {string} texto - Texto a copiar
 */
function copiarAlPortapapeles(texto) {
    // Usar la API moderna del portapapeles si está disponible
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
            .then(() => {
                mostrarNotificacion("URL de ubicación copiada al portapapeles", "success");
            })
            .catch(err => {
                console.error("Error al copiar con Clipboard API:", err);
                copiarAlPortapapelesLegacy(texto);
            });
    } else {
        // Método alternativo para navegadores que no soportan Clipboard API
        copiarAlPortapapelesLegacy(texto);
    }
}

/**
 * Método alternativo para copiar al portapapeles
 * @param {string} texto - Texto a copiar
 */
function copiarAlPortapapelesLegacy(texto) {
    // Crear un elemento temporal
    const input = document.createElement('input');
    input.value = texto;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    
    try {
        // Ejecutar el comando de copia
        const exito = document.execCommand('copy');
        if (exito) {
            mostrarNotificacion("URL de ubicación copiada al portapapeles", "success");
        } else {
            throw new Error("No se pudo copiar");
        }
    } catch (err) {
        console.error("Error al copiar:", err);
        mostrarNotificacion("No se pudo copiar la URL. " + texto, "info", 5000);
    }
    
    // Eliminar el elemento temporal
    document.body.removeChild(input);
}

/**
 * Muestra opciones alternativas para compartir cuando la API Web Share no está disponible
 * @param {string} url - URL a compartir
 * @param {string} nombre - Nombre del inmueble
 */
function mostrarOpcionesCompartir(url, nombre) {
    const modalContent = `
        <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">Compartir Ubicación</h3>
            <p class="text-center text-blue-100 text-sm">Ubicación de ${nombre}</p>
        </div>
        
        <div class="mb-4">
            <p class="text-gray-700 mb-2">La URL de la ubicación ha sido copiada al portapapeles. También puedes:</p>
            
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div class="w-full overflow-hidden">
                        <input type="text" value="${url}" readonly class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm overflow-ellipsis">
                    </div>
                    <button id="btnCopiarURL" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg whitespace-nowrap">
                        Copiar
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <a href="https://wa.me/?text=${encodeURIComponent(`Ubicación de ${nombre}: ${url}`)}" target="_blank" 
                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2 text-base font-medium">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Ubicación de ${nombre}`)}" target="_blank" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2 text-base font-medium">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                </a>
            </div>
        </div>
        
        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button onclick="ocultarModal()" 
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors duration-200">
                Cerrar
            </button>
        </div>
    `;
    
    mostrarModal(modalContent);
    
    // Evento para el botón de copiar
    document.getElementById('btnCopiarURL').addEventListener('click', () => {
        copiarAlPortapapeles(url);
    });
}

// Hacer la función disponible globalmente
window.compartirUbicacion = compartirUbicacion;


export async function mostrarHistorialInquilinosInmueble(inmuebleId, inmuebleNombre) {
    try {
        // Buscar todos los inquilinos que han estado asociados a este inmueble
        const inquilinosSnap = await getDocs(query(
            collection(db, "inquilinos"),
            where("inmuebleId", "==", inmuebleId)
        ));

        let historial = [];
        const hoy = new Date().toISOString().slice(0, 10);

        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            // Usa siempre fechaInicioContrato y fechaFinContrato si existen, si no, usa fechaDesocupacion
            const fechaInicio = data.fechaInicioContrato || data.fechaInicio || '';
            const fechaFin = data.fechaFinContrato || data.fechaDesocupacion || '';
            // Considera actual si no hay fecha de fin o si la fecha de fin es en el futuro
            const esActual = !fechaFin || fechaFin === '' || fechaFin === null || fechaFin >= hoy;
            historial.push({
                nombre: data.nombre,
                fechaInicio,
                fechaFin,
                telefono: data.telefono || '',
                correo: data.correo || '',
                actual: esActual
            });
        });

        // Ordenar por fecha de inicio descendente (más reciente primero)
        historial.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

        let tablaHtml = '';
        if (historial.length === 0) {
            tablaHtml = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p class="text-gray-500 text-lg">Este inmueble no tiene historial de inquilinos.</p>
                </div>`;
        } else {
            tablaHtml = `
                <div class="overflow-x-auto rounded-lg shadow border border-gray-200 mt-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-indigo-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Inquilino</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Fecha Inicio</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Fecha Fin</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Teléfono</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider">Correo</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-indigo-700 uppercase tracking-wider">Actual</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${historial.map(h => `
                                <tr class="hover:bg-indigo-50 transition-colors duration-200">
                                    <td class="px-4 py-3 text-sm text-gray-900">${h.nombre}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${h.fechaInicio || '-'}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${h.fechaFin || '-'}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${h.telefono || '-'}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${h.correo || '-'}</td>
                                    <td class="px-4 py-3 text-center">
                                        ${h.actual ? 
                                            '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Actual</span>' : 
                                            '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Anterior</span>'
                                        }
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        mostrarModal(`
            <div class="bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-center gap-3">
                        <svg class="w-8 h-8 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                            <h3 class="text-2xl font-bold text-center">Historial de Inquilinos</h3>
                            <p class="text-center text-cyan-100 mt-1">${inmuebleNombre}</p>
                        </div>
                    </div>
                </div>
            </div>
            ${tablaHtml}
            <div class="flex justify-end mt-6">
                <button onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cerrar
                </button>
            </div>
        `);

    } catch (error) {
        console.error("Error al obtener historial de inquilinos:", error);
        mostrarNotificacion("Error al cargar el historial de inquilinos.", "error");
    }
}

window.mostrarHistorialInquilinosInmueble = mostrarHistorialInquilinosInmueble;


/**
 * Función para eliminar un documento de Firestore.
 * @param {string} coleccion - Nombre de la colección.
 * @param {string} id - ID del documento a eliminar.
 * @param {function} callback - Función a ejecutar después de eliminar (opcional).
 * @param {function} callbackDashboard - Función para actualizar el dashboard (opcional).
 */
export async function eliminarDocumento(coleccion, id, callback, callbackDashboard) {
    if (coleccion === "inmuebles") {
        // Obtén el inmueble antes de eliminar
        const docSnap = await getDoc(doc(db, "inmuebles", id));
        if (!docSnap.exists()) {
            mostrarNotificacion("Inmueble no encontrado.", 'error');
            return;
        }
        const inmueble = docSnap.data();
        if (inmueble.estado === "Ocupado") {
            mostrarNotificacion("No puedes eliminar un inmueble ocupado. Desocúpalo primero.", 'error');
            return;
        }
        // Confirmación antes de eliminar
        if (!confirm("¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.")) {
            return;
        }
    } else {
        // Confirmación genérica para otras colecciones
        if (!confirm("¿Estás seguro de que deseas eliminar este elemento?")) {
            return;
        }
    }

    try {
        await deleteDoc(doc(db, coleccion, id));
        if (typeof callback === 'function') callback();
        if (typeof callbackDashboard === 'function') callbackDashboard();
        mostrarNotificacion("Documento eliminado correctamente.", 'success');
    } catch (error) {
        console.error("Error al eliminar el documento:", error);
        mostrarNotificacion("Error al eliminar el documento.", 'error');
    }
}

window.mostrarPropietarios = async function() {
    try {
        // Obtener lista de propietarios
        const propietariosSnap = await getDocs(collection(db, "propietarios"));
        let propietariosList = [];
        propietariosSnap.forEach(doc => {
            propietariosList.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar por nombre
        propietariosList.sort((a, b) => a.nombre.localeCompare(b.nombre));

        let listaPropietariosHtml = '';
        if (propietariosList.length === 0) {
            listaPropietariosHtml = `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                    <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p class="text-gray-500">No hay propietarios registrados</p>
                </div>`;
        } else {
            listaPropietariosHtml = `
                <div class="space-y-3">
                    ${propietariosList.map(p => `
                        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-gray-800">${p.nombre}</h4>
                                    <p class="text-sm text-gray-600">${p.telefono}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editarPropietario('${p.id}')" 
                                        class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button onclick="eliminarPropietario('${p.id}')" 
                                        class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }

        mostrarModal(`
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-center gap-3">
                        <svg class="w-8 h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                            <h3 class="text-2xl font-bold text-center">Propietarios</h3>
                            <p class="text-center text-indigo-100 mt-1">Administra los propietarios de los inmuebles</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Lista de Propietarios -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Lista de Propietarios
                    </h4>
                    ${listaPropietariosHtml}
                </div>

                <!-- Formulario de Registro -->
                <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Nuevo Propietario
                    </h4>
                    <form id="formPropietario" class="space-y-4">
                        <div>
                            <label for="nombrePropietario" class="block text-sm font-medium text-gray-700">Nombre</label>
                            <input type="text" id="nombrePropietario" name="nombrePropietario" 
                                class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                required>
                        </div>
                        <div>
                            <label for="telefonoPropietario" class="block text-sm font-medium text-gray-700">Teléfono</label>
                            <input type="text" id="telefonoPropietario" name="telefonoPropietario" 
                                class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                required>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="ocultarModal()" 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200">
                                Cerrar
                            </button>
                            <button type="submit" 
                                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200">
                                Registrar Propietario
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `);

        document.getElementById('formPropietario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombrePropietario').value.trim();
            const telefono = document.getElementById('telefonoPropietario').value.trim();
            if (!nombre || !telefono) {
                mostrarNotificacion("Completa todos los campos.", 'error');
                return;
            }
            try {
                await addDoc(collection(db, "propietarios"), { nombre, telefono });
                mostrarNotificacion("Propietario registrado con éxito.", 'success');
                mostrarFormularioNuevoPropietario(); // Recargar la lista
            } catch (err) {
                console.error("Error al registrar propietario:", err);
                mostrarNotificacion("Error al registrar propietario.", 'error');
            }
        });

    } catch (error) {
        console.error("Error al cargar propietarios:", error);
        mostrarNotificacion("Error al cargar los propietarios.", 'error');
    }
};

// Función para editar propietario
window.editarPropietario = async function(id) {
    try {
        const docSnap = await getDoc(doc(db, "propietarios", id));
        if (!docSnap.exists()) {
            mostrarNotificacion("Propietario no encontrado.", 'error');
            return;
        }

        const propietario = docSnap.data();
        mostrarModal(`
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <h3 class="text-2xl font-bold text-center">Editar Propietario</h3>
                </div>
            </div>
            <form id="formEditarPropietario" class="space-y-4">
                <div>
                    <label for="nombrePropietario" class="block text-sm font-medium text-gray-700">Nombre</label>
                    <input type="text" id="nombrePropietario" name="nombrePropietario" 
                        class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                        value="${propietario.nombre}" required>
                </div>
                <div>
                    <label for="telefonoPropietario" class="block text-sm font-medium text-gray-700">Teléfono</label>
                    <input type="text" id="telefonoPropietario" name="telefonoPropietario" 
                        class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                        value="${propietario.telefono}" required>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="ocultarModal()" 
                        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200">
                        Cancelar
                    </button>
                    <button type="submit" 
                        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200">
                        Actualizar Propietario
                    </button>
                </div>
            </form>
        `);

        document.getElementById('formEditarPropietario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombrePropietario').value.trim();
            const telefono = document.getElementById('telefonoPropietario').value.trim();
            
            try {
                await updateDoc(doc(db, "propietarios", id), { nombre, telefono });
                mostrarNotificacion("Propietario actualizado con éxito.", 'success');
                mostrarFormularioNuevoPropietario(); // Recargar la lista
            } catch (err) {
                console.error("Error al actualizar propietario:", err);
                mostrarNotificacion("Error al actualizar propietario.", 'error');
            }
        });

    } catch (error) {
        console.error("Error al cargar datos del propietario:", error);
        mostrarNotificacion("Error al cargar los datos del propietario.", 'error');
    }
};

// Función para eliminar propietario
window.eliminarPropietario = async function(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este propietario?')) {
        try {
            await deleteDoc(doc(db, "propietarios", id));
            mostrarNotificacion("Propietario eliminado con éxito.", 'success');
            mostrarFormularioNuevoPropietario(); // Recargar la lista
        } catch (error) {
            console.error("Error al eliminar propietario:", error);
            mostrarNotificacion("Error al eliminar propietario.", 'error');
        }
    }
};

export async function mostrarHistorialMantenimientoInmueble(inmuebleId, inmuebleNombre) {
    try {
        // Trae los mantenimientos de este inmueble
        const mantenimientosSnap = await getDocs(query(
            collection(db, "mantenimientos"),
            where("inmuebleId", "==", inmuebleId)
        ));

        let historial = [];
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            historial.push({
                descripcion: data.descripcion || '',
                fecha: data.fecha || '',
                costo: data.costo ? parseFloat(data.costo) : 0,
                responsable: data.responsable || '',
                estado: data.estado || ''
            });
        });

        // Ordenar por fecha descendente (más reciente primero)
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        let tablaHtml = '';
        if (historial.length === 0) {
            tablaHtml = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <p class="text-gray-500 text-lg">Este inmueble no tiene historial de mantenimientos.</p>
                </div>`;
        } else {
            tablaHtml = `
                <div class="space-y-3 sm:hidden">
                    ${historial.map(m => `
                        <div class="rounded-lg shadow border border-yellow-100 bg-white p-4 hover:shadow-md transition-shadow duration-200">
                            <div class="font-semibold text-yellow-800 mb-2">${m.descripcion}</div>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div class="text-gray-600">Fecha: <span class="font-medium text-gray-900">${m.fecha}</span></div>
                                <div class="text-gray-600">Costo: <span class="font-semibold text-yellow-700">$${m.costo.toFixed(2)}</span></div>
                                <div class="text-gray-600">Responsable: <span class="font-medium text-gray-900">${m.responsable}</span></div>
                                <div class="text-gray-600">Estado: <span class="font-medium text-gray-900">${m.estado}</span></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="overflow-x-auto rounded-lg shadow border border-gray-200 mt-4 hidden sm:block">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-yellow-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Fecha</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-yellow-800 uppercase tracking-wider">Costo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">Responsable</th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${historial.map(m => `
                                <tr class="hover:bg-yellow-50 transition-colors duration-200">
                                    <td class="px-4 py-3 text-sm text-gray-900">${m.descripcion}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${m.fecha}</td>
                                    <td class="px-4 py-3 text-sm text-right font-medium text-yellow-700">$${m.costo.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900">${m.responsable}</td>
                                    <td class="px-4 py-3 text-center">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            ${m.estado}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        mostrarModal(`
            <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-center gap-3">
                        <svg class="w-8 h-8 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                            <h3 class="text-2xl font-bold text-center">Mantenimientos</h3>
                            <p class="text-center text-yellow-100 mt-1">${inmuebleNombre}</p>
                        </div>
                    </div>
                </div>
            </div>
            ${tablaHtml}
            <div class="flex justify-end mt-6">
                <button onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cerrar
                </button>
            </div>
        `);

    } catch (error) {
        console.error("Error al obtener historial de mantenimientos:", error);
        mostrarNotificacion("Error al cargar el historial de mantenimientos.", 'error');
    }
}

window.mostrarTarjetaInquilino = async function(id) {
    try {
        const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js");
        const { db } = await import('./firebaseConfig.js');
        const docSnap = await getDoc(doc(db, "inquilinos", id));
        if (!docSnap.exists()) {
            mostrarNotificacion("Inquilino no encontrado", "error");
            return;
        }
        const inquilino = docSnap.data();

        // Obtener nombre del inmueble relacionado
        let nombreInmueble = '';
        if (inquilino.inmuebleAsociadoId) {
            const inmuebleSnap = await getDoc(doc(db, "inmuebles", inquilino.inmuebleAsociadoId));
            if (inmuebleSnap.exists()) {
                const inmueble = inmuebleSnap.data();
                nombreInmueble = inmueble.nombre || '';
            }
        }

        // Servicios
        let serviciosHtml = '';
        if (inquilino.pagaServicios && inquilino.servicios && Array.isArray(inquilino.servicios) && inquilino.servicios.length > 0) {
            serviciosHtml = `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div class="flex flex-col">
                        <span class="text-sm font-medium">Servicios:</span>
                        ${inquilino.servicios.map(servicio => 
                            `<span class="text-xs text-gray-600">${servicio.tipo}: ${parseFloat(servicio.monto).toFixed(2)}/mes</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else if (inquilino.pagaServicios && inquilino.tipoServicio && inquilino.montoServicio) {
            serviciosHtml = `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span class="text-sm font-medium">Servicio: ${inquilino.tipoServicio} - ${parseFloat(inquilino.montoServicio).toFixed(2)}/mes</span>
                </div>
            `;
        }

        // Depósito
        let depositoHtml = '';
        if (inquilino.depositoRecibido && inquilino.montoDeposito && inquilino.fechaDeposito) {
            depositoHtml = `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-sm font-medium">Depósito: ${parseFloat(inquilino.montoDeposito).toFixed(2)} (${inquilino.fechaDeposito})</span>
                </div>
            `;
        }

        // Identificación
        let identificacionHtml = '';
        if (inquilino.urlIdentificacion) {
            identificacionHtml = `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <a href="${inquilino.urlIdentificacion}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">Ver Identificación</a>
                </div>
            `;
        }

        // Contrato
        let contratoHtml = '';
        if (inquilino.urlContrato) {
            contratoHtml = `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <a href="${inquilino.urlContrato}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">Ver Contrato</a>
                </div>
            `;
        }

        // Tarjeta completa
        mostrarModal(`
            <div class="bg-white rounded-xl shadow-lg border-l-4 ${inquilino.activo ? 'border-green-500' : 'border-red-500'} overflow-hidden">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">${inquilino.nombre}</h3>
                            <span class="text-sm font-medium text-gray-600">${inquilino.telefono || ''}</span>
                        </div>
                        <span class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm ${inquilino.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${inquilino.activo ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'}" />
                        </svg>
                            ${inquilino.activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                    <div class="space-y-3 mb-6">
                        ${nombreInmueble ? `
                        <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span class="text-sm font-medium">Inmueble: ${nombreInmueble}</span>
                        </div>
                        ` : ''}
                        <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span class="text-sm font-medium">${inquilino.direccion || '-'}</span>
                        </div>
                        ${inquilino.fechaInicioContrato ? `
                        <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span class="text-sm font-medium">Contrato: ${inquilino.fechaInicioContrato} a ${inquilino.fechaFinContrato || '-'}</span>
                        </div>
                        ` : ''}
                        ${inquilino.correo ? `
                        <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v1a4 4 0 01-8 0v-1" />
                            </svg>
                            <span class="text-sm font-medium">${inquilino.correo}</span>
                        </div>
                        ` : ''}
                        ${serviciosHtml}
                        ${depositoHtml}
                        ${identificacionHtml}
                        ${contratoHtml}
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                        <button onclick="editarInquilino('${id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow transition-all duration-200">Editar</button>
                        <button onclick="mostrarHistorialPagosInquilino('${id}')" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow transition-all duration-200">Pagos</button>
                        <button onclick="mostrarMobiliarioAsignadoInquilino('${id}', '${inquilino.nombre}')" class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow transition-all duration-200">Mobiliario</button>
                        <button onclick="confirmarDesocupacionInquilino('${id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow transition-all duration-200">Desocupar</button>
                    </div>
                </div>
                <div class="flex justify-end mt-6">
                    <button onclick="ocultarModal()" class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cerrar
                    </button>
                </div>
            </div>
        `);
    } catch (error) {
        mostrarNotificacion("Error al cargar el inquilino.", "error");
    }
};

/**
 * Formatea una fecha (YYYY-MM-DD) a un formato más legible (DD de Mes de YYYY).
 * @param {string} fechaString - La fecha en formato YYYY-MM-DD.
 * @returns {string} La fecha formateada o 'Fecha no válida' si la entrada es incorrecta.
 */
function formatearFecha(fechaString) {
    if (!fechaString || typeof fechaString !== 'string') {
        return 'Fecha no especificada';
    }
    const partes = fechaString.split('-');
    if (partes.length !== 3) {
        return fechaString; // Devuelve el string original si no tiene el formato esperado
    }
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    if (isNaN(fecha.getTime())) {
        return 'Fecha no válida';
    }
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fecha.toLocaleDateString('es-ES', opciones);
}

/**
 * Muestra el historial de inquilinos de un inmueble específico en un modal.
 * @param {string} inmuebleId - El ID del inmueble a consultar.
 * @param {string} nombreInmueble - El nombre del inmueble para mostrar en el título.
 */
export async function mostrarHistorialInquilinos(inmuebleId, nombreInmueble) {
    try {
        mostrarLoader();

        // Consultar todos los inquilinos que han estado asociados a este inmueble
        const q = query(collection(db, "inquilinos"), where("inmuebleAsociadoId", "==", inmuebleId));
        const inquilinosSnap = await getDocs(q);

        let inquilinoActual = null;
        const historialInquilinos = [];

        inquilinosSnap.forEach(doc => {
            const inquilino = { id: doc.id, ...doc.data() };
            if (inquilino.activo) {
                inquilinoActual = inquilino;
            } else {
                historialInquilinos.push(inquilino);
            }
        });

        // Ordenar el historial por fecha de llegada (más recientes primero)
        historialInquilinos.sort((a, b) => new Date(b.fechaLlegada) - new Date(a.fechaLlegada));

        let contenidoHTML = `
            <div class="px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative modal-header-responsive">
                <button onclick="ocultarModal()" class="absolute top-3 right-3 text-white hover:text-gray-200 transition-colors duration-200 focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 class="text-2xl font-bold text-center modal-title-responsive">Historial de Inquilinos</h3>
                <p class="text-center text-gray-300 mt-1">${nombreInmueble}</p>
            </div>
            <div class="space-y-6 modal-responsive-padding">
        `;

        // Sección para el Inquilino Actual
        contenidoHTML += `<div><h4 class="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Inquilino Actual</h4>`;
        if (inquilinoActual) {
            contenidoHTML += `
                <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-md">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="font-bold text-green-800">${inquilinoActual.nombre}</p>
                            <p class="text-sm text-gray-600">Tel: ${inquilinoActual.telefono || 'No disponible'}</p>
                            <p class="text-sm text-gray-600">Llegada: ${formatearFecha(inquilinoActual.fechaLlegada)}</p>
                        </div>
                        <span class="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">OCUPANDO</span>
                    </div>
                </div>
            `;
        } else {
            contenidoHTML += `<p class="text-center text-gray-500 bg-gray-50 p-4 rounded-lg">Este inmueble está actualmente disponible.</p>`;
        }
        contenidoHTML += `</div>`;

        // Sección para el Historial de Inquilinos
        contenidoHTML += `<div><h4 class="text-lg font-semibold text-gray-800 mb-3 mt-6 border-b pb-2">Historial</h4>`;
        if (historialInquilinos.length > 0) {
            contenidoHTML += `<div class="space-y-3">`;
            historialInquilinos.forEach(inquilino => {
                contenidoHTML += `
                    <div class="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div>
                            <p class="font-semibold text-gray-700">${inquilino.nombre}</p>
                            <p class="text-xs text-gray-500">Periodo: ${formatearFecha(inquilino.fechaLlegada)} - ${inquilino.fechaSalida ? formatearFecha(inquilino.fechaSalida) : 'Presente'}</p>
                        </div>
                        <span class="text-xs font-medium text-gray-500">Finalizado</span>
                    </div>
                `;
            });
            contenidoHTML += `</div>`;
        } else {
            contenidoHTML += `<p class="text-center text-gray-500 bg-gray-50 p-4 rounded-lg">No hay historial de inquilinos anteriores.</p>`;
        }
        contenidoHTML += `</div></div>`;

        mostrarModal(contenidoHTML);

    } catch (error) {
        console.error("Error al mostrar el historial de inquilinos:", error);
        mostrarNotificacion("No se pudo cargar el historial.", "error");
    } finally {
        ocultarLoader();
    }
}