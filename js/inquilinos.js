// js/inquilinos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarLoader, ocultarLoader, mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { updateDoc as updateDocInmueble } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"; // Alias para evitar conflicto
import { obtenerMesesAdeudadosHistorico, mostrarFormularioNuevoPago, mostrarFormularioPagoServicio, mostrarFormularioPagoMobiliario, consolidarPagosAntiguos } from './pagos.js';
import { mostrarTotalDesperfectosInquilino } from './desperfectos.js';

// Nueva función para calcular totales
async function calcularTotalesInquilino(inquilinoId) {
    const inquilinoRef = doc(db, "inquilinos", inquilinoId);
    const inquilinoSnap = await getDoc(inquilinoRef);

    if (!inquilinoSnap.exists()) {
        return { totalGeneral: 0, totalRenta: 0, totalServicios: 0, totalMobiliario: 0 };
    }

    const inquilino = inquilinoSnap.data();
    let totalRenta = 0;
    let totalServicios = 0;
    let totalMobiliario = 0;

    // Calcular renta
    if (inquilino.inmuebleAsociadoId) {
        const inmuebleRef = doc(db, "inmuebles", inquilino.inmuebleAsociadoId);
        const inmuebleSnap = await getDoc(inmuebleRef);
        if (inmuebleSnap.exists()) {
            totalRenta = parseFloat(inmuebleSnap.data().rentaMensual) || 0;
        }
    }

    // Calcular servicios
    if (inquilino.pagaServicios && inquilino.servicios) {
        totalServicios = inquilino.servicios.reduce((acc, servicio) => acc + (parseFloat(servicio.monto) || 0), 0);
    }

    // Calcular mobiliario
    const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
    mobiliarioSnap.forEach(doc => {
        const mob = doc.data();
        if (Array.isArray(mob.asignaciones)) {
            const asignacion = mob.asignaciones.find(a => a.inquilinoId === inquilinoId && a.activa === true && a.cantidad > 0);
            if (asignacion) {
                totalMobiliario += (parseFloat(mob.costoRenta) || 0) * asignacion.cantidad;
            }
        }
    });

    const totalGeneral = totalRenta + totalServicios + totalMobiliario;

    return { totalGeneral, totalRenta, totalServicios, totalMobiliario };
}


// Variables globales para el manejo de modales anidados
window.vieneDeAdeudos = false;
window.adeudosModalContent = '';


// Hacer la función accesible globalmente para los handlers `onclick`
window.mostrarTotalDesperfectosInquilino = mostrarTotalDesperfectosInquilino;

// Variables para el caché de inquilinos
let cachedInquilinosHTML = null;
let inquilinosCacheTimestamp = null;
let cachedInquilinosFilter = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos

export function limpiarCacheInquilinos() {
    cachedInquilinosHTML = null;
    inquilinosCacheTimestamp = null;
    cachedInquilinosFilter = null;
    console.log("Caché de inquilinos limpiado.");
}

function adjuntarListenersInquilinos() {
    const filtroActivo = document.getElementById('filtroActivo');
    if (filtroActivo) {
        filtroActivo.addEventListener('change', function () {
            mostrarInquilinos(this.value);
        });
    }

    const busquedaInquilino = document.getElementById('busquedaInquilino');
    if (busquedaInquilino) {
        busquedaInquilino.addEventListener('input', function () {
            const busqueda = this.value.toLowerCase();
            const tarjetas = document.querySelectorAll('#listaInquilinos > div');

            tarjetas.forEach(tarjeta => {
                const nombre = tarjeta.querySelector('h3')?.textContent.toLowerCase() || '';
                const telefono = tarjeta.querySelector('.text-gray-600 .text-sm')?.textContent.toLowerCase() || '';
                const inmueble = tarjeta.querySelectorAll('.text-gray-600 .text-sm')[1]?.textContent.toLowerCase() || '';

                if (nombre.includes(busqueda) || telefono.includes(busqueda) || inmueble.includes(busqueda)) {
                    tarjeta.style.display = '';
                } else {
                    tarjeta.style.display = 'none';
                }
            });
        });
    }

    document.querySelectorAll('.total-pill-trigger').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const breakdownId = pill.id.replace('total-pill-', 'total-breakdown-');
            const breakdownPopup = document.getElementById(breakdownId);

            document.querySelectorAll('.total-breakdown-popup').forEach(popup => {
                if (popup.id !== breakdownId) {
                    popup.classList.add('hidden');
                }
            });

            if (breakdownPopup) {
                breakdownPopup.classList.toggle('hidden');
            }
        });
    });

    if (!window.inquilinosGlobalClickListenerAttached) {
        document.addEventListener('click', (e) => {
            const openPopups = document.querySelectorAll('.total-breakdown-popup:not(.hidden)');
            openPopups.forEach(popup => {
                const pillId = popup.id.replace('total-breakdown-', 'total-pill-');
                const pill = document.getElementById(pillId);
                if (!popup.contains(e.target) && (!pill || !pill.contains(e.target))) {
                    popup.classList.add('hidden');
                }
            });
        });
        window.inquilinosGlobalClickListenerAttached = true;
    }

    const lista = document.getElementById('listaInquilinos');
    if (lista) {
        Sortable.create(lista, {
            animation: 150,
            handle: '.handle-move',
            onEnd: async function (evt) {
                const ids = Array.from(lista.children).map(card => card.dataset.id);
                for (let i = 0; i < ids.length; i++) {
                    await updateDoc(doc(db, "inquilinos", ids[i]), { orden: i });
                }
                mostrarNotificacion("Orden de inquilinos actualizado.", "success");
                limpiarCacheInquilinos();
            }
        });
    }
}

/**
 * Muestra la lista de inquilinos en forma de tarjetas.
 */
