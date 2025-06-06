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
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-700">Generador de Reportes</h2>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">Reporte Mensual de Ingresos y Gastos</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label for="selectMes" class="block text-sm font-medium text-gray-700">Mes</label>
                    <select id="selectMes" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        ${mesesOptions}
                    </select>
                </div>
                <div>
                    <label for="selectAnio" class="block text-sm font-medium text-gray-700">Año</label>
                    <select id="selectAnio" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        ${aniosOptions}
                    </select>
                </div>
                <div class="flex items-end">
                    <button id="generarReporteBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md w-full transition-colors duration-200">Generar Reporte</button>
                </div>
            </div>
            <div id="reporteResultado" class="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p class="text-gray-500 text-center">Selecciona un mes y año y haz clic en "Generar Reporte".</p>
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
    resultadoDiv.innerHTML = '<p class="text-center text-gray-500">Generando reporte...</p>';

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
                    <table class="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                        <thead>
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${todosLosMovimientos.map(mov => `
                                <tr>
                                    <td class="px-4 py-2 whitespace-nowrap">${mov.fecha}</td>
                                    <td class="px-4 py-2 whitespace-nowrap">${mov.tipo}</td>
                                    <td class="px-4 py-2">${mov.descripcion}</td>
                                    <td class="px-4 py-2 text-right font-semibold ${mov.tipo.startsWith('Ingreso') ? 'text-green-700' : 'text-red-700'}">
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
            <h3 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Resumen Financiero Mensual</h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-blue-50 p-5 rounded-lg shadow-md text-center border-l-4 border-blue-500">
                    <p class="text-base font-medium text-blue-700">Pagos de Renta</p>
                    <p class="text-3xl font-bold text-blue-900 mt-2">$${totalPagosRentaMes.toFixed(2)}</p>
                </div>
                <div class="bg-green-50 p-5 rounded-lg shadow-md text-center border-l-4 border-green-500">
                    <p class="text-base font-medium text-green-700">Depósitos</p>
                    <p class="text-3xl font-bold text-green-900 mt-2">$${totalDepositosMes.toFixed(2)}</p>
                </div>
                <div class="bg-blue-50 p-5 rounded-lg shadow-md text-center border-l-4 border-blue-500">
                    <p class="text-base font-medium text-blue-700">Ingresos Totales</p>
                    <p class="text-3xl font-bold text-blue-900 mt-2">$${totalIngresosMes.toFixed(2)}</p>
                </div>
                <div class="bg-red-50 p-5 rounded-lg shadow-md text-center border-l-4 border-red-500">
                    <p class="text-base font-medium text-red-700">Gastos Totales</p>
                    <p class="text-3xl font-bold text-red-900 mt-2">$${totalGastos.toFixed(2)}</p>
                </div>
            </div>
            <div class="relative flex justify-center mb-10">
                <div class="w-full md:w-2/3 lg:w-1/2 xl:w-1/3">
                    <div class="bg-gradient-to-r from-green-400/90 to-blue-500/90 dark:from-green-600/90 dark:to-blue-700/90 rounded-2xl shadow-2xl border-4 border-white p-8 text-center transform hover:scale-105 transition-transform duration-300">
                        ${balanceIcon}
                        <p class="text-lg font-semibold text-white tracking-wide mb-1">Balance del Mes</p>
                        <p class="text-4xl font-extrabold ${balance >= 0 ? 'text-white' : 'text-orange-200'} drop-shadow-lg mb-2">$${balance.toFixed(2)}</p>
                        <p class="text-sm text-white/80">${balance >= 0 ? '¡Felicidades! El balance es positivo.' : 'Atención: El balance es negativo.'}</p>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-indigo-50 p-5 rounded-lg shadow-md text-center border-l-4 border-indigo-500">
                    <p class="text-base font-medium text-indigo-700">Total Internet</p>
                    <p class="text-2xl font-bold text-indigo-900 mt-2">$${totalInternet.toFixed(2)}</p>
                </div>
                <div class="bg-cyan-50 p-5 rounded-lg shadow-md text-center border-l-4 border-cyan-500">
                    <p class="text-base font-medium text-cyan-700">Total Agua</p>
                    <p class="text-2xl font-bold text-cyan-900 mt-2">$${totalAgua.toFixed(2)}</p>
                </div>
                <div class="bg-yellow-50 p-5 rounded-lg shadow-md text-center border-l-4 border-yellow-500">
                    <p class="text-base font-medium text-yellow-700">Total Luz</p>
                    <p class="text-2xl font-bold text-yellow-900 mt-2">$${totalLuz.toFixed(2)}</p>
                </div>
            </div>
            <h4 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Detalle de Todos los Movimientos</h4>
            ${listaDetalladaMovimientosHtml}
        `;

    } catch (error) {
        console.error("Error al generar el reporte mensual:", error);
        mostrarNotificacion("Error al generar el reporte mensual.", 'error');
        resultadoDiv.innerHTML = '<p class="text-red-500 text-center py-6">Hubo un error al generar el reporte. Por favor, inténtalo de nuevo.</p>';
    }
}