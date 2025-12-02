// js/dashboard.js
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { obtenerMesesAdeudadosHistorico } from './pagos.js';
import { db } from './firebaseConfig.js';
import { mostrarNotificacion } from './ui.js';
import { mostrarInmuebles } from './inmuebles.js';
import { cambiarEstadoCosto } from './mantenimientos.js';

// Variable para evitar mostrar notificación al recargar
const notificacionesIgnoradas = ["Asignaciones Actualizadas Correctamente"];

// Sobrescribir la función mostrarNotificacion para filtrar mensajes específicos
const originalMostrarNotificacion = window.mostrarNotificacion;
window.mostrarNotificacion = function(mensaje, tipo = 'info', duracion = 3500) {
    if (notificacionesIgnoradas.includes(mensaje)) {
        return; // No mostrar esta notificación
    }
    originalMostrarNotificacion(mensaje, tipo, duracion);
};

// Variable para controlar si ya se mostró la notificación de asignaciones
let notificacionAsignacionesMostrada = false;

// Variables globales para listas de pagos
window.listaPagosPendientes = [];
window.listaPagosParciales = [];
window.listaPagosProximos = [];
window.listaPagosVencidos = [];

// Variables para el caché del dashboard
let cachedDashboardHTML = null;
let dashboardCacheTimestamp = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos

import { mostrarRecordatoriosRenovacion } from './recordatorios.js';

async function mostrarMantenimientosPendientes() {
    const container = document.getElementById('mantenimientos-pendientes-lista');
    if (!container) {
        console.error("Elemento 'mantenimientos-pendientes-lista' no encontrado.");
        return;
    }

    try {
        const q = query(collection(db, "mantenimientos"), where("estado", "!=", "Completado"));
        const querySnapshot = await getDocs(q);
        const mantenimientos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const numPendientes = mantenimientos.length;

        // Crear la ficha con el número de mantenimientos pendientes
        const cardHtml = `
            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" id="card-mantenimientos-pendientes">
                <div class="flex flex-col items-center">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-md">
                        <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" d="M11.493 3.177a.75.75 0 011.06 0l3.18 3.18a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-3.18-3.18a.75.75 0 010-1.06l4.5-4.5zM12 15a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <p class="text-base sm:text-lg font-semibold text-yellow-700 text-center">Mantenimientos Pendientes</p>
                    <p class="text-3xl sm:text-4xl font-bold text-yellow-800 mt-1 sm:mt-2">${numPendientes}</p>
                </div>
            </div>
        `;

        container.innerHTML = cardHtml;

        if (numPendientes > 0) {
            const cardElement = document.getElementById('card-mantenimientos-pendientes');
            if (cardElement) {
                cardElement.addEventListener('click', () => {
                    mostrarModalMantenimientos(mantenimientos);
                });
            }
        }

    } catch (error) {
        console.error("Error al mostrar mantenimientos pendientes:", error);
        container.innerHTML = '<p class="text-red-500">Error al cargar los mantenimientos.</p>';
    }
}

async function mostrarModalMantenimientos(mantenimientos) {
    const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
    const inmueblesMap = new Map();
    inmueblesSnap.forEach(doc => {
        inmueblesMap.set(doc.id, doc.data().nombre);
    });

    const getStatusInfo = (estado) => {
        switch (estado) {
            case 'Pendiente':
                return { 
                    gradient: 'from-amber-400 to-yellow-500', 
                    text: 'text-white', 
                    icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                };
            case 'En Progreso':
                return { 
                    gradient: 'from-blue-400 to-indigo-500', 
                    text: 'text-white', 
                    icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5"></path></svg>'
                };
            case 'Cancelado':
                return { 
                    gradient: 'from-red-500 to-rose-500', 
                    text: 'text-white', 
                    icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                };
            default:
                return { 
                    gradient: 'from-gray-400 to-gray-500', 
                    text: 'text-white', 
                    icon: '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4c0-1.193.52-2.267 1.343-3.072M12 6V3m0 18v-3"></path></svg>'
                };
        }
    };

    let modalContent = `
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-t-lg -mx-6 -mt-6 mb-4 sm:mb-6 p-4 shadow-lg">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold flex items-center">
                    <svg class="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M11.493 3.177a.75.75 0 011.06 0l3.18 3.18a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-3.18-3.18a.75.75 0 010-1.06l4.5-4.5zM12 15a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
                    </svg>
                    Mantenimientos Pendientes
                </h3>
                <button onclick="ocultarModal()" class="text-gray-300 hover:text-white transition-colors duration-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 maintenance-cards-container">
    `;

    if (mantenimientos.length === 0) {
        modalContent += `
            <div class="col-span-full flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-xl text-gray-600 font-medium">No hay mantenimientos pendientes.</p>
            </div>
        `;
    } else {
        mantenimientos.forEach((mantenimiento, index) => {
            const nombreInmueble = inmueblesMap.get(mantenimiento.inmuebleId) || 'Inmueble no especificado';
            const statusInfo = getStatusInfo(mantenimiento.estado);
            modalContent += `
                <div class="maintenance-card bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300" style="animation-delay: ${index * 100}ms">
                    <div class="p-5">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xl font-bold text-gray-800 flex items-center">
                                <svg class="w-6 h-6 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                ${nombreInmueble}
                            </h4>
                            <span class="px-3 py-1 text-sm font-semibold rounded-full bg-gradient-to-r ${statusInfo.gradient} ${statusInfo.text} shadow-md animate-pulse">
                                ${mantenimiento.estado}
                            </span>
                        </div>
                        <p class="text-gray-600 mb-4">${mantenimiento.descripcion}</p>
                        <div class="border-t border-gray-200 pt-4 space-y-3 text-sm">
                            <p class="flex items-center"><svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="font-semibold mr-2">Costo:</span> ${mantenimiento.costo || 0}</p>
                            <p class="flex items-center"><svg class="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg><span class="font-semibold mr-2">Pagado por:</span> ${mantenimiento.pagadoPor || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-5 py-3 flex justify-end">
                        <button class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 transform hover:translate-y-px shadow-md" onclick="cambiarEstadoCosto('${mantenimiento.id}')">
                            <svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
                            Editar
                        </button>
                    </div>
                </div>
            `;
        });
    }

    modalContent += '</div>';
    mostrarModal(modalContent, true);
}

