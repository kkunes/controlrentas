// js/dashboard.js
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarNotificacion } from './ui.js';
import { mostrarInmuebles } from './inmuebles.js';

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

import { mostrarRecordatoriosRenovacion } from './recordatorios.js';

export async function mostrarDashboard() {
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
    
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección del dashboard.", 'error');
        return;
    }

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

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesOcupadosSet = new Set(); // Usaremos un Set para evitar duplicados de inmuebles ocupados

        inquilinosSnap.forEach(doc => {
            const inquilino = doc.data();
            if (inquilino.inmuebleId) { // Si el inquilino está asociado a un inmueble
                inmueblesOcupadosSet.add(inquilino.inmuebleId);
            }
        });
        inmueblesOcupados = inmueblesOcupadosSet.size;
        inmueblesDisponibles = totalInmuebles - inmueblesOcupados;

        // Conteo de Inquilinos
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
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="py-6">
                    <h2 class="text-3xl font-bold text-gray-900 mb-8">Dashboard General</h2>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarInmuebles()">
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                </div>
                                <p class="text-lg font-semibold text-indigo-700">Total Inmuebles</p>
                                <p class="text-4xl font-bold text-indigo-800 mt-2">${totalInmuebles}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarInmuebles('Ocupado')">
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                                <p class="text-lg font-semibold text-orange-700">Inmuebles Ocupados</p>
                                <p class="text-4xl font-bold text-orange-800 mt-2">${inmueblesOcupados}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarInmuebles('Disponible')">
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                    </svg>
                                </div>
                                <p class="text-lg font-semibold text-teal-700 text-center">Inmuebles Disponibles</p>
                                <p class="text-4xl font-bold text-teal-800 mt-2">${inmueblesDisponibles}</p>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarInquilinos()">
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                    </svg>
                                </div>
                                <p class="text-lg font-semibold text-green-700">Total Inquilinos</p>
                                <p class="text-4xl font-bold text-green-800 mt-2">${totalInquilinos}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjetas de ingresos y gastos -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-lg font-semibold text-emerald-700">Ingresos del Mes</p>
                                    <p class="text-4xl font-bold text-emerald-800 mt-2">$${ingresosEsteMes.toFixed(2)}</p>
                                </div>
                                <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-lg font-semibold text-rose-700">Gastos del Mes</p>
                                    <p class="text-4xl font-bold text-rose-800 mt-2">$${gastosEsteMes.toFixed(2)}</p>
                                </div>
                                <div class="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center shadow-md">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Estado de Pagos -->
                    <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-6">Estado de Pagos</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('parciales')">
                                <div class="flex flex-col items-center">
                                    <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-lg font-semibold text-emerald-700">Pagos Parciales</p>
                                    <p class="text-4xl font-bold text-emerald-800 mt-2">${pagosParciales}</p>
                                </div>
                            </div>

                            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('proximos')">
                                <div class="flex flex-col items-center">
                                    <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-lg font-semibold text-orange-700">Próximos a Vencer</p>
                                    <p class="text-4xl font-bold text-orange-800 mt-2">${pagosProximosAVencer}</p>
                                </div>
                            </div>

                            <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" onclick="mostrarListaPagosDashboard('vencidos')">
                                <div class="flex flex-col items-center">
                                    <div class="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                    <p class="text-lg font-semibold text-rose-700">Pagos Vencidos</p>
                                    <p class="text-4xl font-bold text-rose-800 mt-2">${listaPagosVencidos.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recordatorios de Renovación de Contratos -->
                    <div class="bg-white rounded-xl shadow-lg p-6 border border-yellow-100">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-2xl font-bold text-gray-900">Renovación de Contratos</h3>
                            <button id="btnVerRenovaciones" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Renovaciones
                            </button>
                        </div>
                        <p class="text-gray-600 mb-4">Los contratos se renuevan cada 6 meses. El sistema mostrará recordatorios 15 días antes de la fecha de renovación.</p>
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                            <div class="flex">
                                <div class="flex-shrink-0">
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
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        mostrarNotificacion("Error al cargar el dashboard.", 'error');
        contenedor.innerHTML = `<p class="text-red-600 text-center">Error al cargar los datos del dashboard.</p>`;
    } finally {
        // Restaurar la función original de mostrarNotificacion
        if (window.mostrarNotificacion !== mostrarNotificacion) {
            window.mostrarNotificacion = mostrarNotificacion;
        }
        
        // Agregar event listener para el botón de ver renovaciones
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
}