export async function mostrarInquilinos(filtroActivo = "Todos") {
    mostrarLoader();
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inquilinos.", 'error');
        ocultarLoader();
        return;
    }

    // --- Lógica de Caché ---
    if (cachedInquilinosHTML && inquilinosCacheTimestamp && cachedInquilinosFilter === filtroActivo && (new Date() - inquilinosCacheTimestamp < CACHE_DURATION_MS)) {
        console.log("Cargando inquilinos desde la caché.");
        contenedor.innerHTML = cachedInquilinosHTML;
        adjuntarListenersInquilinos();
        ocultarLoader();
        return;
    }

    try {
        // Obtener todos los desperfectos de una vez para optimizar
        const desperfectosSnap = await getDocs(collection(db, "desperfectos"));
        const desperfectosPorInquilino = new Map();
        desperfectosSnap.forEach(doc => {
            const desperfecto = doc.data();
            if (desperfecto.inquilinoId) {
                if (!desperfectosPorInquilino.has(desperfecto.inquilinoId)) {
                    desperfectosPorInquilino.set(desperfecto.inquilinoId, []);
                }
                desperfectosPorInquilino.get(desperfecto.inquilinoId).push({ id: doc.id, ...desperfecto });
            }
        });

        // Obtener todo el mobiliario de una vez
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        const mobiliarioPorInquilino = new Map();
        mobiliarioSnap.forEach(doc => {
            const mob = doc.data();
            if (Array.isArray(mob.asignaciones)) {
                mob.asignaciones.forEach(a => {
                    if (a.inquilinoId && a.activa === true && a.cantidad > 0) {
                        if (!mobiliarioPorInquilino.has(a.inquilinoId)) {
                            mobiliarioPorInquilino.set(a.inquilinoId, []);
                        }
                        mobiliarioPorInquilino.get(a.inquilinoId).push({ id: doc.id, ...mob });
                    }
                });
            }
        });

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles")); // Para mapear nombres de inmuebles

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data());
        });

        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = data.inmuebleAsociadoId ? (inmueblesMap.get(data.inmuebleAsociadoId)?.nombre || 'Inmueble Desconocido') : 'No Asignado';
            inquilinosList.push({ id: doc.id, ...data, nombreInmueble });
        });

        // Ordenar los inquilinos para que los activos salgan primero
        inquilinosList.sort((a, b) => (b.activo - a.activo) || a.nombre.localeCompare(b.nombre));

        // Filtrar por estado si se solicita
        if (filtroActivo === "Activos") {
            inquilinosList = inquilinosList.filter(i => i.activo);
        } else if (filtroActivo === "Inactivos") {
            inquilinosList = inquilinosList.filter(i => !i.activo);
        }

        // ObtÃ©n todos los pagos una sola vez
        const pagosSnap = await getDocs(collection(db, "pagos"));
        let pagosDepositoMap = new Map();
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.tipo === "deposito" && pago.inquilinoId) {
                pagosDepositoMap.set(pago.inquilinoId, { monto: pago.montoTotal, fecha: pago.fechaRegistro });
            }
        });

        let tarjetasInquilinosHtml = "";
        if (inquilinosList.length === 0) {
            tarjetasInquilinosHtml = `<p class="text-gray-500 text-center py-8">No hay inquilinos registrados.</p>`;
        } else {
            for (const inquilino of inquilinosList) {
                const tieneDesperfectos = desperfectosPorInquilino.has(inquilino.id);
                const totales = await calcularTotalesInquilino(inquilino.id);

                tarjetasInquilinosHtml += `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${inquilino.activo ? 'border-green-500' : 'border-red-500'} overflow-hidden transform hover:-translate-y-1" data-id="${inquilino.id}">
                        <div class="p-4 sm:p-5 md:p-6">
                            <div class="flex justify-between items-start mb-4">
                                <div class="flex-grow">
                                    <div class="flex items-center flex-wrap">
                                        <h3 class="text-lg sm:text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">${inquilino.nombre}</h3>
                                        
                                        <div class="relative inline-block ml-3">
                                            <span id="total-pill-${inquilino.id}" class="total-pill-trigger cursor-pointer inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 border border-indigo-400/30" title="Clic para ver desglose mensual">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ${totales.totalGeneral.toFixed(2)}/mes
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col items-end flex-shrink-0">
                                    <span class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm ${inquilino.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${inquilino.activo ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'}" />
                                        </svg>
                                        ${inquilino.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                    ${tieneDesperfectos ? `
                                        <span onclick="window.mostrarTotalDesperfectosInquilino('${inquilino.id}')" class="cursor-pointer mt-2 breathing-icon" title="Este inquilino tiene desperfectos registrados">
                                            <svg class="w-7 h-7 text-red-500 hover:text-red-600 transition-all duration-200 transform hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div id="total-breakdown-${inquilino.id}" class="total-breakdown-popup hidden mt-4 mb-4 w-full bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden transition-all duration-300">
                                <div class="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    <h4 class="font-bold text-gray-800 text-sm">Desglose Mensual</h4>
                                </div>
                                <div class="p-4 space-y-3">
                                    <div class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <span class="flex items-center font-medium text-gray-700 text-sm">
                                            <div class="p-1 bg-green-100 rounded mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            </div>
                                            Renta
                                        </span>
                                        <span class="font-bold text-gray-800">$${totales.totalRenta.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <span class="flex items-center font-medium text-gray-700 text-sm">
                                            <div class="p-1 bg-amber-100 rounded mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            </div>
                                            Servicios
                                        </span>
                                        <span class="font-bold text-gray-800">$${totales.totalServicios.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <span class="flex items-center font-medium text-gray-700 text-sm">
                                            <div class="p-1 bg-purple-100 rounded mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19V8h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2zm-1-9h16" /></svg>
                                            </div>
                                            Mobiliario
                                        </span>
                                        <span class="font-bold text-gray-800">$${totales.totalMobiliario.toFixed(2)}</span>
                                    </div>
                                    <div class="border-t border-gray-100 mt-2 pt-3 flex justify-between items-center">
                                        <span class="font-bold text-gray-900 text-sm">Total Mensual</span>
                                        <span class="font-extrabold text-lg text-indigo-600">$${totales.totalGeneral.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-3 mb-6">
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span class="text-sm font-medium">${inquilino.telefono}</span>
                                </div>

                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span class="text-sm font-medium">${inquilino.nombreInmueble}</span>
                                </div>

                                ${inquilino.depositoRecibido && inquilino.montoDeposito && inquilino.fechaDeposito ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span class="text-sm font-medium">Depósito: ${parseFloat(inquilino.montoDeposito).toFixed(2)} (${inquilino.fechaDeposito})</span>
                                    </div>
                                ` : ''}

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    ${inquilino.fechaOcupacion ? `
                                        <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span class="text-sm font-medium">Inicio Pagos: ${inquilino.fechaOcupacion}</span>
                                        </div>
                                    ` : ''}
                                    ${inquilino.fechaDesocupacion ? `
                                        <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-red-50 p-2 rounded-lg col-span-1 sm:col-span-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span class="text-sm font-medium text-red-700">Fecha Desocupación: ${inquilino.fechaDesocupacion}</span>
                                        </div>
                                    ` : (inquilino.fechaLlegada ? `
                                        <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span class="text-sm font-medium">Firma: ${inquilino.fechaLlegada}</span>
                                        </div>
                                    ` : '')}
                                </div>

                                ${inquilino.urlIdentificacion ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <a href="${inquilino.urlIdentificacion}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">Ver Identificación</a>
                                    </div>
                                ` : ''}
                                
                                ${inquilino.pagaServicios && inquilino.servicios && Array.isArray(inquilino.servicios) && inquilino.servicios.length > 0 ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
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
                                ` : ''}
                                
                                ${inquilino.pagaServicios && inquilino.tipoServicio && inquilino.montoServicio && (!inquilino.servicios || !Array.isArray(inquilino.servicios)) ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span class="text-sm font-medium">Servicio: ${inquilino.tipoServicio} - ${parseFloat(inquilino.montoServicio).toFixed(2)}/mes</span>
                                    </div>
                                ` : ''}
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <button onclick="mostrarHistorialPagosInquilino('${inquilino.id}')" 
                                    title="Ver historial de pagos del inquilino"
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Pagos</span>
                                </button>
                                ${inquilino.activo ?
                        `<button onclick="confirmarDesocupacionInquilino('${inquilino.id}')" 
                                        title="Marcar inquilino como desocupado"
                                        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        <span>Desocupar</span>
                                    </button>` :
                        `<button onclick="confirmarReactivacionInquilino('${inquilino.id}')" 
                                        title="Reactivar inquilino inactivo"
                                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Reactivar</span>
                                    </button>`
                    }
                                <button onclick="editarInquilino('${inquilino.id}')" 
                                    title="Editar información del inquilino"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Editar</span>
                                </button>
                                <button onclick="eliminarDocumento('inquilinos', '${inquilino.id}', () => { limpiarCacheInquilinos(); mostrarInquilinos(); })" 
                                    title="Eliminar este inquilino"
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Eliminar</span>
                                </button>
                                <button onclick="mostrarHistorialAbonosInquilino('${inquilino.id}')" 
                                    title="Ver historial de abonos del inquilino"
                                    class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Abonos</span>
                                </button>
                                <button onclick="mostrarSaldoFavorInquilino('${inquilino.id}')" 
                                    title="Ver saldo a favor del inquilino"
                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Saldo</span>
                                </button>
                                <button onclick="mostrarMobiliarioAsignadoInquilino('${inquilino.id}', '${inquilino.nombre}')" 
                                    title="Ver mobiliario asignado al inquilino"
                                    class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19V8h14v11a2 2 0 01-2 2H7a2 2 0 01-2-2zm-1-9h16" />
                                    </svg>
                                    <span>Mobiliario</span>
                                </button>
                            </div>
                            <!-- Botón de Herramienta Avanzada -->
                             <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                <button onclick="iniciarConsolidacion('${inquilino.id}', '${inquilino.nombre}')" 
                                    class="text-xs text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors py-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Congelar Historial (Reparar Recibos)
                                </button>
                                <button onclick="explicarConsolidacion()" class="text-gray-400 hover:text-blue-500 transition-colors" title="¿Qué es esto?">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="handle-move cursor-move text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors duration-200" title="Arrastrar para reordenar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                <span class="text-xs">Reordenar</span>
                            </span>
                            <span id="badge-adeudos-${inquilino.id}" class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">Cargando adeudos...</span>
                        </div>
                    </div>
                `;
            }
        }

        contenedor.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Inquilinos</h2>
                    <p class="text-sm text-gray-600 mt-1">Administra los inquilinos y sus contratos</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3">
                    <div class="flex flex-col">
                        <label for="busquedaInquilino" class="text-xs text-gray-600 mb-1">Buscar inquilino:</label>
                        <div class="relative">
                            <input type="text" id="busquedaInquilino" placeholder="Buscar por nombre o teléfono..." 
                                class="form-control pl-8 pr-2 py-2 w-72">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <select id="filtroActivo" class="form-control">
                        <option value="Todos" ${filtroActivo === "Todos" ? "selected" : ""}>Todos los inquilinos</option>
                        <option value="Activos" ${filtroActivo === "Activos" ? "selected" : ""}>Inquilinos activos</option>
                        <option value="Inactivos" ${filtroActivo === "Inactivos" ? "selected" : ""}>Inquilinos inactivos</option>
                    </select>
                    <button onclick="mostrarFormularioNuevoInquilino()" 
                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 hover:shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Nuevo Inquilino
                    </button>
                    <button onclick="generarPDFInquilinos()" 
                        class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 hover:shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar PDF
                    </button>
                </div>
            </div>
            <div id="listaInquilinos" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                ${tarjetasInquilinosHtml}
            </div>
        `;

        // Agrega los event listeners despuÃ©s de asignar el innerHTML
        adjuntarListenersInquilinos();

        // Actualizar badges de adeudos
        for (const inquilino of inquilinosList) {
            if (!inquilino.fechaOcupacion || !inquilino.inmuebleAsociadoId) continue;

            // Se obtienen todos los pagos una sola vez
            const pagosQuery = query(collection(db, "pagos"), where("inquilinoId", "==", inquilino.id));
            const pagosInquilinoSnap = await getDocs(pagosQuery);
            const pagosMap = new Map();
            pagosInquilinoSnap.forEach(doc => {
                const pago = doc.data();
                const clave = `${pago.mesCorrespondiente}-${pago.anioCorrespondiente}`;
                pagosMap.set(clave, pago);
            });

            const inmuebleAsociado = inmueblesMap.get(inquilino.inmuebleAsociadoId);
            const rentaMensual = inmuebleAsociado ? parseFloat(inmuebleAsociado.rentaMensual) : 0;

            let totalAdeudoRenta = 0;
            let totalAdeudoServicios = 0;
            let totalAdeudoMobiliario = 0;

            const todosLosAdeudos = [];
            const parts = inquilino.fechaOcupacion.split('-');
            const yearOcupacion = parseInt(parts[0], 10);
            const monthOcupacion = parseInt(parts[1], 10) - 1;
            const dayOcupacion = parseInt(parts[2], 10);

            const fechaInicioOcupacion = new Date(yearOcupacion, monthOcupacion, dayOcupacion);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const fechaFinCalculo = inquilino.fechaDesocupacion ? new Date(inquilino.fechaDesocupacion) : hoy;
            fechaFinCalculo.setHours(0, 0, 0, 0);

            let fechaIteracion = new Date(fechaInicioOcupacion.getFullYear(), fechaInicioOcupacion.getMonth(), 1);
            const diaDePago = fechaInicioOcupacion.getDate();

            while (fechaIteracion <= fechaFinCalculo) {
                const mes = fechaIteracion.toLocaleString('es-MX', { month: 'long' });
                const anio = fechaIteracion.getFullYear();
                const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
                const clavePago = `${mesCapitalizado}-${anio}`;
                const pagoRegistrado = pagosMap.get(clavePago);

                let adeudoRenta = false;
                let adeudoServicios = false;

                const esMesActualIteracion = fechaIteracion.getMonth() === hoy.getMonth() && fechaIteracion.getFullYear() === hoy.getFullYear();
                const isBeforeOccupationMonth = fechaIteracion.getFullYear() < fechaInicioOcupacion.getFullYear() ||
                    (fechaIteracion.getFullYear() === fechaInicioOcupacion.getFullYear() &&
                        fechaIteracion.getMonth() < fechaInicioOcupacion.getMonth());

                if (!isBeforeOccupationMonth) {
                    const shouldCheckRent = !esMesActualIteracion || (esMesActualIteracion && hoy.getDate() >= diaDePago);
                    if (shouldCheckRent && (!pagoRegistrado || pagoRegistrado.estado !== 'pagado')) {
                        adeudoRenta = true;
                        if (rentaMensual > 0) {
                            totalAdeudoRenta += rentaMensual;
                        }
                    }

                    const shouldCheckServices = !esMesActualIteracion || (esMesActualIteracion && hoy.getDate() >= diaDePago);
                    if (shouldCheckServices && inquilino.pagaServicios && inquilino.servicios && inquilino.servicios.length > 0) {
                        for (const servicio of inquilino.servicios) {
                            const servicioKey = servicio.tipo.toLowerCase();
                            if (!pagoRegistrado || !pagoRegistrado.serviciosPagados || !pagoRegistrado.serviciosPagados[servicioKey]) {
                                adeudoServicios = true;
                                totalAdeudoServicios += parseFloat(servicio.monto || 0);
                            }
                        }
                    }
                }

                if (adeudoRenta || adeudoServicios) {
                    todosLosAdeudos.push({
                        mes: mesCapitalizado,
                        anio: anio,
                        rentaPendiente: adeudoRenta,
                        serviciosPendientes: adeudoServicios
                    });
                }

                fechaIteracion.setMonth(fechaIteracion.getMonth() + 1);
            }

            const adeudosFinales = todosLosAdeudos;

            const adeudosMobiliario = [];
            const mobiliarioAsignado = mobiliarioPorInquilino.get(inquilino.id) || [];
            if (mobiliarioAsignado.length > 0) {
                let fechaIteracionMobiliario = new Date(fechaInicioOcupacion.getFullYear(), fechaInicioOcupacion.getMonth(), 1);
                while (fechaIteracionMobiliario <= fechaFinCalculo) {
                    const mes = fechaIteracionMobiliario.toLocaleString('es-MX', { month: 'long' });
                    const anio = fechaIteracionMobiliario.getFullYear();
                    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
                    const clavePago = `${mesCapitalizado}-${anio}`;
                    const pagoRegistrado = pagosMap.get(clavePago);

                    const isBeforeOccupationMonth = fechaIteracionMobiliario.getFullYear() < fechaInicioOcupacion.getFullYear() ||
                        (fechaIteracionMobiliario.getFullYear() === fechaInicioOcupacion.getFullYear() &&
                            fechaIteracionMobiliario.getMonth() < fechaInicioOcupacion.getMonth());

                    if (!isBeforeOccupationMonth) {
                        if (!pagoRegistrado || !pagoRegistrado.mobiliarioPagado || pagoRegistrado.mobiliarioPagado.length === 0) {
                            adeudosMobiliario.push({ mes: mesCapitalizado, anio: anio });
                            mobiliarioAsignado.forEach(mob => {
                                totalAdeudoMobiliario += parseFloat(mob.costoRenta || 0);
                            });
                        }
                    }
                    fechaIteracionMobiliario.setMonth(fechaIteracionMobiliario.getMonth() + 1);
                }
            }

            const badge = document.getElementById(`badge-adeudos-${inquilino.id}`);
            if (badge) {
                const newBadge = badge.cloneNode(true);
                badge.parentNode.replaceChild(newBadge, badge);

                const totalAdeudosRentaCount = adeudosFinales.filter(a => a.rentaPendiente).length;
                const totalAdeudosServiciosCount = adeudosFinales.filter(a => a.serviciosPendientes).length;
                const totalAdeudosMobiliarioCount = adeudosMobiliario.length;

                if (totalAdeudosRentaCount > 0 || totalAdeudosServiciosCount > 0 || totalAdeudosMobiliarioCount > 0) {
                    let textoBadge = [];
                    if (totalAdeudosRentaCount > 0) textoBadge.push(`${totalAdeudosRentaCount} Renta`);
                    if (totalAdeudosServiciosCount > 0) textoBadge.push(`${totalAdeudosServiciosCount} Serv`);
                    if (totalAdeudosMobiliarioCount > 0) textoBadge.push(`${totalAdeudosMobiliarioCount} Mob`);

                    newBadge.textContent = textoBadge.join(' + ');
                    newBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors duration-200";
                    newBadge.title = "Haz clic para ver los detalles de adeudos";

                    newBadge.addEventListener('click', () => {
                        const modalContentHtml = `
                            <div class="px-4 py-3 bg-red-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                                <h3 class="text-xl font-bold text-center">Adeudos de ${inquilino.nombre}</h3>
                            </div>
                            
                            ${(totalAdeudosRentaCount > 0 || totalAdeudosServiciosCount > 0 || totalAdeudosMobiliarioCount > 0) ? `
                            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
                                <h4 class="text-lg font-semibold text-gray-800 mb-4">Totales Adeudados</h4>
                                <div class="space-y-2">
                                    ${totalAdeudoRenta > 0 ? `
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-gray-600">Total Adeudo Renta:</span>
                                        <span class="font-bold text-red-600">${totalAdeudoRenta.toFixed(2)}</span>
                                    </div>` : ''}
                                    ${totalAdeudoServicios > 0 ? `
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-gray-600">Total Adeudo Servicios:</span>
                                        <span class="font-bold text-red-600">${totalAdeudoServicios.toFixed(2)}</span>
                                    </div>` : ''}
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-gray-600">Total Adeudo Mobiliario:</span>
                                        <span class="font-bold ${totalAdeudoMobiliario > 0 ? 'text-red-600' : 'text-gray-700'}">${totalAdeudoMobiliario.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between items-center pt-2 border-t mt-2">
                                        <span class="font-bold text-gray-800 text-lg">GRAN TOTAL ADEUDADO:</span>
                                        <span class="font-extrabold text-xl text-red-700">${(totalAdeudoRenta + totalAdeudoServicios + totalAdeudoMobiliario).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}

                            <div class="space-y-4">
                                ${adeudosFinales.length > 0 ? `
                                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Desglose de Adeudos (Renta/Servicios)</h4>
                                    <div class="space-y-3">
                                        ${adeudosFinales.map(m => `
                                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                                <div class="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span class="font-medium text-gray-800">${m.mes} ${m.anio}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    ${m.rentaPendiente ? `<span class="text-sm text-red-600 font-medium">Renta pendiente</span><button onclick="abrirFormularioPagoRenta('${inquilino.id}', '${m.mes}', ${m.anio})" class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs">Pagar Renta</button>` : ''}
                                                    ${m.serviciosPendientes && m.rentaPendiente ? '<span class="text-gray-300">|</span>' : ''}
                                                    ${m.serviciosPendientes ? `
                                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            Servicios pendientes
                                                        </span>
                                                        <button onclick="abrirFormularioPagoServicio('${inquilino.id}', '${m.mes}', ${m.anio})" class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs">Pagar Servicios</button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}

                                ${adeudosMobiliario.length > 0 ? `
                                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Desglose de Adeudos de Mobiliario</h4>
                                    <div class="space-y-3">
                                        ${adeudosMobiliario.map(m => `
                                            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors duration-200">
                                                <div class="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <span class="font-medium text-gray-800">${m.mes} ${m.anio}</span>
                                                </div>
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Mobiliario pendiente
                                                </span>
                                                <button onclick="abrirFormularioPagoMobiliario('${inquilino.id}', '${m.mes}', ${m.anio})" class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs">Pagar Mobiliario</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
                                <button onclick="ocultarModal()"
                                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                                    Cerrar
                                </button>
                            </div>
                        `;
                        window.adeudosModalContent = modalContentHtml;
                        mostrarModal(modalContentHtml);
                    });

                } else {
                    newBadge.textContent = "Sin adeudos";
                    newBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
                    newBadge.title = "El inquilino está al corriente";
                }
            }
        }

        // Guardar en caché despuÃ©s de actualizar todo
        cachedInquilinosHTML = contenedor.innerHTML;
        inquilinosCacheTimestamp = new Date();
        cachedInquilinosFilter = filtroActivo;

        // Función para generar PDF
        window.generarPDFInquilinos = async () => {
            mostrarLoader();
            mostrarNotificacion("Preparando reporte de inquilinos...", "info");

            const fechaGeneracion = new Date().toLocaleDateString();
            const filtroEstado = document.getElementById('filtroActivo').value;

            // Separar y ordenar alfabéticamente
            const activos = inquilinosList
                .filter(i => i.activo)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            const inactivos = inquilinosList
                .filter(i => !i.activo)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            const headerHtml = `
                <div style="text-align: center; margin-bottom: 1.5rem; border-bottom: 2px solid #3730a3; padding-bottom: 1rem;">
                    <h1 style="font-size: 2rem; font-weight: 800; color: #1e1b4b; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Reporte de Inquilinos</h1>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; color: #64748b; font-size: 0.9rem;">
                        <span>Fecha: ${fechaGeneracion}</span>
                        <span>Filtro: ${filtroEstado}</span>
                    </div>
                </div>
            `;

            const summaryHtml = `
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="flex: 1; background: #f1f5f9; padding: 0.75rem; border-radius: 8px; text-align: center;">
                        <span style="display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Total Registrados</span>
                        <strong style="font-size: 1.25rem; color: #1e293b;">${inquilinosList.length}</strong>
                    </div>
                    <div style="flex: 1; background: #ecfdf5; padding: 0.75rem; border-radius: 8px; text-align: center;">
                        <span style="display: block; font-size: 0.75rem; color: #059669; text-transform: uppercase;">Activos</span>
                        <strong style="font-size: 1.25rem; color: #065f46;">${activos.length}</strong>
                    </div>
                    <div style="flex: 1; background: #fef2f2; padding: 0.75rem; border-radius: 8px; text-align: center;">
                        <span style="display: block; font-size: 0.75rem; color: #dc2626; text-transform: uppercase;">Inactivos</span>
                        <strong style="font-size: 1.25rem; color: #991b1b;">${inactivos.length}</strong>
                    </div>
                </div>
            `;

            const renderTable = (lista, titulo, color) => {
                if (lista.length === 0) return '';
                return `
                    <div style="margin-bottom: 2rem; page-break-inside: avoid;">
                        <h2 style="font-size: 1.1rem; font-weight: 700; color: ${color}; margin-bottom: 0.5rem; display: flex; align-items: center; border-left: 4px solid ${color}; padding-left: 0.5rem;">
                            ${titulo} (${lista.length})
                        </h2>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                            <thead>
                                <tr style="background-color: #f8fafc; border-bottom: 2px solid ${color};">
                                    <th style="padding: 8px 4px; text-align: left; font-weight: 700; color: #475569; width: 25%;">Nombre</th>
                                    <th style="padding: 8px 4px; text-align: left; font-weight: 700; color: #475569; width: 15%;">Teléfono</th>
                                    <th style="padding: 8px 4px; text-align: left; font-weight: 700; color: #475569; width: 20%;">Inmueble</th>
                                    <th style="padding: 8px 4px; text-align: left; font-weight: 700; color: #475569; width: 15%;">Inicio</th>
                                    <th style="padding: 8px 4px; text-align: left; font-weight: 700; color: #475569; width: 15%;">Fin / Salida</th>
                                    <th style="padding: 8px 4px; text-align: center; font-weight: 700; color: #475569; width: 10%;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map((inquilino, idx) => `
                                    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                                        <td style="padding: 8px 4px; font-weight: 600; color: #1e293b;">${inquilino.nombre}</td>
                                        <td style="padding: 8px 4px; color: #475569;">${inquilino.telefono}</td>
                                        <td style="padding: 8px 4px; color: #475569;">${inquilino.nombreInmueble}</td>
                                        <td style="padding: 8px 4px; color: #475569;">${inquilino.fechaOcupacion || '-'}</td>
                                        <td style="padding: 8px 4px; color: ${inquilino.fechaDesocupacion ? '#dc2626' : '#475569'};">
                                            ${inquilino.fechaDesocupacion || inquilino.fechaFinContrato || '-'}
                                        </td>
                                        <td style="padding: 8px 4px; text-align: center;">
                                            <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; background-color: ${inquilino.activo ? '#dcfce7' : '#fee2e2'}; color: ${inquilino.activo ? '#166534' : '#991b1b'}; border: 1px solid currentColor; opacity: 0.8;">
                                                ${inquilino.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            };

            const finalHtml = `
                <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.4; padding: 1.5rem;">
                    ${headerHtml}
                    ${summaryHtml}
                    ${renderTable(activos, 'INQUILINOS ACTIVOS', '#3730a3')}
                    ${renderTable(inactivos, 'HISTORIAL DE INQUILINOS (INACTIVOS)', '#991b1b')}
                    ${inquilinosList.length === 0 ? '<p style="text-align: center; color: #64748b; padding: 2rem;">No se encontraron inquilinos con los criterios seleccionados.</p>' : ''}
                </div>
            `;

            const opt = {
                margin: [0.3, 0.3, 0.3, 0.3],
                filename: `Reporte_Inquilinos_${fechaGeneracion.replace(/\//g, '-')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            const element = document.createElement('div');
            element.innerHTML = finalHtml;
            document.body.appendChild(element);

            try {
                html2pdf().from(element).set(opt).toPdf().get('pdf').then(function (pdf) {
                    var totalPages = pdf.internal.getNumberOfPages();
                    for (var i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8);
                        pdf.setTextColor(148, 163, 184);
                        const text = `Página ${i} de ${totalPages} | ${fechaGeneracion}`;
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        pdf.text(text, pageWidth - 0.4, pageHeight - 0.3, { align: 'right' });
                    }
                    document.body.removeChild(element);
                    ocultarLoader();
                    mostrarNotificacion("Reporte de inquilinos generado.", "success");
                }).save();
            } catch (pdfError) {
                console.error("Error al generar PDF:", pdfError);
                mostrarNotificacion("Error al generar el PDF.", "error");
                ocultarLoader();
                if (document.body.contains(element)) document.body.removeChild(element);
            }
        };
    } catch (error) {
        console.error("Error al obtener inquilinos:", error);
        mostrarNotificacion("Error al cargar los inquilinos.", 'error');
    } finally {
        ocultarLoader();
    }
}

/**
 * Función para editar un inquilino, mostrando el formulario.
 * @param {string} id - ID del inquilino a editar.
 */
export async function mostrarFormularioNuevoInquilino(id = null) {
    const esEdicion = id !== null;
    let inquilinoExistente = {};

    if (esEdicion) {
        try {
            const docRef = doc(db, "inquilinos", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                inquilinoExistente = docSnap.data();
            } else {
                mostrarNotificacion("Inquilino no encontrado.", "error");
                return;
            }
        } catch (error) {
            mostrarNotificacion("Error al cargar datos del inquilino.", "error");
            return;
        }
    }

    const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
    const inmueblesDisponibles = [];
    inmueblesSnap.forEach(doc => {
        const data = doc.data();
        if (data.estado === 'Disponible' || (esEdicion && doc.id === inquilinoExistente.inmuebleAsociadoId)) {
            inmueblesDisponibles.push({ id: doc.id, ...data });
        }
    });

    const modalTitle = esEdicion ? 'Editar Inquilino' : 'Registrar Nuevo Inquilino';
    const modalHtml = `
        <div class="px-4 py-3 bg-blue-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl font-bold text-center">${modalTitle}</h3>
        </div>
        <form id="formularioInquilino" class="space-y-4">
            <input type="hidden" id="inquilinoId" value="${id || ''}">
            
            <div>
                <label for="nombre" class="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input type="text" id="nombre" value="${inquilinoExistente.nombre || ''}" class="form-control" required>
            </div>

            <div>
                <label for="telefono" class="block text-sm font-medium text-gray-700">Tel\u00E9fono</label>
                <input type="tel" id="telefono" value="${inquilinoExistente.telefono || ''}" class="form-control">
            </div>

            <div>
                <label for="inmuebleAsociadoId" class="block text-sm font-medium text-gray-700">Inmueble a Ocupar</label>
                <select id="inmuebleAsociadoId" class="form-control">
                    <option value="">-- Seleccione un Inmueble --</option>
                    ${inmueblesDisponibles.map(inmueble => `<option value="${inmueble.id}" ${inquilinoExistente.inmuebleAsociadoId === inmueble.id ? 'selected' : ''}>${inmueble.nombre}</option>`).join('')}
                </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="fechaLlegada" class="block text-sm font-medium text-gray-700">Fecha de Firma de Contrato</label>
                    <input type="date" id="fechaLlegada" value="${inquilinoExistente.fechaLlegada || ''}" class="form-control">
                </div>
                <div>
                    <label for="fechaOcupacion" class="block text-sm font-medium text-gray-700">Fecha de Inicio de Pagos</label>
                    <input type="date" id="fechaOcupacion" value="${inquilinoExistente.fechaOcupacion || ''}" class="form-control">
                    <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-xs text-amber-800 leading-snug">
                            <strong>\u00BFCambio de d\u00EDa de pago?</strong><br>
                            Modifica solo el <strong>D\u00CDA</strong> de esta fecha. <span class="font-bold text-red-600">NO cambies el a\u00F1o ni el mes original</span> para no perder el historial de adeudos anteriores.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label for="urlIdentificacion" class="block text-sm font-medium text-gray-700">URL de Identificaci\u00F3n (Drive)</label>
                <input type="url" id="urlIdentificacion" value="${inquilinoExistente.urlIdentificacion || ''}" class="form-control" placeholder="https://docs.google.com/...">
            </div>

            <!-- Checkbox de Dep\u00F3sito -->
            <div class="flex items-center">
                <input type="checkbox" id="depositoRecibido" class="form-checkbox h-5 w-5 text-blue-600" ${inquilinoExistente.depositoRecibido ? 'checked' : ''}>
                <label for="depositoRecibido" class="ml-2 block text-sm text-gray-900">\u00BFSe recibi\u00F3 dep\u00F3sito en garant\u00EDa?</label>
            </div>

            <!-- Campos de Dep\u00F3sito (se muestran/ocultan con el checkbox de arriba) -->
            <div id="camposDeposito" class="${inquilinoExistente.depositoRecibido ? '' : 'hidden'} space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="montoDeposito" class="block text-sm font-medium text-gray-700">Monto del Dep\u00F3sito</label>
                        <input type="number" id="montoDeposito" value="${inquilinoExistente.montoDeposito || ''}" class="form-control" step="0.01">
                    </div>
                    <div>
                        <label for="fechaDeposito" class="block text-sm font-medium text-gray-700">Fecha de Recepci\u00F3n del Dep\u00F3sito</label>
                        <input type="date" id="fechaDeposito" value="${inquilinoExistente.fechaDeposito || ''}" class="form-control">
                    </div>
                </div>
            </div>

            <!-- Checkbox de Servicios -->
            <div class="flex items-center">
                <input type="checkbox" id="pagaServicios" class="form-checkbox h-5 w-5 text-blue-600" ${inquilinoExistente.pagaServicios ? 'checked' : ''}>
                <label for="pagaServicios" class="ml-2 block text-sm text-gray-900">\u00BFEste inquilino paga servicios?</label>
            </div>

            <!-- Contenedor de Servicios (se muestra/oculta con el checkbox de arriba) -->
            <div id="serviciosContainer" class="${inquilinoExistente.pagaServicios ? 'bg-gray-50 p-4 rounded-lg border border-gray-200' : 'hidden'}">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg font-semibold text-gray-800">Servicios Asignados</h4>
                    <button type="button" id="btn-agregar-servicio" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded-md shadow-sm text-sm">
                        Agregar Servicio
                    </button>
                </div>
                <div id="listaServicios" class="space-y-4">
                    ${(inquilinoExistente.servicios && inquilinoExistente.servicios.length > 0) ?
            inquilinoExistente.servicios.map((servicio, index) => `
                            <!-- Aqu\u00ED se generar\u00E1 cada servicio existente -->
                        `).join('') :
            '<div class="text-center text-gray-500 py-4">No hay servicios agregados</div>'
        }
                </div>
            </div>

            <div class="flex items-center">
                <input type="checkbox" id="activo" class="form-checkbox h-5 w-5 text-blue-600" ${inquilinoExistente.activo === false ? '' : 'checked'}>
                <label for="activo" class="ml-2 block text-sm text-gray-900">Inquilino Activo</label>
            </div>

            <!-- BIT\u00C1CORA / HISTORIAL DE SUCESOS -->
            <div class="mt-6 border-t border-gray-200 pt-4">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Bit\u00E1cora de Sucesos
                    </h4>
                </div>
                
                <div id="contenedorBitacora" class="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200" style="max-height: 250px; overflow-y: auto;">
                    ${(inquilinoExistente.bitacora && inquilinoExistente.bitacora.length > 0) ?
            inquilinoExistente.bitacora.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(evento => `
                            <div class="relative pl-4 pb-4 border-l-2 border-gray-300 last:border-0 last:pb-0">
                                <div class="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${evento.tipo === 'sistema' ? 'bg-indigo-500' : 'bg-gray-500'}"></div>
                                <div class="text-xs text-gray-500 mb-0.5">${new Date(evento.fecha).toLocaleString('es-MX')}</div>
                                <div class="text-sm text-gray-800 font-medium">${evento.mensaje}</div>
                                ${evento.usuario ? `<div class="text-xs text-gray-400 mt-0.5">Por: ${evento.usuario}</div>` : ''}
                            </div>
                        `).join('')
            : '<div class="text-center text-gray-400 text-sm py-2">Sin sucesos registrados</div>'
        }
                </div>

                <div class="flex gap-2">
                    <input type="text" id="nuevaNotaBitacora" placeholder="Escribe una nota o comentario..." class="form-control text-sm flex-grow">
                    <button type="button" id="btnAgregarNotaBitacora" class="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-md text-sm transition-colors">
                        Agregar Nota
                    </button>
                </div>
            </div>

            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200 mr-2">Cancelar</button>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">${esEdicion ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;
    mostrarModal(modalHtml);

    // Lógica para mostrar/ocultar el contenedor de servicios
    document.getElementById('pagaServicios').addEventListener('change', function () {
        document.getElementById('serviciosContainer').classList.toggle('hidden', !this.checked);
    });

    // --- LÃ“GICA BITÃCORA (Frontend) ---
    const contenedorBitacora = document.getElementById('contenedorBitacora');
    const inputNota = document.getElementById('nuevaNotaBitacora');
    const btnAgregarNota = document.getElementById('btnAgregarNotaBitacora');
    let bitacoraTemp = inquilinoExistente.bitacora || [];

    // Función para renderizar bitácora (mezcla guardada + temporal)
    function renderizarBitacoraVisual() {
        if (bitacoraTemp.length === 0) {
            contenedorBitacora.innerHTML = '<div class="text-center text-gray-400 text-sm py-2">Sin sucesos registrados</div>';
            return;
        }

        contenedorBitacora.innerHTML = bitacoraTemp.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(evento => `
            <div class="relative pl-4 pb-4 border-l-2 border-gray-300 last:border-0 last:pb-0">
                <div class="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${evento.tipo === 'sistema' ? 'bg-indigo-500' : (evento.tipo === 'nuevo' ? 'bg-green-500' : 'bg-gray-500')}"></div>
                <div class="text-xs text-gray-500 mb-0.5">${new Date(evento.fecha).toLocaleString('es-MX')}</div>
                <div class="text-sm text-gray-800 font-medium">${evento.mensaje}</div>
                ${evento.usuario ? `<div class="text-xs text-gray-400 mt-0.5">Por: ${evento.usuario}</div>` : ''}
            </div>
        `).join('');
    }

    btnAgregarNota.addEventListener('click', () => {
        const mensaje = inputNota.value.trim();
        if (mensaje) {
            bitacoraTemp.push({
                fecha: new Date().toISOString(),
                mensaje: mensaje,
                tipo: 'manual', // o 'nuevo' para distinguir visualmente
                usuario: 'Admin' // PodrÃ­amos hacerlo dinÃ¡mico si hubiera auth
            });
            inputNota.value = '';
            renderizarBitacoraVisual();
        }
    });


    // Logic to handle form submission
    const form = document.getElementById('formularioInquilino');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inquilinoId = document.getElementById('inquilinoId').value;
        const nombre = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;
        const inmuebleAsociadoId = document.getElementById('inmuebleAsociadoId').value;
        const fechaLlegada = document.getElementById('fechaLlegada').value;
        const fechaOcupacion = document.getElementById('fechaOcupacion').value;
        const urlIdentificacion = document.getElementById('urlIdentificacion').value;
        const depositoRecibido = document.getElementById('depositoRecibido').checked;
        const montoDeposito = document.getElementById('montoDeposito').value;
        const fechaDeposito = document.getElementById('fechaDeposito').value;
        const activo = document.getElementById('activo').checked;
        const pagaServicios = document.getElementById('pagaServicios').checked;

        // --- DETECCIÃ“N AUTOMÃTICA DE CAMBIOS (Bitácora) ---
        if (inquilinoExistente.fechaOcupacion && fechaOcupacion !== inquilinoExistente.fechaOcupacion) {
            bitacoraTemp.push({
                fecha: new Date().toISOString(),
                mensaje: `Cambio de Fecha de OcupaciÃ³n: de ${inquilinoExistente.fechaOcupacion} a ${fechaOcupacion}`,
                tipo: 'sistema',
                usuario: 'Sistema'
            });
        }

        // Si cambiÃ³ el inmueble
        if (inquilinoExistente.inmuebleAsociadoId && inmuebleAsociadoId !== inquilinoExistente.inmuebleAsociadoId) {
            // Buscar nombres para mejor registro (opcional, por ahora solo IDs o buscamos en DOM)
            bitacoraTemp.push({
                fecha: new Date().toISOString(),
                mensaje: `Cambio de Inmueble (ID): de ${inquilinoExistente.inmuebleAsociadoId} a ${inmuebleAsociadoId}`,
                tipo: 'sistema',
                usuario: 'Sistema'
            });
        }


        // Recolectar servicios
        const servicios = [];
        if (pagaServicios) {
            const servicioItems = document.querySelectorAll('.servicio-item');
            servicioItems.forEach((item, index) => {
                const tipo = item.querySelector(`[name="servicios[${index}][tipo]"]`).value;
                const monto = parseFloat(item.querySelector(`[name="servicios[${index}][monto]"]`).value);
                const notas = item.querySelector(`[name="servicios[${index}][notas]"]`).value;
                if (tipo && !isNaN(monto)) {
                    servicios.push({ tipo, monto, notas });
                }
            });
        }

        const inquilinoData = {
            nombre,
            telefono,
            inmuebleAsociadoId,
            fechaLlegada,
            fechaOcupacion,
            urlIdentificacion,
            depositoRecibido,
            montoDeposito: depositoRecibido ? parseFloat(montoDeposito) : 0,
            fechaDeposito: depositoRecibido ? fechaDeposito : '',
            activo,
            pagaServicios,
            servicios,
            bitacora: bitacoraTemp // Guardamos la bitácora actualizada
        };

        try {
            if (inquilinoId) {
                // Update existing inquilino
                const docRef = doc(db, "inquilinos", inquilinoId);
                await updateDoc(docRef, inquilinoData);
                mostrarNotificacion("Inquilino actualizado con éxito.", "success");
            } else {
                // Para nuevos inquilinos, agregamos el evento de creaciÃ³n
                inquilinoData.bitacora = [{
                    fecha: new Date().toISOString(),
                    mensaje: "Inquilino registrado en el sistema",
                    tipo: "sistema",
                    usuario: "Sistema"
                }];
                // Add new inquilino
                await addDoc(collection(db, "inquilinos"), inquilinoData);
                mostrarNotificacion("Inquilino registrado con éxito.", "success");
            }
            ocultarModal();
            limpiarCacheInquilinos();
            mostrarInquilinos();
        } catch (error) {
            console.error(error);
            mostrarNotificacion("Error al guardar el inquilino.", "error");
        }
    });

    // Show/hide deposit fields based on checkbox
    document.getElementById('depositoRecibido').addEventListener('change', (e) => {
        document.getElementById('camposDeposito').classList.toggle('hidden', !e.target.checked);
    });

    // --- Lógica para Servicios ---
    function renderizarServicios() {
        const listaServicios = document.getElementById('listaServicios');
        if (!listaServicios) return;

        const servicios = inquilinoExistente.servicios || [];
        if (servicios.length === 0) {
            listaServicios.innerHTML = '<div class="text-center text-gray-500 py-4">No hay servicios agregados</div>';
            return;
        }

        listaServicios.innerHTML = servicios.map((servicio, index) => `
            <div class="servicio-item border border-gray-200 rounded-lg p-3 mb-3 bg-white">
                <div class="flex justify-between items-center mb-2">
                    <h5 class="font-medium text-gray-700">Servicio #${index + 1}</h5>
                    <button type="button" class="btn-eliminar-servicio text-red-500 hover:text-red-700" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio</label>
                        <select name="servicios[${index}][tipo]" class="form-control">
                            <option value="Internet" ${servicio.tipo === 'Internet' ? 'selected' : ''}>Internet</option>
                            <option value="Cable" ${servicio.tipo === 'Cable' ? 'selected' : ''}>Cable</option>
                            <option value="Agua" ${servicio.tipo === 'Agua' ? 'selected' : ''}>Agua</option>
                            <option value="Luz" ${servicio.tipo === 'Luz' ? 'selected' : ''}>Luz</option>
                            <option value="Gas" ${servicio.tipo === 'Gas' ? 'selected' : ''}>Gas</option>
                            <option value="Otro" ${servicio.tipo === 'Otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Monto Mensual</label>
                        <div class="mt-1 relative rounded-md shadow-sm">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span class="text-gray-500 sm:text-sm">$</span></div>
                            <input type="number" name="servicios[${index}][monto]" value="${servicio.monto || ''}" step="0.01" min="0" class="form-control pl-7 pr-12" placeholder="0.00">
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><span class="text-gray-500 sm:text-sm">MXN</span></div>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea name="servicios[${index}][notas]" rows="2" class="form-control" placeholder="Detalles adicionales...">${servicio.notas || ''}</textarea>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners for delete buttons
        document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', function () {
                this.closest('.servicio-item').remove();
                // Opcional: Renumerar si es necesario
            });
        });
    }

    // Renderizar servicios existentes al cargar el formulario
    renderizarServicios();

    // Evento para agregar un nuevo servicio
    document.getElementById('btn-agregar-servicio').addEventListener('click', () => {
        const listaServicios = document.getElementById('listaServicios');
        if (listaServicios.innerHTML.includes('No hay servicios agregados')) {
            listaServicios.innerHTML = '';
        }
        const nuevoIndice = listaServicios.querySelectorAll('.servicio-item').length;
        const nuevoServicioHtml = `
            <!-- AquÃ­ va el HTML de un nuevo servicio, similar al de renderizarServicios pero vacío -->
        `;
        // Simplificado: simplemente llamamos a una función que añade el HTML
        agregarServicioAlFormulario();
    });
}

export async function editarInquilino(id) {
    mostrarFormularioNuevoInquilino(id);
}

/**
 * Confirma la desocupación de un inquilino y actualiza su estado.
 * TambiÃ©n marca el inmueble asociado como 'Disponible'.
 * @param {string} inquilinoId - ID del inquilino a desocupar.
 */
export async function confirmarDesocupacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres desocupar a este inquilino? Se marcarÃ¡ como inactivo y su inmueble asociado como disponible.')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            const inquilinoSnap = await getDoc(inquilinoRef);

            if (inquilinoSnap.exists()) {
                const inquilinoData = inquilinoSnap.data();
                const inmuebleId = inquilinoData.inmuebleAsociadoId;

                await updateDoc(inquilinoRef, {
                    activo: false,
                    inmuebleAsociadoId: null,
                    inmuebleAsociadoNombre: 'No Asignado',
                    fechaDesocupacion: new Date().toISOString().split('T')[0] // <-- Nueva lÃ­nea
                });
                mostrarNotificacion("Inquilino desocupado con éxito.", 'success');

                if (inmuebleId) {
                    await updateDocInmueble(doc(db, "inmuebles", inmuebleId), {
                        estado: 'Disponible',
                        inquilinoActualId: null, // Limpiar inquilino actual del inmueble
                        inquilinoActualNombre: null
                    });
                    mostrarNotificacion(`Inmueble asociado marcado como Disponible.`, 'info');
                }
            } else {
                mostrarNotificacion("Inquilino no encontrado.", 'error');
            }
            limpiarCacheInquilinos();
            mostrarInquilinos();

        } catch (error) {
            console.error("Error al desocupar inquilino:", error);
            mostrarNotificacion("Error al desocupar inquilino.", "error");
        }
    }
}

/**
 * Confirma la reactivación de un inquilino.
 * @param {string} inquilinoId - ID del inquilino a reactivar.
 */
export async function confirmarReactivacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres reactivar a este inquilino?')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            await updateDoc(inquilinoRef, {
                activo: true,
                fechaDesocupacion: null
            });
            mostrarNotificacion("Inquilino reactivado con éxito.", 'success');
            limpiarCacheInquilinos();
            mostrarInquilinos();

        } catch (error) {
            console.error("Error al reactivar inquilino:", error);
            mostrarNotificacion("Error al reactivar inquilino.", "error");
        }
    }
}

/**
 * Muestra el historial de pagos de un inquilino en un modal.
 * @param {string} inquilinoId - ID del inquilino cuyo historial de pagos se desea mostrar.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinoSnap = await getDoc(doc(db, "inquilinos", inquilinoId));
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));

        if (!inquilinoSnap.exists()) {
            mostrarNotificacion("Inquilino no encontrado.", "error");
            return;
        }

        const inquilino = inquilinoSnap.data();
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinosConMobiliario = new Set();
        mobiliarioSnap.forEach(doc => {
            const mob = doc.data();
            if (Array.isArray(mob.asignaciones)) {
                mob.asignaciones.forEach(a => {
                    // CORRECCIÃ“N: Se comprueba estrictamente que `activa` sea `true`.
                    if (a.inquilinoId && a.activa === true && a.cantidad > 0) {
                        inquilinosConMobiliario.add(a.inquilinoId);
                    }
                });
            }
        });

        // Filtrar pagos de este inquilino
        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            if (data.inquilinoId === inquilinoId) {
                pagosList.push({ id: doc.id, ...data });
            }
        });

        // Ordenar por fecha (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        // Ejemplo de integraciÃ³n en mostrarHistorialPagosInquilino
        // FIX: This was buggy, `inmuebleId` and `fechaOcupacion` were not defined.
        // Using the main inquilino data instead.
        if (inquilino.inmuebleAsociadoId && inquilino.fechaOcupacion) {
            const mesesAdeudados = await obtenerMesesAdeudadosHistorico(inquilinoId, inquilino.inmuebleAsociadoId, new Date(inquilino.fechaOcupacion));
            let adeudosHtml = '';
            if (mesesAdeudados.length > 0) {
                adeudosHtml = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                        <strong>Meses adeudados:</strong>
                        <ul class="list-disc list-inside">
                            ${mesesAdeudados.map(m => `<li>${m.mes} ${m.anio}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else {
                adeudosHtml = `
                    <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
                        <strong>¡Sin adeudos!</strong>
                    </div>
                `;
            }
        }


        let historialHtml = `
            <div class="px-4 py-3 bg-purple-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Pagos de ${inquilino.nombre}</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inmueble</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes/Año</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mobiliario</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Abonos</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (pagosList.length === 0) {
            historialHtml += `
                <tr>
                    <td colspan="8" class="text-center py-8 text-gray-500">No hay pagos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            pagosList.forEach(pago => {
                // Estado visual
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                switch (pago.estado) {
                    case "pagado":
                        estadoClass += "bg-green-100 text-green-800";
                        break;
                    case "parcial":
                        estadoClass += "bg-yellow-100 text-yellow-800";
                        break;
                    case "pendiente":
                        estadoClass += "bg-red-100 text-red-800";
                        break;
                    case "vencido":
                        estadoClass += "bg-purple-100 text-purple-800";
                        break;
                    default:
                        estadoClass += "bg-gray-100 text-gray-800";
                        break;
                }

                // Abonos detalle
                let abonosDetalleHtml = "";
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml = pago.abonos.map(abono => `
                        <div class="mb-1">
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold mr-1">${parseFloat(abono.montoAbonado).toFixed(2)}</span>
                            <span class="text-xs text-gray-500">${abono.fechaAbono}</span>
                            ${abono.origen ? `<span class="ml-1 text-xs text-cyan-700">(${abono.origen})</span>` : ""}
                        </div>
                    `).join('');
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-400">Sin abonos</span>`;
                }

                // Lógica para el estado del mobiliario
                let mobiliarioHtml = '-';

                // Verifica si el inquilino tiene mobiliario asignado para el inmueble de este pago
                let tieneMobiliarioAsignado = false;
                mobiliarioSnap.forEach(doc => {
                    const mob = doc.data();
                    if (Array.isArray(mob.asignaciones)) {
                        mob.asignaciones.forEach(a => {
                            // Solo cuenta como asignado si está activa, cantidad > 0, inquilinoId coincide y el inmuebleId coincide con el del pago
                            if (
                                a.inquilinoId === inquilinoId &&
                                a.activa === true &&
                                a.cantidad > 0 &&
                                a.inmuebleId === pago.inmuebleId // <-- esta lÃ­nea es clave
                            ) {
                                tieneMobiliarioAsignado = true;
                            }
                        });
                    }
                });

                // SOLO muestra pendiente/pagado si tiene mobiliario asignado para ese inmueble
                if (tieneMobiliarioAsignado) {
                    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
                        mobiliarioHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Pagado</span>`;
                    } else {
                        mobiliarioHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pendiente</span>`;
                    }
                } else {
                    mobiliarioHtml = '-';
                }

                historialHtml += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || ''} / ${pago.anioCorrespondiente || ''}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${(pago.montoTotal || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${(pago.montoPagado || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${(pago.saldoPendiente || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-4 py-2 text-sm">${mobiliarioHtml}</td>
                        <td class="px-4 py-2 text-sm">${abonosDetalleHtml}</td>
                    </tr>
                `;
            });
        }

        historialHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;

        mostrarModal(historialHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inquilino:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inquilino.", 'error');
    }
}

// Historial de abonos elegante
export async function mostrarHistorialAbonosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        let abonosList = [];
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.inquilinoId === inquilinoId && pago.abonos && pago.abonos.length > 0) {
                pago.abonos.forEach(abono => {
                    abonosList.push({
                        monto: abono.montoAbonado,
                        fecha: abono.fechaAbono,
                        origen: abono.origen || "manual",
                        pagoId: doc.id,
                        mes: pago.mesCorrespondiente,
                        anio: pago.anioCorrespondiente
                    });
                });
            }
        });

        let html = `
            <div class="px-4 py-3 bg-indigo-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Abonos</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pago (Mes/Año)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (abonosList.length === 0) {
            html += `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">No hay abonos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            abonosList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            abonosList.forEach(a => {
                let origenClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                origenClass += a.origen === "saldo a favor" ? "bg-cyan-100 text-cyan-800" : "bg-green-100 text-green-800";
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${parseFloat(a.monto).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.fecha}</td>
                        <td class="px-4 py-2 text-sm"><span class="${origenClass}">${a.origen}</span></td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.mes || ''} / ${a.anio || ''}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(html);
    } catch (error) {
        mostrarNotificacion("Error al cargar abonos.", "error");
    }
}

// Saldo a favor elegante
export async function mostrarSaldoFavorInquilino(inquilinoId) {
    try {
        const abonosSnap = await getDocs(collection(db, "abonosSaldoFavor"));
        let saldoTotal = 0;
        let abonos = [];
        abonosSnap.forEach(doc => {
            const abono = doc.data();
            if (abono.inquilinoId === inquilinoId && abono.saldoRestante > 0) {
                saldoTotal += abono.saldoRestante;
                abonos.push({
                    monto: abono.saldoRestante,
                    fecha: abono.fechaAbono,
                    descripcion: abono.descripcion || ""
                });
            }
        });

        let tabla = '';
        if (abonos.length > 0) {
            tabla = `
            <div class="w-full max-w-md mx-auto">
                <div class="divide-y divide-cyan-100 rounded-lg shadow bg-white">
                    ${abonos.map(a => `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2">
                            <div class="flex-1">
                                <div class="font-semibold text-cyan-800">${parseFloat(a.monto).toFixed(2)}</div>
                                ${a.descripcion ? `<div class="text-xs text-gray-400">${a.descripcion}</div>` : ''}
                            </div>
                            <div class="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 text-sm text-right">
                                <span class="inline-block text-gray-600">${a.fecha}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="flex justify-between items-center px-3 py-3 bg-cyan-50 rounded-b-lg">
                        <span class="font-bold text-cyan-800">Total disponible</span>
                        <span class="font-bold text-lg text-cyan-700">${saldoTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            `;
        } else {
            tabla = `<div class="text-gray-500 text-center py-6">No hay saldo a favor disponible.</div>`;
        }

        mostrarModal(`
            <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
                <h3 class="text-lg font-bold text-center">Saldo a Favor Actual</h3>
            </div>
            <div class="py-2">${tabla}</div>
            <div class="flex justify-end mt-2">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
            </div>
        `);
    } catch (error) {
        mostrarNotificacion("Error al cargar saldo a favor.", "error");
    }
}

// Función auxiliar para eliminar documentos (probablemente ya la tienes en ui.js o utilities.js)
// Si no la tienes, aquí una versiÃ³n simple para inquilinos:
export async function eliminarDocumento(coleccion, id, callbackRefresh, callbackDashboard) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            const docSnap = await getDoc(doc(db, coleccion, id));
            const data = docSnap.data();

            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');

            // Si el inquilino eliminado estaba asociado a un inmueble, liberar el inmueble
            if (coleccion === 'inquilinos' && data && data.inmuebleAsociadoId) {
                await updateDocInmueble(doc(db, "inmuebles", data.inmuebleAsociadoId), {
                    estado: 'Disponible',
                    inquilinoActualId: null,
                    inquilinoActualNombre: null
                });
                mostrarNotificacion(`Inmueble ${data.inmuebleAsociadoNombre || 'anterior'} ha sido marcado como Disponible tras la eliminación del inquilino.`, 'info');
            }

            if (callbackRefresh) callbackRefresh();
            if (callbackDashboard) callbackDashboard();
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

// Al cargar los inquilinos, tambiÃ©n cargar y asignar el orden correspondiente
window.addEventListener('load', async () => {
    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            inquilinosList.push({ id: doc.id, ...data });
        });

        // Ordenar inquilinos por el campo 'orden' (si existe)
        inquilinosList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        // Asignar el orden a cada inquilino en la interfaz (puedes tener un contenedor especÃ­fico para esto)
        const contenedorOrden = document.getElementById("contenidoOrden");
        if (contenedorOrden) {
            contenedorOrden.innerHTML = inquilinosList.map((inquilino, index) => `
                <div class="flex items-center py-2 ${index % 2 === 0 ? 'bg-gray-50' : ''}">
                    <span class="text-gray-700 font-semibold">${index + 1}.</span>
                    <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">${inquilino.nombre}</div>
                        <div class="text-xs text-gray-500">${inquilino.telefono}</div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Error al cargar inquilinos para orden:", error);
    }
});

import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm";

document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'recibioDeposito') {
        document.getElementById('campoDeposito').style.display = e.target.checked ? 'block' : 'none';
    }

    if (e.target && e.target.id === 'pagaServicios') {
        document.getElementById('serviciosContainer').style.display = e.target.checked ? 'block' : 'none';
    }
});

// Función para agregar un nuevo servicio al formulario
function agregarServicioAlFormulario() {
    const listaServicios = document.getElementById('listaServicios');
    if (!listaServicios) return;

    // Limpiar mensaje de "No hay servicios"
    if (listaServicios.innerHTML.includes('No hay servicios agregados')) {
        listaServicios.innerHTML = '';
    }

    // Obtener el Ã­ndice para el nuevo servicio
    const servicioItems = listaServicios.querySelectorAll('.servicio-item');
    const nuevoIndice = servicioItems.length;

    // Crear el nuevo elemento de servicio
    const nuevoServicio = document.createElement('div');
    nuevoServicio.className = 'servicio-item border border-gray-200 rounded-lg p-3 mb-3 bg-white';
    nuevoServicio.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h5 class="font-medium text-gray-700">Servicio #${nuevoIndice + 1}</h5>
            <button type="button" class="btn-eliminar-servicio text-red-500 hover:text-red-700" data-index="${nuevoIndice}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio</label>
                <select name="servicios[${nuevoIndice}][tipo]" class="form-control">
                    <option value="Internet">Internet</option>
                    <option value="Cable">Cable</option>
                    <option value="Agua">Agua</option>
                    <option value="Luz">Luz</option>
                    <option value="Gas">Gas</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto Mensual</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input type="number" name="servicios[${nuevoIndice}][monto]" step="0.01" min="0" 
                        class="form-control pl-7 pr-12" 
                        placeholder="0.00">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">MXN</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="servicios[${nuevoIndice}][notas]" rows="2" 
                class="form-control"
                placeholder="Detalles adicionales sobre el servicio"></textarea>
        </div>
    `;

    // Agregar el nuevo servicio a la lista
    listaServicios.appendChild(nuevoServicio);

    // Agregar evento para eliminar el servicio
    const btnEliminar = nuevoServicio.querySelector('.btn-eliminar-servicio');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', function () {
            eliminarServicio(this);
        });
    }
}

// Nueva funcionalidad: Filtrar inquilinos con adeudos
document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'filtroAdeudos') {
        const mostrarConAdeudos = e.target.checked;
        const listaInquilinos = document.getElementById('listaInquilinos');

        if (listaInquilinos) {
            listaInquilinos.querySelectorAll('.bg-white').forEach(card => {
                const inquilinoId = card.dataset.id;
                const badge = document.getElementById(`badge-adeudos-${inquilinoId}`);

                if (badge) {
                    const tieneAdeudos = badge.textContent !== "Sin adeudos";
                    card.style.display = mostrarConAdeudos && !tieneAdeudos ? 'none' : 'block';
                }
            });
        }
    }
});

// Función para eliminar un servicio
function eliminarServicio(btnEliminar) {
    const servicioItem = btnEliminar.closest('.servicio-item');
    if (servicioItem) {
        const listaServicios = document.getElementById('listaServicios');
        listaServicios.removeChild(servicioItem);

        // Renumerar los servicios restantes
        const servicioItems = listaServicios.querySelectorAll('.servicio-item');
        if (servicioItems.length === 0) {
            listaServicios.innerHTML = '<div class="text-center text-gray-500 py-4">No hay servicios agregados</div>';
        } else {
            servicioItems.forEach((item, index) => {
                // Actualizar el título
                const titulo = item.querySelector('h5');
                if (titulo) {
                    titulo.textContent = `Servicio #${index + 1}`;
                }

                // Actualizar los Ã­ndices en los nombres de los campos
                const campos = item.querySelectorAll('[name^="servicios["]');
                campos.forEach(campo => {
                    const nombreActual = campo.getAttribute('name');
                    const nuevoNombre = nombreActual.replace(/servicios\[\d+\]/, `servicios[${index}]`);
                    campo.setAttribute('name', nuevoNombre);
                });

                // Actualizar el atributo data-index del botÃ³n eliminar
                const btnEliminar = item.querySelector('.btn-eliminar-servicio');
                if (btnEliminar) {
                    btnEliminar.setAttribute('data-index', index);
                }
            });
        }
    }
}

// Agregar checkbox de filtro en la interfaz
const contenedorFiltros = document.getElementById("filtrosInquilinos");
if (contenedorFiltros) {
    contenedorFiltros.innerHTML += `
        <label class="inline-flex items-center">
            <input type="checkbox" id="filtroAdeudos" class="form-checkbox h-4 w-4 text-red-600">
            <span class="ml-2 text-sm text-red-700">Mostrar solo inquilinos con adeudos</span>
        </label>
    `;
}

// Nueva funcionalidad: Mostrar mobiliario asignado a inquilinos
window.mostrarMobiliarioAsignadoInquilino = async function (inquilinoId, inquilinoNombre) {
    const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
    let mobiliarioAsignado = [];
    mobiliarioSnap.forEach(doc => {
        const mob = doc.data();
        if (Array.isArray(mob.asignaciones)) {
            // Solo considerar asignaciones activas (activa !== false y cantidad > 0)
            const asignacion = mob.asignaciones.find(a => a.inquilinoId === inquilinoId && a.cantidad > 0 && a.activa !== false);
            if (asignacion) {
                mobiliarioAsignado.push({
                    nombre: mob.nombre,
                    descripcion: mob.descripcion || "",
                    costoRenta: mob.costoRenta || 0,
                    cantidad: asignacion.cantidad
                });
            }
        }
    });

    if (mobiliarioAsignado.length === 0) {
        mostrarModal(`
            <div class="px-4 py-3 bg-teal-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
                <h3 class="text-lg font-bold text-center">Mobiliario asignado a ${inquilinoNombre}</h3>
            </div>
            <div class="py-6 text-center text-gray-500 text-lg">No hay mobiliario asignado actualmente a este inquilino.</div>
            <div class="flex justify-end mt-2">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
            </div>
        `);
        return;
    }

    let total = 0;
    let tabla = `
        <div class="w-full max-w-md mx-auto">
            <div class="divide-y divide-teal-100 rounded-lg shadow bg-white">
                ${mobiliarioAsignado.map(mob => {
        const subtotal = mob.cantidad * mob.costoRenta;
        total += subtotal;
        return `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2">
                            <div class="flex-1">
                                <div class="font-semibold text-teal-800">${mob.nombre}</div>
                                ${mob.descripcion ? `<div class="text-xs text-gray-400">${mob.descripcion}</div>` : ''}
                            </div>
                            <div class="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 text-sm text-right">
                                <span class="inline-block bg-teal-50 text-teal-700 px-2 py-0.5 rounded">x${mob.cantidad}</span>
                                <span class="inline-block text-gray-600">${mob.costoRenta.toFixed(2)} c/u</span>
                                <span class="inline-block font-bold text-teal-700">${subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
    }).join('')}
                <div class="flex justify-between items-center px-3 py-3 bg-teal-50 rounded-b-lg">
                    <span class="font-bold text-teal-800">Total mobiliario</span>
                    <span class="font-bold text-lg text-teal-700">${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;

    mostrarModal(`
        <div class="px-4 py-3 bg-teal-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
            <h3 class="text-lg font-bold text-center">Mobiliario asignado a ${inquilinoNombre}</h3>
        </div>
        <div class="py-2">${tabla}</div>
        <div class="flex justify-end mt-2">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
        </div>
    `);
};

// Helper functions to open payment forms and pre-fill data
async function abrirFormularioPagoRenta(inquilinoId, mes, anio) {
    window.vieneDeAdeudos = true;
    await mostrarFormularioNuevoPago(); // Open the rent payment form

    // Fetch inquilino data to get inmuebleAsociadoId
    const inquilinoSnap = await getDoc(doc(db, "inquilinos", inquilinoId));
    let inmuebleAsociadoId = null;
    if (inquilinoSnap.exists()) {
        inmuebleAsociadoId = inquilinoSnap.data().inmuebleAsociadoId;
    }

    // Give the modal a moment to render
    setTimeout(async () => {
        const inquilinoSelect = document.getElementById('inquilinoId');
        const inmuebleSelect = document.getElementById('inmuebleId'); // Get the inmueble select
        const mesSelect = document.getElementById('mesCorrespondiente');
        const anioSelect = document.getElementById('anioCorrespondiente');

        if (inquilinoSelect) {
            inquilinoSelect.value = inquilinoId;
            // Trigger change event on inquilinoSelect to update associated inmueble and rent amount
            const event = new Event('change', { bubbles: true });
            inquilinoSelect.dispatchEvent(event);
        }

        // Set inmuebleId and trigger change event
        if (inmuebleSelect && inmuebleAsociadoId) {
            inmuebleSelect.value = inmuebleAsociadoId;
            const event = new Event('change', { bubbles: true });
            inmuebleSelect.dispatchEvent(event);
        }

        if (mesSelect) {
            mesSelect.value = mes;
        }
        if (anioSelect) {
            anioSelect.value = anio;
        }
    }, 100); // Small delay
}

async function abrirFormularioPagoServicio(inquilinoId, mes, anio) {
    window.vieneDeAdeudos = true;
    await mostrarFormularioPagoServicio(); // Open the service payment form
    setTimeout(async () => {
        const inquilinoSelect = document.getElementById('inquilinoId');
        const mesSelect = document.getElementById('mesCorrespondiente');
        const anioSelect = document.getElementById('anioCorrespondiente');

        if (inquilinoSelect) {
            inquilinoSelect.value = inquilinoId;
            const event = new Event('change', { bubbles: true });
            inquilinoSelect.dispatchEvent(event);
        }
        if (mesSelect) {
            mesSelect.value = mes;
        }
        if (anioSelect) {
            anioSelect.value = anio;
        }
    }, 100);
}

async function abrirFormularioPagoMobiliario(inquilinoId, mes, anio) {
    window.vieneDeAdeudos = true;
    await mostrarFormularioPagoMobiliario(); // Open the mobiliario payment form
    setTimeout(async () => {
        const inquilinoSelect = document.getElementById('inquilinoId');
        const mesSelect = document.getElementById('mesCorrespondiente');
        const anioSelect = document.getElementById('anioCorrespondiente');

        if (inquilinoSelect) {
            inquilinoSelect.value = inquilinoId;
            const event = new Event('change', { bubbles: true });
            inquilinoSelect.dispatchEvent(event);
        }
        if (mesSelect) {
            mesSelect.value = mes;
        }
        if (anioSelect) {
            anioSelect.value = anio;
        }
    }, 100);
}

window.abrirFormularioPagoRenta = abrirFormularioPagoRenta;
window.abrirFormularioPagoServicio = abrirFormularioPagoServicio;
window.abrirFormularioPagoMobiliario = abrirFormularioPagoMobiliario;

// --- FUNCIONALIDAD DE CONSOLIDACIÓN HISTÓRICA ---
window.explicarConsolidacion = () => {
    Swal.fire({
        title: '¿Qué es Congelar Historial?',
        html: `
            <div class="text-left space-y-3 text-sm">
                <p>Esta herramienta sirve para <b>proteger tus recibos antiguos</b> cuando decides cambiar el día de pago de un inquilino.</p>
                <p>Al "congelar", el sistema guarda permanentemente las fechas del periodo (ej. "01 de Enero al 01 de Febrero") dentro de cada pago realizado hasta hoy.</p>
                <div class="bg-indigo-900/30 p-3 rounded-lg border border-indigo-500/30 italic text-indigo-200">
                    <b class="text-indigo-100">¿Cuándo usarlo?</b><br>
                    Úsalo SOLO si vas a cambiar el día de pago del inquilino y quieres que sus recibos pasados no se vean afectados por el cambio de fecha.
                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#4f46e5'
    });
};

window.iniciarConsolidacion = async (inquilinoId, nombreInquilino) => {
    const { value: diaAnterior } = await Swal.fire({
        title: 'Consolidación Histórica',
        text: `Ingresa el DÍA DE PAGO que tenía ${nombreInquilino} ANTES del cambio (1-31):`,
        input: 'number',
        inputAttributes: {
            min: 1,
            max: 31,
            step: 1
        },
        inputValue: 1,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
        footer: 'Esta acción fijará permanentemente los periodos en los recibos antiguos.'
    });

    if (diaAnterior) {
        const diaInt = parseInt(diaAnterior);
        if (isNaN(diaInt) || diaInt < 1 || diaInt > 31) {
            Swal.fire('Error', 'Por favor ingresa un día válido (1-31).', 'error');
            return;
        }

        const result = await Swal.fire({
            title: '¿Confirmar consolidación?',
            text: `Se fijarán todos los recibos antiguos usando el día ${diaInt} como corte. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, consolidar ahora',
            cancelButtonText: 'No, cancelar',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            mostrarLoader();
            try {
                const cantidad = await consolidarPagosAntiguos(inquilinoId, diaInt);
                Swal.fire({
                    title: '¡Éxito!',
                    text: `Se han consolidado y protegido ${cantidad} recibos antiguos.`,
                    icon: 'success',
                    confirmButtonColor: '#4f46e5'
                });
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Ocurrió un error al consolidar los pagos.', 'error');
            } finally {
                ocultarLoader();
            }
        }
    }
};
