// js/inmuebles.js
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { mostrarHistorialPagosInmueble } from './pagos.js'; // Importar para mostrar historial de pagos
import { mostrarPropietarios, editarPropietario, eliminarPropietario } from './propietarios.js'; // Importar funciones de propietarios

import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm"; // Si usas módulos

function generarHTMLFichaInquilinoCompleta(inquilino, pagosDepositoMap, desperfectosPorInquilino) {
    const deposito = pagosDepositoMap.get(inquilino.id);
    const tieneDesperfectos = desperfectosPorInquilino.has(inquilino.id);

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

    return `
    <div class="ficha-inquilino-content rounded-xl overflow-hidden relative">
        <div class="ficha-inquilino-header"></div>
        <button onclick="ocultarModal()" class="absolute top-2 right-2 text-gray-500 hover:text-gray-800 bg-white/50 hover:bg-white/70 rounded-full p-2 z-10">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div class="p-6 pt-16">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-gray-800">${inquilino.nombre}</h3>
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
                ${inquilino.nombreInmueble ? `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="text-sm font-medium">Inmueble: ${inquilino.nombreInmueble}</span>
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="text-sm font-medium">Contrato: ${inquilino.fechaInicioContrato} a ${inquilino.fechaFinContrato || '-'}</span>
                </div>
                ` : ''}
                ${inquilino.fechaOcupacion ? `
                    <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-sm font-medium">Inicio Pagos: ${inquilino.fechaOcupacion}</span>
                    </div>
                ` : ''}
                ${inquilino.fechaLlegada ? `
                    <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="text-sm font-medium">Firma: ${inquilino.fechaLlegada}</span>
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
                ${deposito ? `
                <div class="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-sm font-medium">Depósito: ${parseFloat(deposito.monto).toFixed(2)} (${deposito.fecha})</span>
                </div>
                ` : ''}
            </div>
        </div>
    </div>
    `;
}

export async function mostrarFichaInquilinoModal(inquilinoId) {
    try {
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        if (!inquilinoDoc.exists()) {
            mostrarNotificacion("Inquilino no encontrado", "error");
            return;
        }
        const inquilino = { id: inquilinoDoc.id, ...inquilinoDoc.data() };

        if (inquilino.inmuebleAsociadoId) {
            const inmuebleDoc = await getDoc(doc(db, "inmuebles", inquilino.inmuebleAsociadoId));
            const inmueble = inmuebleDoc.exists() ? inmuebleDoc.data() : null;
            inquilino.nombreInmueble = inmueble ? inmueble.nombre : "No asignado";
        } else {
            inquilino.nombreInmueble = "No asignado";
        }

        const pagosSnap = await getDocs(query(collection(db, "pagos"), where("inquilinoId", "==", inquilinoId)));
        let pagosDepositoMap = new Map();
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.tipo === "deposito") {
                pagosDepositoMap.set(pago.inquilinoId, { monto: pago.montoTotal, fecha: pago.fechaRegistro });
            }
        });

        const desperfectosSnap = await getDocs(query(collection(db, "desperfectos"), where("inquilinoId", "==", inquilinoId)));
        const desperfectosPorInquilino = new Map();
        desperfectosSnap.forEach(doc => {
            const desperfecto = doc.data();
            if (!desperfectosPorInquilino.has(desperfecto.inquilinoId)) {
                desperfectosPorInquilino.set(desperfecto.inquilinoId, []);
            }
            desperfectosPorInquilino.get(desperfecto.inquilinoId).push({ id: doc.id, ...desperfecto });
        });

        const fichaHTML = generarHTMLFichaInquilinoCompleta(inquilino, pagosDepositoMap, desperfectosPorInquilino);
        mostrarModal(fichaHTML);

    } catch (error) {
        console.error("Error al mostrar la ficha del inquilino:", error);
        mostrarNotificacion("Error al cargar los datos del inquilino.", "error");
    }
}
window.mostrarFichaInquilinoModal = mostrarFichaInquilinoModal;

/**
 * Muestra la lista de inmuebles en forma de tarjetas.
 */
export async function mostrarInmuebles(estadoFiltro = null, tipoFiltro = null) {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inmuebles.", 'error');
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
                ? `<button onclick="window.mostrarFichaInquilinoModal('${inmueble.inquilinoActual.id}')" class="text-indigo-600 hover:underline font-semibold">${inmueble.inquilinoActual.nombre}</button>`
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
    }
}

export function mostrarFormularioNuevoInmueble(id = null) {
    // ... (el resto de la función)
}

export function editarInmueble(id) {
    mostrarFormularioNuevoInmueble(id);
}

export function eliminarDocumento(coleccion, id, callback, callbackDashboard) {
    // ... (el resto de la función)
}

export function mostrarHistorialInquilinos(inmuebleId, inmuebleNombre) {
    // ... (el resto de la función)
}

export function mostrarMapaInmueble(inmuebleId) {
    // ... (el resto de la función)
}

export function compartirUbicacion(latitud, longitud, nombre) {
    // ... (el resto de la función)
}

export function mostrarColoresPintura(id) {
    // ... (el resto de la función)
}

export function mostrarHistorialMantenimientoInmueble(inmuebleId, inmuebleNombre) {
    // ... (el resto de la función)
}
