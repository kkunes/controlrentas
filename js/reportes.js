import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarNotificacion } from './ui.js';

/**
 * Muestra la sección principal de reportes y configura los selectores de mes/año.
 */
export async function mostrarReportes() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de reportes.", 'error');
        return;
    }

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const anioActual = new Date().getFullYear();
    const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);

    let aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');
    let mesesOptions = meses.map((mes, index) => `<option value="${index + 1}">${mes}</option>`).join('');

    contenedor.innerHTML = `
        <div class="w-full max-w-full overflow-x-hidden">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <h2 class="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Generador de Reportes
                </h2>
            </div>

            <div class="bg-white rounded-lg shadow-sm p-2 sm:p-4 mb-3 border border-gray-100">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    Reporte Mensual
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                    <div class="relative">
                        <label for="selectMes" class="block text-xs font-medium text-gray-700 mb-1">Mes</label>
                        <div class="relative">
                            <select id="selectMes" class="block w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700">
                                ${mesesOptions}
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="relative">
                        <label for="selectAnio" class="block text-xs font-medium text-gray-700 mb-1">Año</label>
                        <div class="relative">
                            <select id="selectAnio" class="block w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-700">
                                ${aniosOptions}
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-end">
                        <button id="generarReporteBtn" class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-2 py-1.5 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center text-sm font-medium">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Generar Reporte
                        </button>
                    </div>
                </div>
                <div id="reporteResultado" class="mt-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                    <p class="text-xs text-gray-500 text-center">Selecciona un mes y año y haz clic en "Generar Reporte".</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('selectMes').value = new Date().getMonth() + 1;
    document.getElementById('selectAnio').value = new Date().getFullYear();

    document.getElementById('generarReporteBtn').addEventListener('click', async () => {
        const mesSeleccionado = document.getElementById('selectMes').value;
        const anioSeleccionado = document.getElementById('selectAnio').value;
        await generarReporteMensual(parseInt(mesSeleccionado), parseInt(anioSeleccionado));
    });

    await generarReporteMensual(new Date().getMonth() + 1, new Date().getFullYear());
}

/**
 * Genera y muestra el reporte mensual de ingresos y gastos.
 * @param {number} mes - El mes (1-12).
 * @param {number} anio - El año.
 */
async function generarReporteMensual(mes, anio) {
    const resultadoDiv = document.getElementById('reporteResultado');
    resultadoDiv.innerHTML = '<p class="text-center text-xs text-gray-500">Generando reporte...</p>';

    try {
        let totalIngresos = 0;
        let totalGastos = 0;
        let listaDetalladaMovimientosHtml = '';

        // Sumas independientes de servicios
        let totalInternet = 0;
        let totalAgua = 0;
        let totalLuz = 0;

        // Calcular fechas del mes en formato YYYY-MM-DD
        const startOfMonth = `${anio}-${String(mes).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(anio, mes, 0).getDate();
        const endOfMonth = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

        // Obtener nombres de inmuebles e inquilinos
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => inmueblesMap.set(doc.id, doc.data().nombre));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => inquilinosMap.set(doc.id, doc.data().nombre));

        // 1. Obtener TODOS los pagos para sumar todos los pagos realizados
        const pagosRef = collection(db, "pagos");
        const pagosSnap = await getDocs(pagosRef);

        let pagosDetalle = [];
        let totalIngresosMes = 0;
        let totalPagosRentaMes = 0;
        let totalDepositosMes = 0;

        pagosSnap.forEach(doc => {
            const data = doc.data();
            const montoPagado = parseFloat(data.montoPagado);
            if (!isNaN(montoPagado)) {
                totalIngresos += montoPagado;
            }
            // Para el detalle mensual, usamos la fechaUltimoAbono o fechaRegistro
            const fechaPago = data.fechaUltimoAbono
                ? data.fechaUltimoAbono.substring(0, 10)
                : (data.fechaRegistro ? data.fechaRegistro.substring(0, 10) : '');
            // Verifica si el pago corresponde al mes/año seleccionado
            if (
                fechaPago &&
                fechaPago >= startOfMonth &&
                fechaPago <= endOfMonth &&
                !isNaN(montoPagado)
            ) {
                totalIngresosMes += montoPagado;
                // Suma solo pagos de renta
                totalPagosRentaMes += montoPagado;
                const inquilinoNombre = inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido';
                const inmuebleNombre = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
                pagosDetalle.push({
                    fecha: fechaPago,
                    tipo: 'Ingreso (Pago de Renta)',
                    descripcion: `Pago de ${inquilinoNombre} por ${inmuebleNombre} (Mes: ${data.mesCorrespondiente || 'N/A'})`,
                    monto: montoPagado
                });

                // Sumar servicios pagados
                if (data.serviciosPagados) {
                    if (data.serviciosPagados.internet) {
                        totalInternet += parseFloat(data.serviciosPagados.internetMonto) || 0;
                    }
                    if (data.serviciosPagados.agua) {
                        totalAgua += parseFloat(data.serviciosPagados.aguaMonto) || 0;
                    }
                    if (data.serviciosPagados.luz) {
                        totalLuz += parseFloat(data.serviciosPagados.luzMonto) || 0;
                    }
                }
            }
        });

        // Sumar depósitos de inquilinos para el mes seleccionado
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            if (
                data.depositoRecibido &&
                data.montoDeposito &&
                data.fechaDeposito &&
                data.fechaDeposito >= startOfMonth &&
                data.fechaDeposito <= endOfMonth
            ) {
                totalIngresosMes += parseFloat(data.montoDeposito);
                totalDepositosMes += parseFloat(data.montoDeposito);
                const nombreInquilino = data.nombre || 'Inquilino Desconocido';
                const inmuebleNombre = inmueblesMap.get(data.inmuebleAsociadoId) || 'Inmueble Desconocido';
                pagosDetalle.push({
                    fecha: data.fechaDeposito,
                    tipo: 'Ingreso (Depósito)',
                    descripcion: `Depósito de ${nombreInquilino} por ${inmuebleNombre}`,
                    monto: parseFloat(data.montoDeposito)
                });
            }
        });

        // 2. Gastos (mantenimientos)
        const mantenimientosRef = collection(db, "mantenimientos");
        const qMantenimientos = query(
            mantenimientosRef,
            where("fechaMantenimiento", ">=", startOfMonth),
            where("fechaMantenimiento", "<=", endOfMonth),
            where("estado", "in", ["Completado", "En Progreso"])
        );
        const mantenimientosSnap = await getDocs(qMantenimientos);

        let mantenimientosDetalle = [];
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            totalGastos += (parseFloat(data.costo) || 0);
            const inmuebleNombre = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
            const tipoMantenimiento = data.tipoMantenimiento ? data.tipoMantenimiento : '';
            const descripcionMantenimiento = data.descripcion ? data.descripcion : '';
            const categoriaMantenimiento = data.categoria ? data.categoria : '';
            mantenimientosDetalle.push({
                fecha: data.fechaMantenimiento ? data.fechaMantenimiento.substring(0, 10) : '',
                tipo: 'Gasto (Mantenimiento)',
                descripcion: `Mantenimiento${tipoMantenimiento ? ': ' + tipoMantenimiento : ''}${descripcionMantenimiento ? ' - ' + descripcionMantenimiento : ''} (${inmuebleNombre})${categoriaMantenimiento ? ' [' + categoriaMantenimiento + ']' : ''}`,
                monto: parseFloat(data.costo) || 0
            });
        });

        // Unir todos los movimientos (ingresos y gastos) y ordenarlos por fecha descendente
        const todosLosMovimientos = [...pagosDetalle, ...mantenimientosDetalle].sort((a, b) => b.fecha.localeCompare(a.fecha));

        // Generar el HTML del detalle
        if (todosLosMovimientos.length === 0) {
            listaDetalladaMovimientosHtml = `<p class="text-gray-500 text-center py-6">No hay movimientos registrados para este mes.</p>`;
        } else {
            listaDetalladaMovimientosHtml = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
                        <thead>
                            <tr>
                                <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todosLosMovimientos.map(mov => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-2 py-1.5 whitespace-nowrap text-xs">${mov.fecha}</td>
                                    <td class="px-2 py-1.5 whitespace-nowrap text-xs">${mov.tipo}</td>
                                    <td class="px-2 py-1.5 text-xs">${mov.descripcion}</td>
                                    <td class="px-2 py-1.5 text-right font-semibold text-xs ${mov.tipo.startsWith('Ingreso') ? 'text-green-700' : 'text-red-700'}">
                                        $${parseFloat(mov.monto).toFixed(2)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // 3. Mostrar el reporte en HTML
        const balance = totalIngresosMes - totalGastos;
        const balanceClass = balance >= 0 ? 'text-green-600' : 'text-red-600';
        const balanceIcon = balance >= 0
            ? `<svg class="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`
            : `<svg class="w-10 h-10 mx-auto mb-2 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

        resultadoDiv.innerHTML = `
            <div class="w-full max-w-full overflow-x-hidden">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 mb-2 border-b pb-2 flex items-center">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    Resumen Financiero Mensual
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg shadow-sm text-center border border-blue-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-blue-700">Pagos de Renta</p>
                        <p class="text-base sm:text-lg font-bold text-blue-900">$${totalPagosRentaMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg shadow-sm text-center border border-green-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-green-700">Depósitos</p>
                        <p class="text-base sm:text-lg font-bold text-green-900">$${totalDepositosMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg shadow-sm text-center border border-blue-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-blue-700">Ingresos Totales</p>
                        <p class="text-base sm:text-lg font-bold text-blue-900">$${totalIngresosMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg shadow-sm text-center border border-red-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-red-700">Gastos Totales</p>
                        <p class="text-base sm:text-lg font-bold text-red-900">$${totalGastos.toFixed(2)}</p>
                    </div>
                </div>
                <div class="relative flex justify-center mb-3">
                    <div class="w-full">
                        <div class="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-sm border border-white/20 p-3 text-center">
                            ${balanceIcon}
                            <p class="text-sm sm:text-base font-semibold text-white tracking-wide">Balance del Mes</p>
                            <p class="text-lg sm:text-xl font-extrabold ${balance >= 0 ? 'text-white' : 'text-orange-200'} drop-shadow-lg">$${balance.toFixed(2)}</p>
                            <p class="text-sm text-white/80">${balance >= 0 ? '¡Felicidades! El balance es positivo.' : 'Atención: El balance es negativo.'}</p>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg shadow-sm text-center border border-indigo-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-indigo-700">Total Internet</p>
                        <p class="text-base sm:text-lg font-bold text-indigo-900">$${totalInternet.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 p-3 rounded-lg shadow-sm text-center border border-cyan-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-cyan-700">Total Agua</p>
                        <p class="text-base sm:text-lg font-bold text-cyan-900">$${totalAgua.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg shadow-sm text-center border border-yellow-200">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-yellow-700">Total Luz</p>
                        <p class="text-base sm:text-lg font-bold text-yellow-900">$${totalLuz.toFixed(2)}</p>
                    </div>
                </div>
                <h4 class="text-sm sm:text-base font-semibold text-gray-800 mb-2 border-b pb-2 flex items-center">
                    <svg class="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    Detalle de Movimientos
                </h4>
                ${listaDetalladaMovimientosHtml}
            </div>
        `;

    } catch (error) {
        console.error("Error al generar el reporte mensual:", error);
        mostrarNotificacion("Error al generar el reporte mensual.", 'error');
        resultadoDiv.innerHTML = '<p class="text-red-500 text-center py-2 text-xs">Hubo un error al generar el reporte. Por favor, inténtalo de nuevo.</p>';
    }
}