function adjuntarListenersDashboard() {
    // Re-adjuntar listeners que se pierden al cargar desde caché
    mostrarMantenimientosPendientes();

    const btnVerRenovaciones = document.getElementById('btnVerRenovaciones');
    if (btnVerRenovaciones) {
        btnVerRenovaciones.addEventListener('click', async () => {
            // Importar dinámicamente para evitar problemas de circularidad
            const { verificarContratosProximosARenovar, mostrarDetallesRenovacion } = await import('./recordatorios.js');
            const contratos = await verificarContratosProximosARenovar();
            mostrarDetallesRenovacion(contratos);
        });
    }
}

export async function mostrarDashboard() {
    
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección del dashboard.", 'error');
        return;
    }

    // --- Lógica de Caché ---
    if (cachedDashboardHTML && dashboardCacheTimestamp && (new Date() - dashboardCacheTimestamp < CACHE_DURATION_MS)) {
        console.log("Cargando dashboard desde la caché.");
        contenedor.innerHTML = cachedDashboardHTML;
        adjuntarListenersDashboard(); // Re-adjuntar listeners necesarios
        return; // Termina la ejecución para no volver a cargar datos
    }

    // Sobrescribir temporalmente la función mostrarNotificacion para evitar la notificación específica
    const originalMostrarNotificacion = window.mostrarNotificacion;
    window.mostrarNotificacion = function(mensaje, tipo) {
        if (mensaje === "Asignaciones Actualizadas Correctamente") {
            return; // No mostrar esta notificación específica
        }
        originalMostrarNotificacion(mensaje, tipo);
    };
    
    // Verificar contratos próximos a renovar
    mostrarRecordatoriosRenovacion();
    
    let totalInmuebles = 0;
    let totalInquilinos = 0;
    let inmueblesOcupados = 0; // NUEVO
    let inmueblesDisponibles = 0; // NUEVO
    let pagosPendientes = 0;
    let pagosParciales = 0;
    let pagosVencidos = 0;
    let ingresosEsteMes = 0;
    let ingresosRenta = 0;
    let ingresosDepositos = 0;
    let ingresosAbonosFavor = 0;
    let gastosEsteMes = 0;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const startDateOfMonth = `${currentYear}-${currentMonth}-01`;
    const endDateOfMonth = new Date(currentYear, today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Obtén el nombre del mes actual
    const mesesLargos = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const nombreMesActual = mesesLargos[today.getMonth()];

    try {
        // Conteo de Inmuebles y su estado (ocupado/disponible)
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        totalInmuebles = inmueblesSnap.size;

        let inmueblesOcupados = 0;
        let inmueblesDisponibles = 0;

        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            if (data.estado === "Ocupado") {
                inmueblesOcupados++;
            } else if (data.estado === "Disponible") {
                inmueblesDisponibles++;
            }
        });

        // Conteo de Inquilinos
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        totalInquilinos = inquilinosSnap.size; // Esto sigue siendo el total de inquilinos, no de inmuebles ocupados.

        // Crear un mapa de inmuebles para búsqueda rápida
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            console.log('Inmueble:', doc.id, data);
            inmueblesMap.set(doc.id, data.nombre);
        });

        // Crear el mapa de inquilinos con toda la información necesaria
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            console.log('Inquilino:', doc.id, data);
            inquilinosMap.set(doc.id, {
                nombre: data.nombre,
                inmuebleId: data.inmuebleAsociadoId,
                nombreInmueble: data.inmuebleAsociadoId ? inmueblesMap.get(data.inmuebleAsociadoId) || 'No especificado' : 'No especificado'
            });
        });
        window.inquilinosMap = inquilinosMap; // Hazlo global para usarlo en el modal

        // Conteo y Suma de Pagos
        const pagosSnap = await getDocs(collection(db, "pagos"));
        console.log('Fecha inicio mes:', startDateOfMonth);
        console.log('Fecha fin mes:', endDateOfMonth);
        
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            console.log('Procesando pago:', pago);

            // Normaliza fechaRealizado a string YYYY-MM-DD si es Timestamp
            let fechaRealizadoStr = pago.fechaRealizado;
            if (fechaRealizadoStr && typeof fechaRealizadoStr === 'object' && fechaRealizadoStr.toDate) {
                const d = fechaRealizadoStr.toDate();
                fechaRealizadoStr = d.toISOString().split('T')[0];
            }
            console.log('Fecha realizada:', fechaRealizadoStr);

            // Si no hay fechaRealizado, usar fechaRegistro
            if (!fechaRealizadoStr && pago.fechaRegistro) {
                if (typeof pago.fechaRegistro === 'object' && pago.fechaRegistro.toDate) {
                    const d = pago.fechaRegistro.toDate();
                    fechaRealizadoStr = d.toISOString().split('T')[0];
                } else {
                    fechaRealizadoStr = pago.fechaRegistro;
                }
                console.log('Usando fechaRegistro:', fechaRealizadoStr);
            }

            // Suma todos los pagos realizados este mes
            if (
                (pago.estado === 'pagado' || pago.estado === 'parcial') &&
                fechaRealizadoStr &&
                fechaRealizadoStr >= startDateOfMonth &&
                fechaRealizadoStr <= endDateOfMonth
            ) {
                const monto = pago.montoPagado || pago.montoTotal || 0;
                ingresosRenta += parseFloat(monto);
                console.log('Sumando a ingresosRenta:', monto, 'Total actual:', ingresosRenta);
            }
        });

        // Gastos del mes actual (mantenimientos)
        const mantenimientosQuery = query(
            collection(db, "mantenimientos"),
            where("fechaMantenimiento", ">=", startDateOfMonth),
            where("fechaMantenimiento", "<=", endDateOfMonth)
        );
        const mantenimientosSnap = await getDocs(mantenimientosQuery);
        mantenimientosSnap.forEach(doc => {
            const mantenimiento = doc.data();
            // Normaliza fecha a string YYYY-MM-DD si es Timestamp
            let fechaStr = mantenimiento.fechaMantenimiento;
            if (fechaStr && typeof fechaStr === 'object' && fechaStr.toDate) {
                const d = fechaStr.toDate();
                fechaStr = d.toISOString().split('T')[0];
            }
            // Solo suma si la fecha está dentro del mes actual
            if (
                fechaStr &&
                fechaStr >= startDateOfMonth &&
                fechaStr <= endDateOfMonth
            ) {
                gastosEsteMes += (mantenimiento.costo || 0);
                // Para depuración:
                console.log('Mantenimiento contado:', mantenimiento);
            }
        });

        // Agrega esto después de procesar pagosSnap.forEach...
        const diasAviso = 3;
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        let pagosProximosAVencer = 0;
        let listaPagosProximos = [];
        let listaPagosPendientes = [];
        let listaPagosParciales = [];
        let listaPagosVencidos = [];

        pagosSnap.forEach(doc => {
            const pago = doc.data();
            // Determinar fecha de vencimiento
            const mesIndex = meses.indexOf(pago.mesCorrespondiente);
            const fechaVencimiento = new Date(`${pago.anioCorrespondiente}-${String(mesIndex + 1).padStart(2, '0')}-${String(pago.diaPago || 1).padStart(2, '0')}`);
            const diffDias = Math.ceil((fechaVencimiento - today) / (1000 * 60 * 60 * 24));

            // Obtener información del inquilino y su inmueble
            const inquilinoData = inquilinosMap.get(pago.inquilinoId);
            const pagoConInfo = {
                ...pago,
                id: doc.id,
                nombreInquilino: inquilinoData ? inquilinoData.nombre : 'Inquilino Desconocido',
                nombreInmueble: inquilinoData ? inquilinoData.nombreInmueble : 'No especificado',
                fechaVencimiento: fechaVencimiento
            };

            if (pago.estado === 'pendiente') {
                listaPagosPendientes.push(pagoConInfo);
                if (diffDias >= 0 && diffDias <= diasAviso) {
                    pagosProximosAVencer++;
                    listaPagosProximos.push(pagoConInfo);
                }
                if (diffDias < 0) {
                    // Si la fecha actual es posterior a la fecha de vencimiento, está vencido
                    listaPagosVencidos.push(pagoConInfo);
                }
            } else if (pago.estado === 'parcial') {
                listaPagosParciales.push(pagoConInfo);
                if (diffDias >= 0 && diffDias <= diasAviso) {
                    pagosProximosAVencer++;
                    listaPagosProximos.push(pagoConInfo);
                }
                if (diffDias < 0) {
                    // Si la fecha actual es posterior a la fecha de vencimiento, está vencido
                    listaPagosVencidos.push(pagoConInfo);
                }
            } else if (pago.estado === 'vencido') {
                listaPagosVencidos.push(pagoConInfo);
            }
        });

        // --- Cálculo de inquilinos con pago próximo en 3 días SOLO usando fechaOcupacion ---
        const hoy = new Date();
