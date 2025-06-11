// js/dashboard.js
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarNotificacion } from './ui.js';
import { mostrarInmuebles } from './inmuebles.js';

// Variables globales para listas de pagos
window.listaPagosPendientes = [];
window.listaPagosParciales = [];
window.listaPagosProximos = [];
window.listaPagosVencidos = [];

export async function mostrarDashboard() {
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

        const inquilinosMap = new Map();
inquilinosSnap.forEach(doc => {
    inquilinosMap.set(doc.id, doc.data().nombre);
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

            if (pago.estado === 'pendiente') {
                listaPagosPendientes.push({ id: doc.id, ...pago });
                if (diffDias >= 0 && diffDias <= diasAviso) {
                    pagosProximosAVencer++;
                    listaPagosProximos.push({ id: doc.id, ...pago });
                }
                if (diffDias < 0) {
                    listaPagosVencidos.push({ id: doc.id, ...pago });
                }
            } else if (pago.estado === 'parcial') {
                listaPagosParciales.push({ id: doc.id, ...pago });
                if (diffDias >= 0 && diffDias <= diasAviso) {
                    pagosProximosAVencer++;
                    listaPagosProximos.push({ id: doc.id, ...pago });
                }
                if (diffDias < 0) {
                    listaPagosVencidos.push({ id: doc.id, ...pago });
                }
            } else if (pago.estado === 'vencido') {
                listaPagosVencidos.push({ id: doc.id, ...pago });
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

        contenedor.innerHTML = `
            <h2 class="text-2xl font-semibold text-gray-700 mb-6">Dashboard General</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <a href="#inmuebles" class="block bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-indigo-500 text-white p-3 rounded-full">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 16h6m-1-4h.01M9 8h.01"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Inmuebles</p>
                            <p class="text-2xl font-bold text-gray-900">${totalInmuebles}</p>
                        </div>
                    </div>
                </a>

                <a href="#inmuebles?estado=ocupado" class="block bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-orange-500 text-white p-3 rounded-full">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Inmuebles Ocupados</p>
                            <p class="text-2xl font-bold text-gray-900">${inmueblesOcupados}</p>
                        </div>
                    </div>
                </a>

                <a href="#inmuebles?estado=disponible" class="block bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-teal-500 text-white p-3 rounded-full">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v-4m-2 4h4m6-12v4m-2-4h4m6 12v4m-2-4h4M3 12l.01-.01M12 3l.01-.01M12 21l.01-.01M21 12l.01-.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Inmuebles Disponibles</p>
                            <p class="text-2xl font-bold text-gray-900">${inmueblesDisponibles}</p>
                        </div>
                    </div>
                </a>

                <a href="#inquilinos" class="block bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-green-500 text-white p-3 rounded-full">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h2m0 0l4-4m-4 4V8m4 4h.01M9 20h.01"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Inquilinos</p>
                            <p class="text-2xl font-bold text-gray-900">${totalInquilinos}</p>
                        </div>
                    </div>
                </a>

                <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-yellow-500 text-white p-3 rounded-full">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V9m0 3v2m0 3.938A5.998 5.998 0 0021 12c0-3.313-2.917-6-6.5-6S3 8.687 3 12c0 1.76.711 3.364 1.865 4.606m6.135-1.606l4-4"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Ingresos ${nombreMesActual} ${currentYear}</p>
                            <p class="text-2xl font-bold text-green-600">$${ingresosEsteMes.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 bg-red-500 text-white p-3 rounded-full">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14S6 9 9 5c3 4 0 9 3 9s3-4 0-9c3 4 0 9 3 9"></path></svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Gastos ${nombreMesActual} ${currentYear}</p>
                            <p class="text-2xl font-bold text-red-600">$${gastosEsteMes.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Estado de Pagos</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="p-4 bg-blue-50 rounded-md text-center cursor-pointer hover:shadow" onclick="mostrarListaPagosDashboard('pendientes')">
                        <p class="text-sm font-medium text-blue-700">Pagos Pendientes</p>
                        <p class="text-3xl font-bold text-blue-800">${pagosPendientes}</p>
                    </div>
                    <div class="p-4 bg-yellow-50 rounded-md text-center cursor-pointer hover:shadow" onclick="mostrarListaPagosDashboard('parciales')">
                        <p class="text-sm font-medium text-yellow-700">Pagos Parciales</p>
                        <p class="text-3xl font-bold text-yellow-800">${pagosParciales}</p>
                    </div>
                    <div class="p-4 bg-orange-50 rounded-md text-center cursor-pointer hover:shadow" onclick="mostrarListaPagosDashboard('proximos')">
                        <p class="text-sm font-medium text-orange-700">Próximos a Vencer</p>
                        <p class="text-3xl font-bold text-orange-800">${pagosProximosAVencer}</p>
                    </div>
                    <div class="p-4 bg-red-50 rounded-md text-center cursor-pointer hover:shadow" onclick="mostrarListaPagosDashboard('vencidos')">
                        <p class="text-sm font-medium text-red-700">Pagos Vencidos</p>
                        <p class="text-3xl font-bold text-red-800">${listaPagosVencidos.length}</p>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        mostrarNotificacion("Error al cargar el dashboard.", 'error');
        contenedor.innerHTML = `<p class="text-red-600 text-center">Error al cargar los datos del dashboard.</p>`;
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
    if (tipo === 'pendientes') {
        lista = window.listaPagosPendientes;
        titulo = 'Pagos Pendientes';
    } else if (tipo === 'parciales') {
        lista = window.listaPagosParciales;
        titulo = 'Pagos Parciales';
    } else if (tipo === 'proximos') {
        lista = window.listaPagosProximos;
        titulo = 'Pagos Próximos a Vencer';
    } else if (tipo === 'vencidos') {
        lista = window.listaPagosVencidos;
        titulo = 'Pagos Vencidos';
    }

    let html = `
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-2xl font-bold text-center">${titulo}</h3>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inquilino</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes/Año</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    if (lista.length === 0) {
        html += `<tr><td colspan="6" class="text-center py-8 text-gray-500">No hay pagos en esta categoría.</td></tr>`;
    } else {
        lista.forEach(pago => {
    const nombreInquilino = (pago.nombreInquilino || (window.inquilinosMap && window.inquilinosMap.get(pago.inquilinoId))) || pago.inquilinoId;
    html += `
        <tr>
            <td class="px-4 py-2 text-sm text-gray-800">${nombreInquilino}</td>
            <td class="px-4 py-2 text-sm text-gray-700">
                ${
        pago.estado === 'Próximo (Ocupación)'
            ? (() => {
                const d = new Date(pago.proximoPago);
                const dia = String(d.getDate()+2).padStart(2, '0');
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const anio = d.getFullYear();
                return `${dia}/${mes}/${anio}`;
            })()
            : (pago.mesCorrespondiente || '') + ' / ' + (pago.anioCorrespondiente || '')
    }
            </td>
            <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoTotal || 0).toFixed(2)}</td>
            <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoPagado || 0).toFixed(2)}</td>
            <td class="px-4 py-2 text-sm text-gray-800">$${(pago.saldoPendiente || 0).toFixed(2)}</td>
            <td class="px-4 py-2 text-sm">${pago.estado}</td>
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
};