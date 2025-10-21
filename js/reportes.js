import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarNotificacion, mostrarModal, ocultarModal } from './ui.js';

let annualChartInstance = null;
let isReportesListenerAttached = false;

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

            <!-- Sección de Gráfica Anual -->
            <div id="reporteAnualParaPdf" class="bg-gradient-to-br from-[#1a2234]/5 to-[#3a506b]/10 rounded-xl shadow-md p-4 sm:p-5 mt-6 border border-blue-500/20">
                <div class="flex flex-wrap justify-between items-center mb-3">
                    <h3 class="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                        <div class="w-7 h-7 bg-[#2c3e50]/20 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                            <svg class="w-4 h-4 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                            </svg>
                        </div>
                        <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Resumen Gráfico Anual</span>
                    </h3>
                    <button id="imprimirGraficaBtn" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm font-medium border border-green-600 hover:border-green-700 mt-2 sm:mt-0">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        Descargar PDF
                    </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div class="relative">
                        <label for="selectAnioGrafica" class="block text-xs font-medium text-[#2c3e50] mb-1 flex items-center">
                             <svg class="w-3 h-3 mr-1 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Año
                        </label>
                        <div class="relative">
                            <select id="selectAnioGrafica" class="appearance-none block w-full px-3 py-2 bg-white border border-blue-500/20 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700">
                                ${aniosOptions}
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="graficaAnualContenedor" class="mt-4"></div>
                 <div id="resumenAnual" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
            </div>
        </div>
    `;

    // Attach listeners only once using event delegation
    if (!isReportesListenerAttached) {
        contenedor.addEventListener('click', async (event) => {
            if (event.target.closest('#generarReporteBtn')) {
                const mesSeleccionado = document.getElementById('selectMes').value;
                const anioSeleccionado = document.getElementById('selectAnio').value;
                await generarReporteMensual(parseInt(mesSeleccionado), parseInt(anioSeleccionado));
            }
            if (event.target.closest('#imprimirGraficaBtn')) {
                imprimirReporteAnual();
            }
        });

        contenedor.addEventListener('change', async (event) => {
            if (event.target && event.target.id === 'selectAnioGrafica') {
                const anioSeleccionado = event.target.value;
                await generarGraficoAnual(parseInt(anioSeleccionado));
            }
        });
       
        isReportesListenerAttached = true;
    }

    // Set initial values and generate reports
    document.getElementById('selectMes').value = new Date().getMonth() + 1;
    document.getElementById('selectAnio').value = new Date().getFullYear();
    document.getElementById('selectAnioGrafica').value = new Date().getFullYear();

    await generarReporteMensual(new Date().getMonth() + 1, new Date().getFullYear());
    await generarGraficoAnual(new Date().getFullYear());
}

export async function generarReportePagosPDF() {
    const inmuebleId = document.getElementById('filtroInmueblePagos').value;
    const inquilinoId = document.getElementById('filtroInquilinoPagos').value;
    const fechaInicio = document.getElementById('filtroFechaInicioPagos').value;
    const fechaFin = document.getElementById('filtroFechaFinPagos').value;

    let pagosQuery = query(collection(db, "pagos"));

    if (inmuebleId) {
        pagosQuery = query(pagosQuery, where("inmuebleId", "==", inmuebleId));
    }
    if (inquilinoId) {
        pagosQuery = query(pagosQuery, where("inquilinoId", "==", inquilinoId));
    }
    if (fechaInicio) {
        pagosQuery = query(pagosQuery, where("fechaRegistro", ">=", fechaInicio));
    }
    if (fechaFin) {
        pagosQuery = query(pagosQuery, where("fechaRegistro", "<=", fechaFin));
    }

    const pagosSnap = await getDocs(pagosQuery);
    if (pagosSnap.empty) {
        mostrarNotificacion("No se encontraron pagos con los filtros seleccionados.", "warning");
        return;
    }

    const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
    const inquilinosMap = new Map();
    inquilinosSnap.forEach(doc => {
        inquilinosMap.set(doc.id, doc.data().nombre);
    });

    const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
    const inmueblesMap = new Map();
    inmueblesSnap.forEach(doc => {
        inmueblesMap.set(doc.id, doc.data().nombre);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Reporte de Pagos", 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["Inmueble", "Inquilino", "Monto Pagado", "Fecha de Registro", "Mes Correspondiente"];
    const tableRows = [];

    pagosSnap.forEach(pagoDoc => {
        const pago = pagoDoc.data();
        const rowData = [
            inmueblesMap.get(pago.inmuebleId) || 'N/A',
            inquilinosMap.get(pago.inquilinoId) || 'N/A',
            pago.montoPagado ? `${pago.montoPagado.toFixed(2)}` : '$0.00',
            pago.fechaRegistro,
            `${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`
        ];
        tableRows.push(rowData);
    });

    doc.autoTable(tableColumn, tableRows, { startY: 30 });

    doc.save('reporte_pagos.pdf');
    mostrarNotificacion("Reporte de pagos generado exitosamente.", "success");
}

/**
* Imprime el reporte anual abriendo una nueva ventana con el contenido para imprimir.
*/
async function imprimirReporteAnual() {
    if (!annualChartInstance) {
        mostrarNotificacion("La gráfica no se ha generado aún.", "error");
        return;
    }

    const anio = document.getElementById('selectAnioGrafica').value;
    const resumenHtml = document.getElementById('resumenAnual').innerHTML;

    try {
        const { imgURI } = await annualChartInstance.dataURI();
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte Anual ${anio}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; }
                        h1 { text-align: center; }
                        img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
                        .resumen-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
                        .resumen-card { border: 1px solid #ccc; border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .resumen-card h4 { margin: 0 0 10px 0; font-size: 1rem; color: #555; }
                        .resumen-card p { margin: 0; font-size: 1.5rem; font-weight: bold; color: #333; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Reporte Gráfico Anual - ${anio}</h1>
                    <div id="chart-container">
                        <img src="${imgURI}" />
                    </div>
                    <div class="resumen-container">
                        ${resumenHtml}
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            }
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();

    } catch (error) {
        console.error("Error al preparar la impresión:", error);
        mostrarNotificacion("No se pudo preparar el reporte para imprimir.", "error");
    }
}

/**
 * Genera y muestra la gráfica anual de ingresos y egresos.
 * @param {number} anio - El año para el cual generar la gráfica.
 */
async function generarGraficoAnual(anio) {
    const graficaContenedor = document.getElementById('graficaAnualContenedor');
    const resumenAnualDiv = document.getElementById('resumenAnual');
    graficaContenedor.innerHTML = `
        <div class="flex items-center justify-center p-4">
            <svg class="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm font-medium text-[#2c3e50]">Cargando datos del año ${anio}...</p>
        </div>`;

    try {
        const meses = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
        ];
        let ingresosPorMes = Array(12).fill(0);
        let gastosPorMes = Array(12).fill(0);

        // 1. Obtener Ingresos (Pagos y Depósitos)
        const pagosQuery = query(collection(db, "pagos"));
        const pagosSnap = await getDocs(pagosQuery);
        pagosSnap.forEach(doc => {
            const data = doc.data();
            const fechaPagoStr = data.fechaUltimoAbono || data.fechaRegistro;
            if (fechaPagoStr) {
                const fechaPago = new Date(fechaPagoStr.substring(0, 10) + 'T00:00:00');
                if (fechaPago.getFullYear() === anio) {
                    const mesIndex = fechaPago.getMonth();
                    ingresosPorMes[mesIndex] += parseFloat(data.montoPagado) || 0;
                }
            }
        });

        const inquilinosQuery = query(collection(db, "inquilinos"));
        const inquilinosSnap = await getDocs(inquilinosQuery);
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            if (data.depositoRecibido && data.montoDeposito && data.fechaDeposito) {
                 const fechaDeposito = new Date(data.fechaDeposito + 'T00:00:00');
                if (fechaDeposito.getFullYear() === anio) {
                    const mesIndex = fechaDeposito.getMonth();
                    ingresosPorMes[mesIndex] += parseFloat(data.montoDeposito) || 0;
                }
            }
        });

        // 2. Obtener Gastos (Mantenimientos)
        const mantenimientosQuery = query(collection(db, "mantenimientos"));
        const mantenimientosSnap = await getDocs(mantenimientosQuery);
        mantenimientosSnap.forEach(doc => {
            const data = doc.data();
            if (data.fechaMantenimiento) {
                 const fechaMantenimiento = new Date(data.fechaMantenimiento + 'T00:00:00');
                if (fechaMantenimiento.getFullYear() === anio) {
                    const mesIndex = fechaMantenimiento.getMonth();
                    gastosPorMes[mesIndex] += parseFloat(data.costo) || 0;
                }
            }
        });

        const totalIngresosAnual = ingresosPorMes.reduce((a, b) => a + b, 0);
        const totalGastosAnual = gastosPorMes.reduce((a, b) => a + b, 0);
        const balanceAnual = totalIngresosAnual - totalGastosAnual;

        resumenAnualDiv.innerHTML = `
            <div class="resumen-card bg-gradient-to-r from-green-100 to-green-200 p-4 rounded-lg shadow-md text-center border border-green-300">
                <h4 class="text-sm font-semibold text-green-800">Ingresos Totales (Año)</h4>
                <p class="text-2xl font-bold text-green-900 mt-1">${totalIngresosAnual.toFixed(2)}</p>
            </div>
            <div class="resumen-card bg-gradient-to-r from-red-100 to-red-200 p-4 rounded-lg shadow-md text-center border border-red-300">
                <h4 class="text-sm font-semibold text-red-800">Egresos Totales (Año)</h4>
                <p class="text-2xl font-bold text-red-900 mt-1">${totalGastosAnual.toFixed(2)}</p>
            </div>
            <div class="resumen-card bg-gradient-to-r from-blue-100 to-blue-200 p-4 rounded-lg shadow-md text-center border border-blue-300">
                <h4 class="text-sm font-semibold text-blue-800">Balance Anual</h4>
                <p class="text-2xl font-bold text-blue-900 mt-1">${balanceAnual.toFixed(2)}</p>
            </div>
        `;

        const options = {
            series: [{
                name: 'Ingresos',
                data: ingresosPorMes.map(v => v.toFixed(2))
            }, {
                name: 'Egresos',
                data: gastosPorMes.map(v => v.toFixed(2))
            }],
            chart: {
                type: 'bar',
                height: 400,
                toolbar: {
                    show: true
                },
                events: {
                    mounted: function(chartContext, config) {
                        annualChartInstance = chartContext;
                    },
                    updated: function(chartContext, config) {
                        annualChartInstance = chartContext;
                    }
                }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '60%',
                    endingShape: 'rounded',
                    borderRadius: 5,
                    dataLabels: {
                        position: 'top',
                    },
                },
            },
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    if (val == 0) return "";
                    if (val < 1000) return "$" + parseFloat(val).toFixed(0);
                    return "$" + (val / 1000).toFixed(1) + 'k';
                },
                offsetY: -20,
                style: {
                    fontSize: '12px',
                    colors: ["#304758"]
                }
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: meses,
            },
            yaxis: {
                title: {
                    text: 'Monto (MXN)'
                }
            },
            fill: {
                opacity: 1
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return "$ " + val
                    }
                }
            },
            colors: ['#10B981', '#EF4444'], // Verde para ingresos, Rojo para egresos
            grid: {
                borderColor: '#e7e7e7',
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                },
            },
            responsive: [{
                breakpoint: 768, // Breakpoint para móviles
                options: {
                    chart: {
                        height: 500 // Más altura para barras horizontales
                    },
                    plotOptions: {
                        bar: {
                            horizontal: true,
                            borderRadius: 5,
                        }
                    },
                    dataLabels: {
                        enabled: true,
                        formatter: function (val) {
                            if (val == 0) return "";
                            return "$" + parseFloat(val).toFixed(0);
                        },
                        offsetX: 15, // Ajustar posición para barras horizontales
                        style: {
                            fontSize: '10px',
                            colors: ['#333']
                        },
                        background: {
                            enabled: true,
                            foreColor: '#fff',
                            padding: 5,
                            borderRadius: 3,
                            borderWidth: 1,
                            borderColor: '#ddd',
                            opacity: 0.9
                        }
                    },
                    xaxis: {
                        labels: {
                            formatter: function(val) {
                                if (val == 0) return "0";
                                if (Math.abs(val) >= 1000) {
                                    return "$" + (val / 1000).toFixed(0) + 'k';
                                }
                                return "$" + val;
                            }
                        }
                    },
                    yaxis: {
                        title: {
                            text: '' // Ocultar título del eje Y en móvil
                        }
                    }
                }
            }]
        };

        graficaContenedor.innerHTML = ''; // Limpiar el mensaje de carga
        const chart = new ApexCharts(graficaContenedor, options);
        chart.render();

    } catch (error) {
        console.error("Error al generar la gráfica anual:", error);
        mostrarNotificacion("Error al generar la gráfica anual.", 'error');
        graficaContenedor.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                 <p class="text-red-600 font-medium">Hubo un error al generar la gráfica.</p>
            </div>`;
    }
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
                <button id="generarPdfModalBtn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 mr-2">Generar PDF</button>
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
                <p class="text-sm font-medium text-blue-800">Total</p>
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

    document.getElementById('generarPdfModalBtn').addEventListener('click', () => {
        const propietarioId = document.getElementById('filtroPropietarioModal').value;
        const movimientosFiltrados = propietarioId ? movimientos.filter(mov => mov.propietarioId === propietarioId) : movimientos;
        generarPdfMovimientosPropietario(movimientosFiltrados, propietariosMap, propietarioId);
    });
}