hoy.setUTCHours(0, 0, 0, 0);

let inquilinosProximoPago = [];
inquilinosSnap.forEach(doc => {
    const inquilino = doc.data();
    if (!inquilino.activo) return;

    let fechaOcupacion = inquilino.fechaOcupacion;
    if (!fechaOcupacion) return;

    // Convierte a objeto Date si es string
    let fechaOcupacionDate = typeof fechaOcupacion === 'string'
        ? new Date(fechaOcupacion)
        : (fechaOcupacion.toDate ? fechaOcupacion.toDate() : null);

    if (!fechaOcupacionDate) return;

    // Calcula el próximo aniversario mensual de la fecha de ocupación
    let dia = fechaOcupacionDate.getDate();
    let proximoPago;
if (hoy.getDate() < dia) {
    proximoPago = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
} else {
    proximoPago = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia);
}
proximoPago.setHours(0, 0, 0, 0);

    const diffDias = Math.floor((proximoPago - hoy) / (1000 * 60 * 60 * 24));
    if (diffDias >= 0 && diffDias <= 3) {
        inquilinosProximoPago.push({
            id: doc.id,
            nombre: inquilino.nombre,
            inmueble: inquilino.nombreInmueble || '',
            proximoPago: proximoPago.toISOString().split('T')[0],
            diffDias
        });
        console.log('proximoPago calculado:', proximoPago.toISOString().split('T')[0], 'para inquilino', inquilino.nombre);
    }
});

        inquilinosProximoPago.forEach(iq => {
            // Evita duplicados si ya hay un pago próximo a vencer para este inquilino este mes
            const yaExiste = listaPagosProximos.some(p => p.inquilinoId === iq.id);
            if (!yaExiste) {
                listaPagosProximos.push({
                    inquilinoId: iq.id,
                    nombreInquilino: iq.nombre,
                    mesCorrespondiente: '', // Puedes dejarlo vacío o poner el mes de ocupación si quieres
                    anioCorrespondiente: '',
                    montoTotal: 0,
                    montoPagado: 0,
                    saldoPendiente: 0,
                    estado: 'Próximo (Ocupación)',
                    proximoPago: iq.proximoPago,
                    inmueble: iq.inmueble
                });
                pagosProximosAVencer++;
            }
        });

        // Sumar depósitos recibidos durante el mes en curso
        const depositosSnap = await getDocs(collection(db, "pagos"));
        depositosSnap.forEach(doc => {
            const deposito = doc.data();
            if (deposito.tipo === "deposito" && deposito.fechaRegistro) {
                // Normaliza fecha a string YYYY-MM-DD si es Timestamp
                let fechaDeposito = deposito.fechaRegistro;
                if (fechaDeposito && typeof fechaDeposito === 'object' && fechaDeposito.toDate) {
                    const d = fechaDeposito.toDate();
                    fechaDeposito = d.toISOString().split('T')[0];
                }
                console.log('Procesando depósito:', deposito);
                console.log('Fecha depósito:', fechaDeposito);

                // Verifica si el depósito es del mes en curso
                if (
                    fechaDeposito &&
                    fechaDeposito >= startDateOfMonth &&
                    fechaDeposito <= endDateOfMonth
                ) {
                    const monto = parseFloat(deposito.montoTotal) || 0;
                    ingresosDepositos += monto;
                    console.log('Sumando a ingresosDepositos:', monto, 'Total actual:', ingresosDepositos);
                }
            }
        });

        // Sumar abonos a saldo a favor realizados durante el mes en curso
        const abonosSnap = await getDocs(collection(db, "abonosSaldoFavor"));
        abonosSnap.forEach(doc => {
            const abono = doc.data();
            if (abono.fechaAbono) {
                let fechaAbono = abono.fechaAbono;
                if (fechaAbono && typeof fechaAbono === 'object' && fechaAbono.toDate) {
                    const d = fechaAbono.toDate();
                    fechaAbono = d.toISOString().split('T')[0];
                }
                console.log('Procesando abono:', abono);
                console.log('Fecha abono:', fechaAbono);

                if (
                    fechaAbono &&
                    fechaAbono >= startDateOfMonth &&
                    fechaAbono <= endDateOfMonth
                ) {
                    const monto = parseFloat(abono.monto) || 0;
                    ingresosAbonosFavor += monto;
                    console.log('Sumando a ingresosAbonosFavor:', monto, 'Total actual:', ingresosAbonosFavor);
                }
            }
        });

        // Suma total de todos los ingresos del mes
        ingresosEsteMes = ingresosRenta + ingresosDepositos + ingresosAbonosFavor;
        console.log('Totales finales:');
        console.log('Ingresos Renta:', ingresosRenta);
        console.log('Ingresos Depósitos:', ingresosDepositos);
        console.log('Ingresos Abonos:', ingresosAbonosFavor);
        console.log('Total Ingresos:', ingresosEsteMes);

        // Calcular adeudos históricos para cada inquilino activo
        const inquilinosActivos = Array.from(inquilinosSnap.docs)
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(inquilino => inquilino.activo);
            
        // Crear un mapa para almacenar adeudos por inquilino
        const adeudosPorInquilino = new Map();
        
        // Primero procesar los pagos vencidos existentes
        listaPagosVencidos.forEach(pago => {
            const inquilinoId = pago.inquilinoId;
            if (!adeudosPorInquilino.has(inquilinoId)) {
                adeudosPorInquilino.set(inquilinoId, {
                    inquilinoId: inquilinoId,
                    nombreInquilino: pago.nombreInquilino,
                    nombreInmueble: pago.nombreInmueble,
                    mesesAdeudados: [],
                    adeudosSet: new Set()
                });
            }
            
            const inquilinoAdeudos = adeudosPorInquilino.get(inquilinoId);
            // Verificar que mes y año no sean undefined o null
            if (pago.mesCorrespondiente && pago.anioCorrespondiente) {
                const key = `${inquilinoId}-${pago.mesCorrespondiente}-${pago.anioCorrespondiente}`;
                
                if (!inquilinoAdeudos.adeudosSet.has(key)) {
                    inquilinoAdeudos.mesesAdeudados.push({
                        mes: pago.mesCorrespondiente,
                        anio: pago.anioCorrespondiente,
                        montoTotal: pago.montoTotal || 0,
                        esAdeudoHistorico: false
                    });
                    inquilinoAdeudos.adeudosSet.add(key);
                }
            } else {
                console.log(`Pago sin mes o año correspondiente para inquilino ${pago.nombreInquilino || inquilinoId}:`, pago);
            }
        });
        
        // Luego calcular y añadir los adeudos históricos
        for (const inquilino of inquilinosActivos) {
            if (inquilino.fechaOcupacion && inquilino.inmuebleAsociadoId) {
                try {
                    const parts = inquilino.fechaOcupacion.split('-');
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const day = parseInt(parts[2], 10);
                    const fechaOcupacionCorrected = new Date(year, month, day);

                    const mesesAdeudados = await obtenerMesesAdeudadosHistorico(
                        inquilino.id,
                        inquilino.inmuebleAsociadoId,
                        fechaOcupacionCorrected
                    );
                    
                    // Asegurarse de que mesesAdeudados sea un array y tenga elementos
                    if (Array.isArray(mesesAdeudados) && mesesAdeudados.length > 0) {
                        if (!adeudosPorInquilino.has(inquilino.id)) {
                            adeudosPorInquilino.set(inquilino.id, {
                                inquilinoId: inquilino.id,
                                nombreInquilino: inquilino.nombre,
                                nombreInmueble: inquilinosMap.get(inquilino.id)?.nombreInmueble || 'No especificado',
                                mesesAdeudados: [],
                                adeudosSet: new Set()
                            });
                        }
                        
                        const inquilinoAdeudos = adeudosPorInquilino.get(inquilino.id);
                        
                        mesesAdeudados.forEach(mes => {
                            // Verificar que mes y año no sean undefined o null
                            if (mes && mes.mes && mes.anio) {
                                const key = `${inquilino.id}-${mes.mes}-${mes.anio}`;
                                if (!inquilinoAdeudos.adeudosSet.has(key)) {
                                    inquilinoAdeudos.mesesAdeudados.push({
                                        mes: mes.mes,
                                        anio: mes.anio,
                                        montoTotal: 0,
                                        esAdeudoHistorico: true
                                    });
                                    inquilinoAdeudos.adeudosSet.add(key);
                                }
                            } else {
                                console.log(`Mes adeudado histórico inválido para ${inquilino.nombre}:`, mes);
                            }
                        });
                    } else {
                        console.log(`No se encontraron meses adeudados históricos para ${inquilino.nombre}`);
                    }
                } catch (error) {
                    console.error(`Error al obtener meses adeudados para inquilino ${inquilino.id}:`, error);
                }
            } else {
                console.log(`Inquilino ${inquilino.nombre} (ID: ${inquilino.id}) no tiene fecha de ocupación o inmueble asociado`);
            }
        }
        
        // Limpiar la lista de pagos vencidos y reconstruirla con los adeudos agrupados
        listaPagosVencidos = [];
        
        // Convertir el mapa a un array y añadir a la lista de pagos vencidos
        adeudosPorInquilino.forEach(inquilinoAdeudos => {
            // Ordenar los meses adeudados por año y mes
            inquilinoAdeudos.mesesAdeudados.sort((a, b) => {
                if (a.anio !== b.anio) return a.anio - b.anio;
                
                const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                               "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                return meses.indexOf(a.mes) - meses.indexOf(b.mes);
            });
            
            // Añadir el total de adeudos
            inquilinoAdeudos.totalAdeudos = inquilinoAdeudos.mesesAdeudados.length;
            
            // Eliminar el set de control que ya no necesitamos
            delete inquilinoAdeudos.adeudosSet;
            
            // Añadir a la lista de pagos vencidos
            listaPagosVencidos.push(inquilinoAdeudos);
        });

        // Actualiza las listas globales de pagos
        window.listaPagosPendientes = listaPagosPendientes;
        window.listaPagosParciales = listaPagosParciales;
        window.listaPagosProximos = listaPagosProximos;
        window.listaPagosVencidos = listaPagosVencidos;

        // Actualizar contadores
        pagosPendientes = listaPagosPendientes.length;
        pagosParciales = listaPagosParciales.length;
        pagosVencidos = listaPagosVencidos.length;

        contenedor.innerHTML = `
            <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                <div class="py-4 sm:py-6">
                    <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8 text-center sm:text-left">Dashboard General</h2>

                    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                        <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm p-3 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 dashboard-card" onclick="mostrarInmuebles()">
                            <div class="flex flex-col items-center">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 shadow-md dashboard-card-icon-container">
                                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white dashboard-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                </div>
                                <p class="text-sm sm:text-lg font-semibold text-indigo-700 text-center dashboard-card-title">Total Inmuebles</p>
                                <p class="text-2xl sm:text-4xl font-bold text-indigo-800 mt-1 sm:mt-2 dashboard-card-value">${totalInmuebles}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-3 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 dashboard-card" onclick="mostrarInmuebles('Ocupado')">
                            <div class="flex flex-col items-center">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 shadow-md dashboard-card-icon-container">
                                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white dashboard-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <p class="text-sm sm:text-lg font-semibold text-orange-700 text-center dashboard-card-title">Inmuebles Ocupados</p>
                                <p class="text-2xl sm:text-4xl font-bold text-orange-800 mt-1 sm:mt-2 dashboard-card-value">${inmueblesOcupados}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl shadow-sm p-3 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 dashboard-card" onclick="mostrarInmuebles('Disponible')">
                            <div class="flex flex-col items-center">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 shadow-md dashboard-card-icon-container">
                                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white dashboard-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                </div>
                                <p class="text-sm sm:text-lg font-semibold text-teal-700 text-center dashboard-card-title">Inmuebles Disponibles</p>
                                <p class="text-2xl sm:text-4xl font-bold text-teal-800 mt-1 sm:mt-2 dashboard-card-value">${inmueblesDisponibles}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-3 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 dashboard-card" onclick="mostrarInquilinos()">
                            <div class="flex flex-col items-center">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-2 sm:mb-4 shadow-md dashboard-card-icon-container">
                                    <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white dashboard-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                    </svg>
                                </div>
                                <p class="text-sm sm:text-lg font-semibold text-green-700 text-center dashboard-card-title">Total Inquilinos</p>
                                <p class="text-2xl sm:text-4xl font-bold text-green-800 mt-1 sm:mt-2 dashboard-card-value">${totalInquilinos}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjetas de ingresos y gastos -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-4 sm:p-6">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div class="text-center sm:text-left">
                                    <p class="text-lg font-semibold text-emerald-700">Ingresos del Mes</p>
                                    <p class="text-3xl sm:text-4xl font-bold text-emerald-800 mt-2 break-words">${ingresosEsteMes.toFixed(2)}</p>
                                </div>
                                <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md mx-auto sm:mx-0">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm p-4 sm:p-6">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div class="text-center sm:text-left">
                                    <p class="text-lg font-semibold text-rose-700">Gastos del Mes</p>
                                    <p class="text-3xl sm:text-4xl font-bold text-rose-800 mt-2 break-words">${gastosEsteMes.toFixed(2)}</p>
                                </div>
                                <div class="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center shadow-md mx-auto sm:mx-0">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Estado de Pagos -->
                    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-8">
                        <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center sm:text-left">Estado de Pagos</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                            <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('parciales')">
                                <div class="flex flex-col items-center">
                                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-md">
                                        <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-base sm:text-lg font-semibold text-emerald-700 text-center">Pagos Parciales</p>
                                    <p class="text-3xl sm:text-4xl font-bold text-emerald-800 mt-1 sm:mt-2">${pagosParciales}</p>
                                </div>
                            </div>

                            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('proximos')">
                                <div class="flex flex-col items-center">
                                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-md">
                                        <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-base sm:text-lg font-semibold text-orange-700 text-center">Próximos a Vencer</p>
                                    <p class="text-3xl sm:text-4xl font-bold text-orange-800 mt-1 sm:mt-2">${pagosProximosAVencer}</p>
                                </div>
                            </div>

                            <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('vencidos')">
                                <div class="flex flex-col items-center">
                                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-md">
                                        <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-base sm:text-lg font-semibold text-rose-700 text-center">Pagos Vencidos y Adeudos</p>
                                    <p class="text-3xl sm:text-4xl font-bold text-rose-800 mt-1 sm:mt-2">${listaPagosVencidos.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Mantenimientos Pendientes -->
                    <div id="mantenimientos-pendientes-container" class="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-8">
                        <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center sm:text-left">Mantenimientos Pendientes</h3>
                        <div id="mantenimientos-pendientes-lista" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Las tarjetas de mantenimientos se insertarán aquí -->
                        </div>
                    </div>
                    
                    <!-- Recordatorios de Renovación de Contratos -->
                    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-yellow-100">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                            <h3 class="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left">Renovación de Contratos</h3>
                            <button id="btnVerRenovaciones" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md shadow-md transition-colors duration-200 flex items-center justify-center gap-2 w-full sm:w-auto">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Renovaciones
                            </button>
                        </div>
                        <p class="text-gray-600 mb-4 text-sm sm:text-base">Los contratos se renuevan cada 6 meses. El sistema mostrará recordatorios 15 días antes de la fecha de renovación.</p>
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 rounded-r-lg">
                            <div class="flex items-start">
                                <div class="flex-shrink-0 mt-0.5">
                                    <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-yellow-700">
                                        Recuerda contactar a los inquilinos con anticipación para gestionar la renovación de sus contratos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Guardar el HTML generado y la marca de tiempo en el caché
        cachedDashboardHTML = contenedor.innerHTML;
        dashboardCacheTimestamp = new Date();
        console.log("Dashboard guardado en caché.");
        adjuntarListenersDashboard();
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        mostrarNotificacion("Error al cargar el dashboard.", 'error');
        contenedor.innerHTML = `<p class="text-red-600 text-center">Error al cargar los datos del dashboard.</p>`;
    } finally {
        // Restaurar la función original de mostrarNotificacion
        if (window.mostrarNotificacion !== mostrarNotificacion) {
            window.mostrarNotificacion = mostrarNotificacion;
        }
    }
}

export async function mostrarInmueblesFiltrados(estado) {
    // Llama a mostrarInmuebles con un filtro de estado
    await mostrarInmuebles(estado);
}

window.mostrarInmueblesFiltrados = mostrarInmueblesFiltrados;

window.cambiarEstadoCosto = cambiarEstadoCosto;
window.mostrarListaPagosDashboard = function(tipo) {
    console.log(`Mostrando lista de pagos tipo: ${tipo}`);
    
    let lista = [];
    let titulo = '';
    let colorFondo = '';
    let colorTexto = '';
    let colorBorde = '';
    let colorIcono = '';
    let colorGradiente = '';
    
    if (tipo === 'pendientes') {
        lista = window.listaPagosPendientes;
        titulo = 'Pagos Pendientes';
        colorFondo = 'bg-blue-600';
        colorTexto = 'text-blue-700';
        colorBorde = 'border-blue-200';
        colorIcono = 'text-blue-500';
        colorGradiente = 'from-blue-50 to-blue-100';
    } else if (tipo === 'parciales') {
        lista = window.listaPagosParciales;
        titulo = 'Pagos Parciales';
        colorFondo = 'bg-emerald-600';
        colorTexto = 'text-emerald-700';
        colorBorde = 'border-emerald-200';
        colorIcono = 'text-emerald-500';
        colorGradiente = 'from-emerald-50 to-emerald-100';
    } else if (tipo === 'proximos') {
        lista = window.listaPagosProximos;
        titulo = 'Pagos Próximos a Vencer';
        colorFondo = 'bg-orange-600';
        colorTexto = 'text-orange-700';
        colorBorde = 'border-orange-200';
        colorIcono = 'text-orange-500';
        colorGradiente = 'from-orange-50 to-orange-100';
    } else if (tipo === 'vencidos') {
        lista = window.listaPagosVencidos;
        titulo = 'Pagos Vencidos y Adeudos';
        colorFondo = 'bg-red-600';
        colorTexto = 'text-red-700';
        colorBorde = 'border-red-200';
        colorIcono = 'text-red-500';
        colorGradiente = 'from-red-50 to-red-100';
        
        console.log(`Lista de pagos vencidos:`, lista);
        
        // Agrupar adeudos por inquilino
        const adeudosPorInquilino = new Map();
        
        // Verificar si la lista contiene objetos con mesesAdeudados
        const tieneObjetosConMesesAdeudados = lista.some(item => item.mesesAdeudados && Array.isArray(item.mesesAdeudados));
        
        if (tieneObjetosConMesesAdeudados) {
            // La lista ya contiene objetos agrupados con mesesAdeudados
            console.log("La lista ya contiene objetos agrupados con mesesAdeudados");
            lista.forEach(inquilino => {
                if (inquilino.inquilinoId && inquilino.mesesAdeudados) {
                    adeudosPorInquilino.set(inquilino.inquilinoId, {
                        inquilinoId: inquilino.inquilinoId,
                        nombreInquilino: inquilino.nombreInquilino,
                        nombreInmueble: inquilino.nombreInmueble,
                        mesesAdeudados: Array.isArray(inquilino.mesesAdeudados) ? inquilino.mesesAdeudados : [],
                        totalAdeudos: inquilino.totalAdeudos || 0
                    });
                }
            });
        } else {
            // Procesar pagos individuales
            console.log("Procesando pagos individuales para agrupar por inquilino");
            lista.forEach(pago => {
                const inquilinoId = pago.inquilinoId;
                if (!inquilinoId) {
                    console.error("Pago sin inquilinoId:", pago);
                    return;
                }
                
                if (!adeudosPorInquilino.has(inquilinoId)) {
                    adeudosPorInquilino.set(inquilinoId, {
                        inquilinoId: inquilinoId,
                        nombreInquilino: pago.nombreInquilino || "Inquilino sin nombre",
                        nombreInmueble: pago.nombreInmueble || "Inmueble no especificado",
                        mesesAdeudados: [],
                        totalAdeudos: 0
                    });
                }
                
                const inquilinoAdeudos = adeudosPorInquilino.get(inquilinoId);
                // Verificar que mes y año no sean undefined o null
                if (pago.mesCorrespondiente && pago.anioCorrespondiente) {
                    inquilinoAdeudos.mesesAdeudados.push({
                        mes: pago.mesCorrespondiente,
                        anio: pago.anioCorrespondiente,
                        montoTotal: pago.montoTotal || 0,
                        esAdeudoHistorico: pago.esAdeudoHistorico || false
                    });
                    inquilinoAdeudos.totalAdeudos++;
                    console.log(`Agregado mes adeudado: ${pago.mesCorrespondiente} ${pago.anioCorrespondiente} para ${pago.nombreInquilino || inquilinoId}`);
                } else {
                    console.log(`Pago sin mes o año correspondiente para inquilino ${pago.nombreInquilino || inquilinoId}`);
                }
            });
        }
        
        // Asegurarse de que cada inquilino tenga sus meses adeudados correctamente
        adeudosPorInquilino.forEach((inquilino) => {
            // Verificar si hay meses adeudados y ordenarlos
            if (inquilino.mesesAdeudados && Array.isArray(inquilino.mesesAdeudados)) {
                // Filtrar meses inválidos
                inquilino.mesesAdeudados = inquilino.mesesAdeudados.filter(mes => mes && mes.mes && mes.anio);
                
                if (inquilino.mesesAdeudados.length > 0) {
                    // Ordenar por año y mes
                    inquilino.mesesAdeudados.sort((a, b) => {
                        if (a.anio !== b.anio) return parseInt(a.anio) - parseInt(b.anio);
                        
                        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                                      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                        return meses.indexOf(a.mes) - meses.indexOf(b.mes);
                    });
                    
                    // Asegurarse de que el total de adeudos sea correcto
                    inquilino.totalAdeudos = inquilino.mesesAdeudados.length;
                    
                    // Crear una lista de meses adeudados como texto para mostrar en el resumen
                    inquilino.resumenAdeudos = inquilino.mesesAdeudados
                        .map(mes => `${mes.mes} ${mes.anio}`)
                        .join(', ');
                } else {
                    inquilino.totalAdeudos = 0;
                    inquilino.resumenAdeudos = "No hay meses adeudados";
                }
            } else {
                inquilino.mesesAdeudados = [];
                inquilino.totalAdeudos = 0;
                inquilino.resumenAdeudos = "No hay meses adeudados";
            }
            
            // Depuración para verificar los meses adeudados
            console.log(`Inquilino: ${inquilino.nombreInquilino}, Meses adeudados: ${inquilino.totalAdeudos}`, 
                        inquilino.mesesAdeudados ? JSON.stringify(inquilino.mesesAdeudados) : "[]");
        });
        
        // Reemplazar la lista original con la lista agrupada
        lista = Array.from(adeudosPorInquilino.values());
        
        // Ordenar la lista por nombre de inquilino
        lista.sort((a, b) => a.nombreInquilino.localeCompare(b.nombreInquilino));
    }

    let html = `
        <div class="px-3 sm:px-4 py-3 ${colorFondo} text-white rounded-t-lg -mx-6 -mt-6 mb-4 sm:mb-6 modal-header-responsive">
            <div class="flex items-center justify-between">
                <h3 class="text-xl sm:text-2xl font-bold modal-title-responsive">${titulo}</h3>
                <button onclick="ocultarModal()" class="text-white hover:text-gray-200 transition-colors duration-200">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="overflow-x-auto -mx-6 px-3 sm:px-6 modal-responsive-padding">
            ${lista.length === 0 ? `
                <div class="flex flex-col items-center justify-center py-8 sm:py-12 bg-gradient-to-br ${colorGradiente} rounded-lg">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 ${colorIcono} mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg sm:text-xl text-gray-600 font-medium">No hay pagos en esta categoría</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 gap-4 sm:gap-6 modal-grid-responsive">
                    ${tipo === 'vencidos' ? 
                        // Vista agrupada por inquilino para pagos vencidos
                        lista.map(inquilino => `
                            <div class="bg-white rounded-lg shadow-sm border ${colorBorde} hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                                <div class="p-3 sm:p-6">
                                    <!-- Encabezado con información del inquilino -->
                                    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                                        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${colorGradiente} flex items-center justify-center">
                                            <svg class="w-6 h-6 ${colorIcono}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="text-lg font-bold text-gray-900">${inquilino.nombreInquilino}</h4>
                                            <p class="text-sm text-gray-600">${inquilino.nombreInmueble}</p>
                                        </div>
                                        <div class="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                                            ${inquilino.totalAdeudos} adeudo${inquilino.totalAdeudos !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    
                                    <!-- Lista de meses adeudados -->
                                    <div class="space-y-2">
                                        <div class="flex justify-between items-center mb-2">
                                            <h5 class="text-sm font-semibold text-gray-700">Meses adeudados:</h5>
                                            <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                                                ${inquilino.totalAdeudos} mes(es)
                                            </span>
                                        </div>
                                        <!-- Resumen de meses adeudados -->
                                        <div class="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
                                            <p class="text-sm text-red-800 font-medium">
                                                ${inquilino.mesesAdeudados && Array.isArray(inquilino.mesesAdeudados) && inquilino.mesesAdeudados.length > 0 ? 
                                                    inquilino.mesesAdeudados.map(mes => `${mes.mes} ${mes.anio}`).join(', ') : 
                                                    'No hay meses adeudados'}
                                            </p>
                                        </div>
                                        
                                        <!-- Detalle de meses adeudados -->
                                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            ${inquilino.mesesAdeudados && Array.isArray(inquilino.mesesAdeudados) && inquilino.mesesAdeudados.length > 0 ? 
                                                inquilino.mesesAdeudados.map(mes => `
                                                    <div class="bg-red-50 border border-red-100 rounded-lg p-2 text-center">
                                                        <p class="font-medium text-red-800">${mes.mes && mes.anio ? `${mes.mes} ${mes.anio}` : 'Mes pendiente'}</p>
                                                        ${mes.rentaPendiente && mes.serviciosPendientes ? 
                                                            `<span class="text-xs text-red-600 block mt-1">Renta y Servicios Pendientes</span>` : 
                                                            mes.rentaPendiente ? 
                                                                `<span class="text-xs text-red-600 block mt-1">Renta Pendiente</span>` : 
                                                                `<span class="text-xs text-red-600 block mt-1">Servicios Pendientes</span>`
                                                        }
                                                    </div>
                                                `).join('') : 
                                                `<div class="col-span-2 sm:col-span-3 md:col-span-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                                                    <p class="text-gray-500">No hay meses adeudados registrados</p>
                                                </div>`
                                            }
                                        </div>
                                    </div>
                                    

                                </div>
                            </div>
                        `).join('')
                    : 
                        // Vista normal para otros tipos de pagos
                        lista.map(pago => {
                            const inquilinoData = window.inquilinosMap && window.inquilinosMap.get(pago.inquilinoId);
                            const nombreInquilino = (pago.nombreInquilino || (inquilinoData && inquilinoData.nombre)) || pago.inquilinoId;
                            const nombreInmueble = pago.nombreInmueble || (inquilinoData && inquilinoData.nombreInmueble) || 'No especificado';
                            const fechaPago = pago.estado === 'Próximo (Ocupación)'
                                ? (() => {
                                    const d = new Date(pago.proximoPago);
                                    const dia = String(d.getDate()+2).padStart(2, '0');
                                    const mes = String(d.getMonth() + 1).padStart(2, '0');
                                    const anio = d.getFullYear();
                                    return `${dia}/${mes}/${anio}`;
                                })()
                                : (pago.mesCorrespondiente || '') + ' / ' + (pago.anioCorrespondiente || '');

                            return `
                                <div class="bg-white rounded-lg shadow-sm border ${colorBorde} hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                                    <div class="p-3 sm:p-6">
                                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6">
                                            <!-- Información del Inquilino -->
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${colorGradiente} flex items-center justify-center">
                                                        <svg class="w-5 h-5 sm:w-6 sm:h-6 ${colorIcono}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                    <h4 class="text-base sm:text-lg font-semibold text-gray-900">${nombreInquilino}</h4>
                                                    <p class="text-xs sm:text-sm text-gray-500">Inquilino</p>
                                                </div>
                                            </div>
                                            
                                            <!-- Información del Inmueble -->
                                            <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${colorGradiente} flex items-center justify-center">
                                                    <svg class="w-5 h-5 sm:w-6 sm:h-6 ${colorIcono}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 class="text-base sm:text-lg font-semibold text-gray-900">${nombreInmueble}</h4>
                                                    <p class="text-xs sm:text-sm text-gray-500">Inmueble</p>
                                                </div>
                                            </div>

                                            <!-- Detalles del Pago -->
                                            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                                                ${pago.esAdeudoHistorico ? `
                                                <div class="col-span-2 md:col-span-4 bg-red-100 border-l-4 border-red-500 p-2 sm:p-3 rounded-r-lg">
                                                    <div class="flex items-center">
                                                        <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        <p class="text-xs sm:text-sm text-red-700">
                                                            Adeudo histórico detectado. Se requiere regularización.
                                                        </p>
                                                    </div>
                                                </div>
                                                ` : ''}
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-2 sm:p-4 shadow-sm">
                                                    <p class="text-xs sm:text-sm font-medium ${colorTexto}">Fecha</p>
                                                    <p class="text-xs sm:text-sm font-semibold text-gray-900 mt-1">${fechaPago}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-2 sm:p-4 shadow-sm">
                                                    <p class="text-xs sm:text-sm font-medium ${colorTexto}">Monto Total</p>
                                                    <p class="text-xs sm:text-sm font-semibold text-gray-900 mt-1">${pago.esAdeudoHistorico ? 'Pendiente' : (pago.montoTotal || 0).toFixed(2)}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-2 sm:p-4 shadow-sm">
                                                    <p class="text-xs sm:text-sm font-medium ${colorTexto}">Pagado</p>
                                                    <p class="text-xs sm:text-sm font-semibold text-gray-900 mt-1">${(pago.montoPagado || 0).toFixed(2)}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-2 sm:p-4 shadow-sm">
                                                    <p class="text-xs sm:text-sm font-medium ${colorTexto}">Pendiente</p>
                                                    <p class="text-xs sm:text-sm font-semibold text-gray-900 mt-1">${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Estado -->
                                        <div class="flex items-center justify-center md:justify-end mt-3 md:mt-0">
                                            <span class="px-3 sm:px-4 py-1.5 sm:py-2 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full ${colorTexto} bg-opacity-10 bg-gradient-to-r ${colorGradiente}">
                                                ${pago.estado}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>

        <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button type="button" onclick="ocultarModal()" class="bg-gradient-to-r ${colorGradiente} hover:opacity-90 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-all duration-200 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cerrar
            </button>
        </div>
    `;
    mostrarModal(html);
};

// Asegurarse de que la función mostrarModal esté definida
window.mostrarModal = function(contenido, animated = false) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
    }

    modalContainer.className = `fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4`;
    
    const animationClasses = animated ? 'animate-fade-in-up' : '';

    modalContainer.innerHTML = `
        <div id="modal-content" class="relative mx-auto shadow-2xl rounded-xl bg-gray-50 w-11/12 md:w-4/5 lg:w-3/4 max-w-4xl ${animationClasses}">
            <div class="p-6">
                ${contenido}
            </div>
        </div>
    `;

    // Add CSS for animations if not already present
    if (!document.getElementById('modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.innerHTML = `
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.5s ease-out forwards;
            }
            .maintenance-card {
                opacity: 0;
                transform: translateY(20px);
                animation: fade-in-up 0.5s ease-out forwards;
            }
            .maintenance-cards-container {
                perspective: 1000px;
            }
        `;
        document.head.appendChild(style);
    }
};

// Asegurarse de que la función ocultarModal esté definida
window.ocultarModal = function() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.remove();
    }
};
window.cambiarEstadoCosto = cambiarEstadoCosto;