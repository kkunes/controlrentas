import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarNotificacion, mostrarModal, ocultarModal } from './ui.js';

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
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h2 class="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#2c3e50]/20 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Generador de Reportes</span>
                </h2>
            </div>

            <div class="bg-gradient-to-br from-[#1a2234]/5 to-[#3a506b]/10 rounded-xl shadow-md p-4 sm:p-5 mb-4 border border-blue-500/20">
                <h3 class="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <div class="w-7 h-7 bg-[#2c3e50]/20 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                        <svg class="w-4 h-4 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Reporte Mensual</span>
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div class="relative">
                        <label for="selectMes" class="block text-xs font-medium text-[#2c3e50] mb-1 flex items-center">
                            <svg class="w-3 h-3 mr-1 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Mes
                        </label>
                        <div class="relative">
                            <select id="selectMes" class="appearance-none block w-full px-3 py-2 bg-white border border-blue-500/20 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700">
                                ${mesesOptions}
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="relative">
                        <label for="selectAnio" class="block text-xs font-medium text-[#2c3e50] mb-1 flex items-center">
                            <svg class="w-3 h-3 mr-1 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Año
                        </label>
                        <div class="relative">
                            <select id="selectAnio" class="appearance-none block w-full px-3 py-2 bg-white border border-blue-500/20 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700">
                                ${aniosOptions}
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-end">
                        <button id="generarReporteBtn" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm font-medium border border-blue-600 hover:border-blue-700">
                            <svg class="w-4 h-4 mr-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Generar Reporte
                        </button>
                    </div>
                </div>
                <div id="reporteResultado" class="mt-3 p-3 border border-blue-500/20 rounded-xl bg-white/80 shadow-sm">
                    <div class="flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-500 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-sm text-[#2c3e50]">Selecciona un mes y año y haz clic en "Generar Reporte".</p>
                    </div>
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

function abrirModalPropietarios(movimientos, propietariosMap) {
    let propietariosOptions = '<option value="">Todos</option>';
    propietariosMap.forEach((nombre, id) => {
        propietariosOptions += `<option value="${id}">${nombre}</option>`;
    });

    const modalHtml = `
        <div class="modal-content-responsive bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col">
            <div class="modal-header-responsive bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-t-lg flex justify-between items-center">
                <h3 class="text-xl font-bold text-white">Ingresos por Propietario</h3>
                <button id="closeModalBtn" class="modal-close-button text-white hover:text-gray-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6 flex-grow overflow-y-auto">
                <div class="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
                    <select id="filtroPropietarioModal" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">${propietariosOptions}</select>
                </div>
                <div id="resumenFiltradoModal" class="mb-4"></div>
                <div id="tablaModalContainer"></div>
            </div>
            <div class="p-4 bg-gray-50 rounded-b-lg flex justify-end">
                <button id="closeModalFooterBtn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        </div>
    `;

    mostrarModal(modalHtml);

    document.getElementById('closeModalBtn').addEventListener('click', ocultarModal);
    document.getElementById('closeModalFooterBtn').addEventListener('click', ocultarModal);

    const renderTabla = () => {
        const propietarioId = document.getElementById('filtroPropietarioModal').value;

        const movimientosFiltrados = propietarioId ? movimientos.filter(mov => mov.propietarioId === propietarioId) : movimientos;

        let totalFiltrado = 0;
        movimientosFiltrados.forEach(mov => {
            totalFiltrado += mov.monto;
        });

        document.getElementById('resumenFiltradoModal').innerHTML = `
            <div class="bg-gradient-to-r from-blue-100 to-indigo-200 p-3 rounded-lg text-center">
                <p class="text-sm font-medium text-blue-800">Total Filtrado</p>
                <p class="text-xl font-bold text-blue-900">${totalFiltrado.toFixed(2)}</p>
            </div>
        `;

        let tablaHtml = '<p class="text-center text-gray-500 py-4">No hay movimientos que coincidan con los filtros.</p>';
        if (movimientosFiltrados.length > 0) {
            tablaHtml = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma de Pago</th>
                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${movimientosFiltrados.map(mov => `
                                <tr>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${mov.fecha}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${mov.tipo}</td>
                                    <td class="px-4 py-2 text-sm text-gray-700">${mov.descripcion}</td>
                                    <td class="px-4 py-2 text-sm text-gray-700">${mov.propietario}</td>
                                    <td class="px-4 py-2 text-sm text-gray-700">${mov.formaPago || 'N/A'}</td>
                                    <td class="px-4 py-2 text-right text-sm text-gray-700">${mov.monto.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        document.getElementById('tablaModalContainer').innerHTML = tablaHtml;
    };

    document.getElementById('filtroPropietarioModal').addEventListener('change', renderTabla);

    renderTabla();
}

/**
 * Genera y muestra el reporte mensual de ingresos y gastos.
 * @param {number} mes - El mes (1-12).
 * @param {number} anio - El año.
 */
async function generarReporteMensual(mes, anio) {
    const resultadoDiv = document.getElementById('reporteResultado');
    resultadoDiv.innerHTML = `
        <div class="flex items-center justify-center p-4">
            <svg class="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm font-medium text-[#2c3e50]">Generando reporte...</p>
        </div>
    `;

    try {
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const nombreMes = meses[mes - 1];

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

        // Obtener nombres de inmuebles, inquilinos y propietarios
        const propietariosSnap = await getDocs(collection(db, "propietarios"));
        const propietariosMap = new Map();
        propietariosSnap.forEach(doc => propietariosMap.set(doc.id, doc.data().nombre));

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            inmueblesMap.set(doc.id, {
                nombre: data.nombre,
                propietarioId: data.propietarioId
            });
        });

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
                const inmuebleInfo = inmueblesMap.get(data.inmuebleId);
                const inmuebleNombre = inmuebleInfo ? inmuebleInfo.nombre : 'Inmueble Desconocido';
                const propietarioId = data.propietarioId || (inmuebleInfo ? inmuebleInfo.propietarioId : null);
                const propietarioNombre = propietariosMap.get(propietarioId) || 'N/A';

                pagosDetalle.push({
                    fecha: fechaPago,
                    tipo: 'Ingreso (Pago de Renta)',
                    descripcion: `Pago de ${inquilinoNombre} por ${inmuebleNombre} (Mes: ${data.mesCorrespondiente || 'N/A'})`,
                    monto: montoPagado,
                    propietario: propietarioNombre,
                    propietarioId,
                    formaPago: data.formaPago
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
                const inmuebleInfo = inmueblesMap.get(data.inmuebleAsociadoId);
                const inmuebleNombre = inmuebleInfo ? inmuebleInfo.nombre : 'Inmueble Desconocido';
                const propietarioId = inmuebleInfo ? inmuebleInfo.propietarioId : null;
                const propietarioNombre = propietariosMap.get(propietarioId) || 'N/A';
                pagosDetalle.push({
                    fecha: data.fechaDeposito,
                    tipo: 'Ingreso (Depósito)',
                    descripcion: `Depósito de ${nombreInquilino} por ${inmuebleNombre}`,
                    monto: parseFloat(data.montoDeposito),
                    propietario: propietarioNombre,
                    propietarioId,
                    formaPago: 'N/A' // Deposits don't have a payment method in the same way
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
            const inmuebleInfo = inmueblesMap.get(data.inmuebleId);
            const inmuebleNombre = inmuebleInfo ? inmuebleInfo.nombre : 'Inmueble Desconocido';
            const propietarioId = inmuebleInfo ? inmuebleInfo.propietarioId : null;
            const propietarioNombre = propietariosMap.get(propietarioId) || 'N/A';
            const tipoMantenimiento = data.tipoMantenimiento ? data.tipoMantenimiento : '';
            const descripcionMantenimiento = data.descripcion ? data.descripcion : '';
            const categoriaMantenimiento = data.categoria ? data.categoria : '';
            mantenimientosDetalle.push({
                fecha: data.fechaMantenimiento ? data.fechaMantenimiento.substring(0, 10) : '',
                tipo: 'Gasto (Mantenimiento)',
                descripcion: `Mantenimiento${tipoMantenimiento ? ': ' + tipoMantenimiento : ''}${descripcionMantenimiento ? ' - ' + descripcionMantenimiento : ''} (${inmuebleNombre})${categoriaMantenimiento ? ' [' + categoriaMantenimiento + ']' : ''}`,
                monto: parseFloat(data.costo) || 0,
                propietario: propietarioNombre,
                propietarioId,
                formaPago: 'N/A' // Maintenance doesn't have a payment method
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
                    <table class="min-w-full divide-y divide-blue-100 bg-white rounded-xl shadow-md border border-blue-100/50">
                        <thead class="bg-[#2c3e50]/10">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-[#2c3e50] uppercase tracking-wider">Fecha</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-[#2c3e50] uppercase tracking-wider">Tipo</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-[#2c3e50] uppercase tracking-wider">Descripción</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-[#2c3e50] uppercase tracking-wider">Propietario</th>
                                <th class="px-3 py-2 text-right text-xs font-medium text-[#2c3e50] uppercase tracking-wider">Monto</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-blue-50">
                            ${todosLosMovimientos.map(mov => `
                                <tr class="hover:bg-[#2c3e50]/5 transition-colors duration-150">
                                    <td class="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-700">${mov.fecha}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-xs">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${mov.tipo.startsWith('Ingreso') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${mov.tipo.startsWith('Ingreso') ? 
                                                '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>' : 
                                                '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>'
                                            }
                                            ${mov.tipo}
                                        </span>
                                    </td>
                                    <td class="px-3 py-2 text-xs text-gray-700">${mov.descripcion}</td>
                                    <td class="px-3 py-2 text-xs text-gray-700">${mov.propietario || 'N/A'}</td>
                                    <td class="px-3 py-2 text-right font-bold text-xs ${mov.tipo.startsWith('Ingreso') ? 'text-green-700' : 'text-red-700'}">
                                        ${parseFloat(mov.monto).toFixed(2)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const headerHtml = `
            <style>
                thead { display: table-header-group; }
                tfoot { display: table-row-group; }
                tr { page-break-inside: avoid; }
            </style>
            <h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Detalle de Movimientos - ${nombreMes}</h2>
        `;
        listaDetalladaMovimientosHtml = headerHtml + listaDetalladaMovimientosHtml;

        // 3. Mostrar el reporte en HTML
        const balance = totalIngresosMes - totalGastos;
        const balanceClass = balance >= 0 ? 'text-green-600' : 'text-red-600';
        const balanceIcon = balance >= 0
            ? `<svg class="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`
            : `<svg class="w-10 h-10 mx-auto mb-2 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

        resultadoDiv.innerHTML = `
            <div class="w-full max-w-full overflow-x-hidden">
                <h3 class="text-base sm:text-lg font-semibold mb-3 border-b border-blue-500/20 pb-2 flex items-center">
                    <div class="w-7 h-7 bg-[#2c3e50]/20 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                        <svg class="w-4 h-4 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Resumen Financiero Mensual</span>
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl shadow-md text-center border border-blue-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-blue-700">Pagos de Renta</p>
                        <p class="text-base sm:text-xl font-bold text-blue-900">${totalPagosRentaMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl shadow-md text-center border border-green-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-green-700">Depósitos</p>
                        <p class="text-base sm:text-xl font-bold text-green-900">${totalDepositosMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl shadow-md text-center border border-blue-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-blue-700">Ingresos Totales</p>
                        <p class="text-base sm:text-xl font-bold text-blue-900">${totalIngresosMes.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-xl shadow-md text-center border border-red-200/50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-red-700">Gastos Totales</p>
                        <p class="text-base sm:text-xl font-bold text-red-900">${totalGastos.toFixed(2)}</p>
                    </div>
                </div>
                <div class="relative flex justify-center mb-4">
                    <div class="w-full">
                        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg border border-white/20 p-4 text-center">
                            ${balanceIcon}
                            <p class="text-sm sm:text-base font-semibold text-white tracking-wide">Balance del Mes</p>
                            <p class="text-lg sm:text-2xl font-extrabold ${balance >= 0 ? 'text-white' : 'text-orange-200'} drop-shadow-lg">${balance.toFixed(2)}</p>
                            <p class="text-sm text-white/80">${balance >= 0 ? '¡Felicidades! El balance es positivo.' : 'Atención: El balance es negativo.'}</p>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-xl shadow-md text-center border border-indigo-200/50 hover:shadow-lg transition-all duration-300">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-indigo-700">Total Internet</p>
                        <p class="text-base sm:text-xl font-bold text-indigo-900">${totalInternet.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 p-3 rounded-xl shadow-md text-center border border-cyan-200/50 hover:shadow-lg transition-all duration-300">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-cyan-700">Total Agua</p>
                        <p class="text-base sm:text-xl font-bold text-cyan-900">${totalAgua.toFixed(2)}</p>
                    </div>
                    <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-xl shadow-md text-center border border-yellow-200/50 hover:shadow-lg transition-all duration-300">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <p class="text-sm font-medium text-yellow-700">Total Luz</p>
                        <p class="text-base sm:text-xl font-bold text-yellow-900">${totalLuz.toFixed(2)}</p>
                    </div>
                </div>
                <h4 class="text-sm sm:text-base font-semibold mb-3 border-b border-blue-500/20 pb-2 flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-6 h-6 bg-[#2c3e50]/20 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                            <svg class="w-3 h-3 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Detalle de Movimientos</span>
                    </div>
                    <div class="flex items-center">
                        <button id="btnIngresoPropietario" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 mr-2">Ingreso Propietario</button>
                        <button id="btnDescargarPDF" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Descargar PDF</button>
                    </div>
                </h4>
                <div id="reporte-pdf-content">
                    ${listaDetalladaMovimientosHtml}
                </div>
            </div>
        `;

        document.getElementById('btnIngresoPropietario').addEventListener('click', () => {
            abrirModalPropietarios(todosLosMovimientos, propietariosMap);
        });

        document.getElementById('btnDescargarPDF').addEventListener('click', () => {
            generarPDF(mes, anio);
        });

    } catch (error) {
        console.error("Error al generar el reporte mensual:", error);
        mostrarNotificacion("Error al generar el reporte mensual.", 'error');
        resultadoDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <svg class="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-red-600 font-medium">Hubo un error al generar el reporte.</p>
                <p class="text-red-500 text-xs mt-1">Por favor, inténtalo de nuevo.</p>
            </div>
        `;
    }
}

/**
 * Genera un PDF a partir del contenido del reporte.
 * @param {number} mes - El mes del reporte.
 * @param {number} anio - El año del reporte.
 */
function generarPDF(mes, anio) {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const nombreMes = meses[mes - 1];
    const nombreArchivo = `Reporte_Ingresos_${nombreMes}_${anio}.pdf`;

    const elemento = document.getElementById('reporte-pdf-content');
    const mainContent = document.querySelector('main'); // Apuntar al contenedor principal

    const opt = {
        margin:       1,
        filename:     nombreArchivo,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2,
            scrollY: -mainContent.scrollTop, // Usar el scroll del elemento <main>
            windowWidth: document.documentElement.offsetWidth
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().from(elemento).set(opt).toPdf().get('pdf').then(function (pdf) {
        var totalPages = pdf.internal.getNumberOfPages();
        for (var i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            const text = `Página ${i} de ${totalPages}`;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            pdf.text(text, pageWidth - 1.5, pageHeight - 0.5);
        }
    }).save();
}