/**
 * Genera un PDF con los movimientos filtrados por propietario.
 * @param {Array} movimientos - Array de movimientos (ingresos/gastos).
 * @param {Map} propietariosMap - Mapa de IDs de propietario a nombres.
 * @param {string} propietarioId - ID del propietario seleccionado (o vacío si es "Todos").
 */
function generarPdfMovimientosPropietario(movimientos, propietariosMap, propietarioId) {
    const nombrePropietario = propietarioId ? propietariosMap.get(propietarioId) : "Todos los Propietarios";
    const nombreArchivo = `Reporte_Movimientos_${nombrePropietario.replace(/ /g, '_')}.pdf`;

    let totalFiltrado = 0;
    movimientos.forEach(mov => {
        totalFiltrado += mov.monto;
    });

    let tablaHtml = '<p style="text-align: center; color: #6b7280; padding: 1.5rem;">No hay movimientos que coincidan con los filtros.</p>';
    if (movimientos.length > 0) {
        tablaHtml = `
            <div style="overflow-x: auto;">
                <table style="min-width: 100%; border-collapse: collapse; border-spacing: 0; margin-top: 1rem;">
                    <thead style="background-color: #f3f4f6;">
                        <tr>
                            <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Fecha</th>
                            <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Tipo</th>
                            <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Descripción</th>
                            <th style="padding: 0.75rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Propietario</th>
                            <th style="padding: 0.75rem; text-align: right; font-size: 0.75rem; font-weight: 500; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb;">Monto</th>
                        </tr>
                    </thead>
                    <tbody style="background-color: #ffffff; divide-y divide-gray-200;">
                        ${movimientos.map(mov => `
                            <tr style="${mov.tipo.startsWith('Ingreso') ? 'background-color: #ecfdf5;' : 'background-color: #fef2f2;'}">
                                <td style="padding: 0.75rem; white-space: nowrap; font-size: 0.875rem; color: #374151;">${mov.fecha}</td>
                                <td style="padding: 0.75rem; white-space: nowrap; font-size: 0.875rem; color: ${mov.tipo.startsWith('Ingreso') ? '#065f46;' : '#991b1b;'};">${mov.tipo}</td>
                                <td style="padding: 0.75rem; font-size: 0.875rem; color: #374151;">${mov.descripcion}</td>
                                <td style="padding: 0.75rem; font-size: 0.875rem; color: #374151;">${mov.propietario || 'N/A'}</td>
                                <td style="padding: 0.75rem; text-align: right; font-weight: 700; font-size: 0.875rem; color: ${mov.tipo.startsWith('Ingreso') ? '#047857;' : '#b91c1c;'};">${parseFloat(mov.monto).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    const headerHtml = `
        <h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937;">Reporte de Movimientos por Propietario</h2>
        <h3 style="text-align: center; font-size: 1.2rem; font-weight: 600; margin-bottom: 1.5rem; color: #3b82f6;">Propietario: ${nombrePropietario}</h3>
    `;

    const contentHtml = `
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f2f2f2; }
            .income-row { background-color: #e6ffe6; } /* Light green for income */
            .expense-row { background-color: #ffe6e6; } /* Light red for expense */
            .income-text { color: #006400; } /* Dark green for income text */
            .expense-text { color: #8b0000; } /* Dark red for expense text */
            .header { text-align: center; margin-bottom: 20px; }
            .page-number { position: fixed; bottom: 20px; right: 20px; font-size: 10px; }
        </style>
        ${headerHtml}
        <div style="text-align: center; margin-bottom: 1.5rem; padding: 1rem; background-color: #e0f7fa; border-radius: 0.5rem; border: 1px solid #b2ebf2;">
            <p style="font-size: 1.1rem; font-weight: 600; color: #006064; margin-bottom: 0.5rem;">Total Ingreso Propietario:</p>
            <p style="font-size: 2rem; font-weight: 800; color: #004d40;">${totalFiltrado.toFixed(2)}</p>
        </div>
        ${tablaHtml}
    `;

    const opt = {
        margin:       0.5,
        filename:     nombreArchivo,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().from(contentHtml).set(opt).toPdf().get('pdf').then(function (pdf) {
        var totalPages = pdf.internal.getNumberOfPages();
        for (var i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setTextColor(150);
            const text = `Página ${i} de ${totalPages}`;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            pdf.text(text, pageWidth - 0.75, pageHeight - 0.5, { align: 'right' });
        }
    }).save();
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
                                <tr>
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

        const balance = totalIngresosMes - totalGastos;
        const summaryHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div style="background: linear-gradient(to bottom right, #e0f7fa, #b2ebf2); padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); text-align: center; border: 1px solid #80deea;">
                    <p style="font-size: 1rem; font-weight: 600; color: #006064;">Pagos de Renta</p>
                    <p style="font-size: 1.8rem; font-weight: 800; color: #004d40; margin-top: 0.5rem;">${totalPagosRentaMes.toFixed(2)}</p>
                </div>
                <div style="background: linear-gradient(to bottom right, #e8f5e9, #c8e6c9); padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); text-align: center; border: 1px solid #a5d6a7;">
                    <p style="font-size: 1rem; font-weight: 600; color: #2e7d32;">Depósitos</p>
                    <p style="font-size: 1.8rem; font-weight: 800; color: #1b5e20; margin-top: 0.5rem;">${totalDepositosMes.toFixed(2)}</p>
                </div>
                <div style="background: linear-gradient(to bottom right, #e3f2fd, #bbdefb); padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); text-align: center; border: 1px solid #90caf9;">
                    <p style="font-size: 1rem; font-weight: 600; color: #1565c0;">Ingresos Totales</p>
                    <p style="font-size: 1.8rem; font-weight: 800; color: #0d47a1; margin-top: 0.5rem;">${totalIngresosMes.toFixed(2)}</p>
                </div>
                <div style="background: linear-gradient(to bottom right, #ffebee, #ffcdd2); padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); text-align: center; border: 1px solid #ef9a9a;">
                    <p style="font-size: 1rem; font-weight: 600; color: #c62828;">Gastos Totales</p>
                    <p style="font-size: 1.8rem; font-weight: 800; color: #b71c1c; margin-top: 0.5rem;">${totalGastos.toFixed(2)}</p>
                </div>
                <div style="background: linear-gradient(to bottom right, ${balance >= 0 ? '#e8f5e9' : '#ffebee'}, ${balance >= 0 ? '#c8e6c9' : '#ffcdd2'}); padding: 2rem; border-radius: 0.75rem; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); text-align: center; border: 1px solid ${balance >= 0 ? '#a5d6a7' : '#ef9a9a'}; grid-column: 1 / -1;">
                    <p style="font-size: 1.2rem; font-weight: 700; color: ${balance >= 0 ? '#2e7d32' : '#c62828'};">Balance del Mes</p>
                    <p style="font-size: 2.5rem; font-weight: 900; color: ${balance >= 0 ? '#1b5e20' : '#b71c1c'}; margin-top: 0.75rem;">${balance.toFixed(2)}</p>
                    <p style="font-size: 0.9rem; font-weight: 500; color: ${balance >= 0 ? '#2e7d32' : '#c62828'}; margin-top: 0.5rem;">${balance >= 0 ? '¡Felicidades! Tu gestión financiera es excelente. Sigue así.' : 'Atención: Es crucial revisar tus gastos. ¡Hay oportunidades para mejorar!'}</p>
                </div>
            </div>
        `;
        listaDetalladaMovimientosHtml = headerHtml + summaryHtml + listaDetalladaMovimientosHtml;

        // 3. Mostrar el reporte en HTML
        const balanceClass = balance >= 0 ? 'text-green-600' : 'text-red-600';
        const balanceIcon = balance >= 0
            ? `<svg class="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`
            : `<svg class="w-10 h-10 mx-auto mb-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;

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
                <h4 class="text-sm sm:text-base font-semibold mb-3 border-b border-blue-500/20 pb-2 flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-6 h-6 bg-[#2c3e50]/20 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                            <svg class="w-3 h-3 text-[#3a506b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Detalle de Movimientos</span>
                    </div>
                    <div class="flex flex-wrap items-center justify-end">
                        <button id="btnIngresoPropietario" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 mr-2 mb-2 sm:mb-0">Ingreso Propietario</button>
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
            generarPDF(mes, anio, totalPagosRentaMes, totalDepositosMes, totalIngresosMes, totalGastos, balance, listaDetalladaMovimientosHtml);
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
function generarPDF(mes, anio, totalPagosRentaMes, totalDepositosMes, totalIngresosMes, totalGastos, balance, listaDetalladaMovimientosHtml) {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const nombreMes = meses[mes - 1];
    const nombreArchivo = `Reporte_Ingresos_${nombreMes}_${anio}.pdf`;

    const headerHtml = `
        <style>
            thead { display: table-header-group; }
            tfoot { display: table-row-group; }
            tr { page-break-inside: avoid; }
        </style>
        <h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Detalle de Movimientos - ${nombreMes}</h2>
    `;

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