export async function mostrarInmueblesFiltrados(estado) {
    // Llama a mostrarInmuebles con un filtro de estado
    await mostrarInmuebles(estado);
}

window.mostrarInmueblesFiltrados = mostrarInmueblesFiltrados;

window.mostrarListaPagosDashboard = function(tipo) {
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
        titulo = 'Pagos Vencidos';
        colorFondo = 'bg-red-600';
        colorTexto = 'text-red-700';
        colorBorde = 'border-red-200';
        colorIcono = 'text-red-500';
        colorGradiente = 'from-red-50 to-red-100';
    }

    let html = `
        <div class="px-4 py-3 ${colorFondo} text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <div class="flex items-center justify-between">
                <h3 class="text-2xl font-bold">${titulo}</h3>
                <button onclick="ocultarModal()" class="text-white hover:text-gray-200 transition-colors duration-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>

        <div class="overflow-x-auto -mx-6 px-6">
            ${lista.length === 0 ? `
                <div class="flex flex-col items-center justify-center py-12 bg-gradient-to-br ${colorGradiente} rounded-lg">
                    <svg class="w-16 h-16 ${colorIcono} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-xl text-gray-600 font-medium">No hay pagos en esta categoría</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 gap-6">
                    ${lista.map(pago => {
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
                                <div class="p-6">
                                    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                                        <!-- Información del Inquilino -->
                                        <div class="flex-1">
                                            <div class="flex items-center gap-3 mb-4">
                                                <div class="w-12 h-12 rounded-full bg-gradient-to-br ${colorGradiente} flex items-center justify-center">
                                                    <svg class="w-6 h-6 ${colorIcono}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 class="text-lg font-semibold text-gray-900">${nombreInquilino}</h4>
                                                    <p class="text-sm text-gray-500">Inquilino</p>
                                                </div>
                                            </div>
                                            
                                            <!-- Información del Inmueble -->
                                            <div class="flex items-center gap-3 mb-4">
                                                <div class="w-12 h-12 rounded-full bg-gradient-to-br ${colorGradiente} flex items-center justify-center">
                                                    <svg class="w-6 h-6 ${colorIcono}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 class="text-lg font-semibold text-gray-900">${nombreInmueble}</h4>
                                                    <p class="text-sm text-gray-500">Inmueble</p>
                                                </div>
                                            </div>

                                            <!-- Detalles del Pago -->
                                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-4 shadow-sm">
                                                    <p class="text-sm font-medium ${colorTexto}">Fecha</p>
                                                    <p class="text-sm font-semibold text-gray-900 mt-1">${fechaPago}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-4 shadow-sm">
                                                    <p class="text-sm font-medium ${colorTexto}">Monto Total</p>
                                                    <p class="text-sm font-semibold text-gray-900 mt-1">$${(pago.montoTotal || 0).toFixed(2)}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-4 shadow-sm">
                                                    <p class="text-sm font-medium ${colorTexto}">Pagado</p>
                                                    <p class="text-sm font-semibold text-gray-900 mt-1">$${(pago.montoPagado || 0).toFixed(2)}</p>
                                                </div>
                                                <div class="bg-gradient-to-br ${colorGradiente} rounded-lg p-4 shadow-sm">
                                                    <p class="text-sm font-medium ${colorTexto}">Pendiente</p>
                                                    <p class="text-sm font-semibold text-gray-900 mt-1">$${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Estado -->
                                        <div class="flex items-center justify-end">
                                            <span class="px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${colorTexto} bg-opacity-10 bg-gradient-to-r ${colorGradiente}">
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
window.mostrarModal = function(contenido) {
    // Crear el contenedor del modal si no existe
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        modalContainer.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        document.body.appendChild(modalContainer);
    }

    // Crear el contenido del modal
    modalContainer.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-lg bg-white">
            ${contenido}
        </div>
    `;
};

// Asegurarse de que la función ocultarModal esté definida
window.ocultarModal = function() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.remove();
    }
};