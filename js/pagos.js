// js/pagos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { generarReciboPDF } from './recibos.js';
/**
 * Muestra la lista de pagos.
 */
export async function mostrarPagos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de pagos.", 'error');
        return;
    }

    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
            const nombreInquilino = inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido';
            pagosList.push({ id: doc.id, ...data, nombreInmueble, nombreInquilino });
        });

        // Ordenar los pagos por fecha de registro (el más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let tablaFilas = "";
        if (pagosList.length === 0) {
            tablaFilas = `<tr><td colspan="10" class="text-center py-4 text-gray-500">No hay pagos registrados.</td></tr>`;
        } else {
            pagosList.forEach(pago => {
                // Clases para el estado del pago
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                switch (pago.estado) {
                    case "pagado":
                        estadoClass += " bg-green-100 text-green-800";
                        break;
                    case "parcial":
                        estadoClass += " bg-yellow-100 text-yellow-800";
                        break;
                    case "pendiente":
                        estadoClass += " bg-red-100 text-red-800";
                        break;
                    case "vencido":
                        estadoClass += " bg-purple-100 text-purple-800";
                        break;
                    default:
                        estadoClass += " bg-gray-100 text-gray-800";
                        break;
                }

                // Calcular el monto base (renta)
                let montoBase = pago.montoBase || pago.montoTotal || 0;
                
                // Calcular el monto total sumando servicios y mobiliario
                let montoTotal = montoBase;
                
                // Sumar montos de servicios pagados
                if (pago.serviciosPagados) {
                    if (pago.serviciosPagados.internet && pago.serviciosPagados.internetMonto) {
                        montoTotal += pago.serviciosPagados.internetMonto;
                    }
                    if (pago.serviciosPagados.agua && pago.serviciosPagados.aguaMonto) {
                        montoTotal += pago.serviciosPagados.aguaMonto;
                    }
                    if (pago.serviciosPagados.luz && pago.serviciosPagados.luzMonto) {
                        montoTotal += pago.serviciosPagados.luzMonto;
                    }
                }
                
                // Asegurar que los montos se muestren con 2 decimales, incluso si son null o undefined
                const montoTotalFormatted = montoTotal.toFixed(2);
                const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                // En la generación de filas de la tabla:
                const servicios = [];
                if (pago.serviciosPagados?.internet) {
                    servicios.push(`Internet: ${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                }
                if (pago.serviciosPagados?.agua) {
                    servicios.push(`Agua: ${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                }
                if (pago.serviciosPagados?.luz) {
                    servicios.push(`Luz: ${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);
                }
                
                // Calcular total de mobiliario
                let mobiliarioTotal = 0;
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                    pago.mobiliarioPagado.forEach(item => {
                        mobiliarioTotal += item.costo || 0;
                    });
                }
                const mobiliarioHtml = mobiliarioTotal > 0 ? 
                    `${mobiliarioTotal.toFixed(2)}` : 
                    '-';


                tablaFilas += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${pago.nombreInmueble}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.nombreInquilino}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${montoTotalFormatted}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${montoPagadoFormatted}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${saldoPendienteFormatted}</td>
                        <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${servicios.join('<br>') || '-'}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">${mobiliarioHtml}</td>
                        <td class="px-4 py-2 text-sm text-right">
                            <div class="flex flex-wrap justify-end gap-1">
                                <button data-pago-id="${pago.id}" class="btn-detalle-pago bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>Detalles</span>
                                </button>
                                <button data-pago-id="${pago.id}" class="btn-abonar-pago bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Abonar</span>
                                </button>
                                <button data-pago-id="${pago.id}" class="btn-editar-pago bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                    <span>Editar</span>
                                </button>
                                <button data-pago-id="${pago.id}" class="btn-gestionar-servicios bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    <span>Servicios</span>
                                </button>
                                ${mobiliarioTotal > 0 ? `<button data-pago-id="${pago.id}" class="btn-gestionar-mobiliario bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                    </svg>
                                    <span>Mobiliario</span>
                                </button>` : ''}
                                <button data-pago-id="${pago.id}" class="btn-eliminar-pago bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                    <span>Eliminar</span>
                                </button>
                                <button data-pago-id="${pago.id}" class="btn-recibo-pdf bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                    </svg>
                                    <span>PDF</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        // Opciones para los filtros
        const inmueblesOptions = [...inmueblesMap.entries()].map(([id, nombre]) =>
            `<option value="${id}">${nombre}</option>`).join('');
        const inquilinosOptions = [...inquilinosMap.entries()].map(([id, nombre]) =>
            `<option value="${id}">${nombre}</option>`).join('');
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const estados = ["pagado", "parcial", "pendiente", "vencido"];
        const estadosOptions = estados.map(e => `<option value="${e}">${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join('');

        // Filtros UI
        const filtrosHtml = `
            <div class="flex flex-wrap gap-4 mb-4 items-end">
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Inmueble</label>
                    <select id="filtroInmueble" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${inmueblesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Inquilino</label>
                    <select id="filtroInquilino" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${inquilinosOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                    <select id="filtroMes" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${mesesOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                    <select id="filtroEstado" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${estadosOptions}
                    </select>
                </div>
                <button id="btnLimpiarFiltros" class="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-3 py-1 rounded-md shadow-sm transition-colors duration-200">Limpiar</button>
            </div>
        `;

        contenedor.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-700">Listado de Pagos de Renta</h2>
                <div class="flex gap-2">
                    <button id="btnNuevoPago" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Nuevo Pago</button>
                    <button id="btnPagoServicio" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200">Registrar Pago de Servicio</button>
                </div>
            </div>
            ${filtrosHtml}
            <div class="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Pagado</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Pendiente</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Corresp.</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios Pagados</th>
                            <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobiliario</th>
                            <th scope="col" class="relative px-4 py-2 text-right"><span class="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tablaFilas}
                    </tbody>
                </table>
            </div>
        `;
document.getElementById('btnPagoServicio').addEventListener('click', () => {
    // Mostrar opciones para elegir entre pago de servicios o mobiliario
    const opcionesHtml = `
        <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
            <h3 class="text-2xl font-bold text-center">Seleccionar Tipo de Pago</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <button id="btnPagarServicios" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                text-white p-6 rounded-xl shadow-md transition-all duration-200 flex flex-col items-center justify-center">
                <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span class="text-lg font-medium">Pago de Servicios</span>
                <span class="text-sm text-blue-100 mt-1">Internet, Agua, Luz</span>
            </button>
            <button id="btnPagarMobiliario" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                text-white p-6 rounded-xl shadow-md transition-all duration-200 flex flex-col items-center justify-center">
                <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span class="text-lg font-medium">Pago de Mobiliario</span>
                <span class="text-sm text-green-100 mt-1">Muebles y Equipamiento</span>
            </button>
        </div>
    `;
    
    mostrarModal(opcionesHtml);
    
    // Agregar event listeners a los botones
    document.getElementById('btnPagarServicios').addEventListener('click', () => {
        ocultarModal();
        mostrarFormularioPagoServicio();
    });
    
    document.getElementById('btnPagarMobiliario').addEventListener('click', () => {
        ocultarModal();
        mostrarFormularioPagoMobiliario();
    });
});
        // --- Adjuntar Event Listeners después de que el HTML se ha cargado ---
        document.getElementById('btnNuevoPago').addEventListener('click', () => mostrarFormularioNuevoPago());

        document.querySelectorAll('.btn-detalle-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                mostrarDetallePago(pagoId);
            });
        });

        document.querySelectorAll('.btn-abonar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                // Busca el pago en la lista para obtener los datos necesarios
                const pagoData = pagosList.find(p => p.id === pagoId);
                if (pagoData) {
                    mostrarFormularioRegistrarAbono(pagoId, pagoData.montoTotal, pagoData.montoPagado);
                } else {
                    mostrarNotificacion("Error: No se encontró la información del pago para abonar.", 'error');
                }
            });
        });

        document.querySelectorAll('.btn-editar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                editarPago(pagoId);
            });
        });

        document.querySelectorAll('.btn-eliminar-pago').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                eliminarDocumento('pagos', pagoId, mostrarPagos);
            });
        });

        document.querySelectorAll('.btn-gestionar-servicios').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                gestionarServiciosPago(pagoId);
            });
        });
        
        // Actualizar la tabla cuando se elimina un servicio
        document.addEventListener('servicioEliminado', () => {
            mostrarPagos(); // Recargar la tabla para reflejar los cambios
        });

        document.querySelectorAll('.btn-recibo-pdf').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                generarReciboPDF(pagoId);
            });
        });

        document.querySelectorAll('.btn-gestionar-mobiliario').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                gestionarMobiliarioPago(pagoId);
            });
        });

        // --- Filtros interactivos ---
        function aplicarFiltros() {
            const filtroInmueble = document.getElementById('filtroInmueble').value;
            const filtroInquilino = document.getElementById('filtroInquilino').value;
            const filtroMes = document.getElementById('filtroMes').value;
            const filtroEstado = document.getElementById('filtroEstado').value;

            let pagosFiltrados = pagosList.filter(pago => {
                return (!filtroInmueble || pago.inmuebleId === filtroInmueble)
                    && (!filtroInquilino || pago.inquilinoId === filtroInquilino)
                    && (!filtroMes || pago.mesCorrespondiente === filtroMes)
                    && (!filtroEstado || pago.estado === filtroEstado);
            });

            // Generar filas de tabla con pagos filtrados
            let tablaFilas = "";
            if (pagosFiltrados.length === 0) {
                tablaFilas = `<tr><td colspan="10" class="text-center py-4 text-gray-500">No hay pagos registrados.</td></tr>`;
            } else {
                pagosFiltrados.forEach(pago => {
                    // Clases para el estado del pago
                    let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold";
                    switch (pago.estado) {
                        case "pagado":
                            estadoClass += " bg-green-100 text-green-800";
                            break;
                        case "parcial":
                            estadoClass += " bg-yellow-100 text-yellow-800";
                            break;
                        case "pendiente":
                            estadoClass += " bg-red-100 text-red-800";
                            break;
                        case "vencido":
                            estadoClass += " bg-purple-100 text-purple-800";
                            break;
                        default:
                            estadoClass += " bg-gray-100 text-gray-800";
                            break;
                    }

                    // Calcular el monto base (renta)
                    let montoBase = pago.montoBase || pago.montoTotal || 0;
                    
                    // Calcular el monto total sumando servicios y mobiliario
                    let montoTotal = montoBase;
                    
                    // Sumar montos de servicios pagados
                    if (pago.serviciosPagados) {
                        if (pago.serviciosPagados.internet && pago.serviciosPagados.internetMonto) {
                            montoTotal += pago.serviciosPagados.internetMonto;
                        }
                        if (pago.serviciosPagados.agua && pago.serviciosPagados.aguaMonto) {
                            montoTotal += pago.serviciosPagados.aguaMonto;
                        }
                        if (pago.serviciosPagados.luz && pago.serviciosPagados.luzMonto) {
                            montoTotal += pago.serviciosPagados.luzMonto;
                        }
                    }
                    
                    // Asegurar que los montos se muestren with 2 decimales, incluso si son null o undefined
                    const montoTotalFormatted = montoTotal.toFixed(2);
                    const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                    const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                    // En la generación de filas de la tabla:
                    const servicios = [];
                    if (pago.serviciosPagados?.internet) {
                        servicios.push(`Internet: ${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                    }
                    if (pago.serviciosPagados?.agua) {
                        servicios.push(`Agua: ${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                    }
                    if (pago.serviciosPagados?.luz) {
                        servicios.push(`Luz: ${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);
                    }
                    // ...agrega más servicios si los tienes
                    
                    // Calcular total de mobiliario
                    let mobiliarioTotal = 0;
                    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                        pago.mobiliarioPagado.forEach(item => {
                            mobiliarioTotal += item.costo || 0;
                        });
                    }
                    const mobiliarioHtml = mobiliarioTotal > 0 ? 
                        `${mobiliarioTotal.toFixed(2)}` : 
                        '-';


                    tablaFilas += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-2 text-sm text-gray-800">${pago.nombreInmueble}</td>
                            <td class="px-4 py-2 text-sm text-gray-700">${pago.nombreInquilino}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${montoTotalFormatted}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${montoPagadoFormatted}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${saldoPendienteFormatted}</td>
                            <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                            <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${servicios.join('<br>') || '-'}</td>
                            <td class="px-4 py-2 text-sm text-gray-800">${mobiliarioHtml}</td>
                            <td class="px-4 py-2 text-sm text-right">
                                <div class="flex flex-wrap justify-end gap-1">
                                    <button data-pago-id="${pago.id}" class="btn-detalle-pago bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        <span>Detalles</span>
                                    </button>
                                    <button data-pago-id="${pago.id}" class="btn-abonar-pago bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>Abonar</span>
                                    </button>
                                    <button data-pago-id="${pago.id}" class="btn-editar-pago bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                        <span>Editar</span>
                                    </button>
                                    <button data-pago-id="${pago.id}" class="btn-gestionar-servicios bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        <span>Servicios</span>
                                    </button>
                                    <button data-pago-id="${pago.id}" class="btn-eliminar-pago bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                        <span>Eliminar</span>
                                    </button>
                                    <button data-pago-id="${pago.id}" class="btn-recibo-pdf bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-md text-xs transition-colors duration-200 flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>PDF</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            document.querySelector('.min-w-full tbody').innerHTML = tablaFilas;
        }

        // Listeners de filtros
        document.getElementById('filtroInmueble').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroInquilino').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroMes').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            document.getElementById('filtroInmueble').value = "";
            document.getElementById('filtroInquilino').value = "";
            document.getElementById('filtroMes').value = "";
            document.getElementById('filtroEstado').value = "";
            aplicarFiltros();
        });

    } catch (error) {
        console.error("Error al mostrar pagos:", error);
        mostrarNotificacion("Error al cargar la lista de pagos.", 'error');
    }
}

/**
 * Muestra el formulario para registrar o editar un pago.
 * @param {string} id - El ID del pago a editar (opcional).
 */
export async function mostrarFormularioNuevoPago(id = null) {
    let pago = {};
    let inmuebles = [];
    let inquilinos = [];
    let titulo = id ? "Editar Pago" : "Registrar Nuevo Pago";

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        inmueblesSnap.forEach(doc => {
            // Solo agregar inmuebles ocupados
            if (doc.data().estado === 'Ocupado') {
                inmuebles.push({ id: doc.id, ...doc.data() });
            }
        });

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "pagos", id));
            if (docSnap.exists()) {
                pago = { id: docSnap.id, ...docSnap.data() };
            } else {
                mostrarNotificacion("Pago no encontrado.", 'error');
                return;
            }
        }
    } catch (error) {
        mostrarNotificacion("Error al preparar el formulario de pago.", 'error');
        return;
    }

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const anioActual = new Date().getFullYear();
    const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);

    // Opciones de inmuebles
    const inmueblesOptions = inmuebles.map(inm => `
        <option value="${inm.id}" data-renta="${inm.rentaMensual || 0}">
            ${inm.nombre}
        </option>
    `).join('');

    // Opciones de inquilinos
    const inquilinosOptions = inquilinos.map(inq => `
        <option value="${inq.id}">${inq.nombre}</option>
    `).join('');

    // Opciones de meses y años
    const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
    const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

    // Valores por defecto para edición
    const selectedInmueble = pago.inmuebleId || '';
    const selectedInquilino = pago.inquilinoId || '';
    const selectedMes = pago.mesCorrespondiente || '';
    const selectedAnio = pago.anioCorrespondiente || anioActual;
    const montoTotal = pago.montoTotal || '';
    const montoPagado = pago.montoPagado || '';
    const fechaRegistro = pago.fechaRegistro || new Date().toISOString().split('T')[0];

    const propietariosSnap = await getDocs(collection(db, "propietarios"));
    let propietarios = [];
    propietariosSnap.forEach(doc => {
        propietarios.push({ id: doc.id, ...doc.data() });
    });
    const propietariosOptions = propietarios.map(prop =>
        `<option value="${prop.id}">${prop.nombre} (${prop.telefono})</option>`
    ).join('');

    // Genera botones para eliminar servicios pagados si existen
    let serviciosEliminablesHtml = '';
    if (pago.serviciosPagados) {
        for (const key in pago.serviciosPagados) {
            if (key.endsWith('Monto')) continue;
            if (pago.serviciosPagados[key] === true) {
                serviciosEliminablesHtml += `
                    <div class="flex items-center gap-2 mt-2">
                        <span class="text-sm font-medium">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <button type="button" class="btn-eliminar-servicio bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" data-servicio="${key}">
                            Eliminar
                        </button>
                    </div>
                `;
            }
        }
    }

    const formHtml = `
    <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
        <h3 class="text-2xl font-bold text-center">${titulo}</h3>
    </div>
    <form id="formPago" class="space-y-5 px-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="inmuebleId" class="block text-sm font-semibold text-gray-700 mb-1">Inmueble</label>
                <select id="inmuebleId" name="inmuebleId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">Selecciona un inmueble</option>
                    ${inmueblesOptions}
                </select>
            </div>
            <div>
                <label for="inquilinoId" class="block text-sm font-semibold text-gray-700 mb-1">Inquilino</label>
                <select id="inquilinoId" name="inquilinoId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="">Selecciona un inquilino</option>
                    ${inquilinosOptions}
                </select>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="montoTotal" class="block text-sm font-semibold text-gray-700 mb-1">Costo mensual del inmueble</label>
                <input type="number" id="montoTotal" name="montoTotal" step="0.01" min="0" required readonly
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
                <label for="montoPago" class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a pagar ahora</label>
                <input type="number" id="montoPago" name="montoPago" step="0.01" min="0.01" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <span class="text-xs text-blue-500">Si la cantidad es menor al costo mensual, el pago será considerado parcial.</span>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label for="mesCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Mes Correspondiente</label>
                <select id="mesCorrespondiente" name="mesCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    ${mesesOptions}
                </select>
            </div>
            <div>
                <label for="anioCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Año Correspondiente</label>
                <select id="anioCorrespondiente" name="anioCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                    ${aniosOptions}
                </select>
            </div>
            <div>
                <label for="fechaRegistro" class="block text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</label>
                <input type="date" id="fechaRegistro" name="fechaRegistro" value="${fechaRegistro}" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>

        <!-- Forma de pago -->
        <div>
            <label for="formaPago" class="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
            <select id="formaPago" name="formaPago" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                <option value="">Selecciona una forma de pago</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Depósito">Depósito</option>
                <option value="Otro">Otro</option>
            </select>
        </div>

        <!-- Propietario -->
        <div>
            <label for="propietarioId" class="block text-sm font-semibold text-gray-700 mb-1">Propietario</label>
            <select id="propietarioId" name="propietarioId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                <option value="">Selecciona un propietario</option>
                ${propietariosOptions}
            </select>
        </div>

        <!-- Servicios adicionales -->
        <div id="serviciosAdicionales" style="display:none;">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Servicios Pagados</label>
            <!-- Aquí se insertan los botones de eliminar -->
            ${serviciosEliminablesHtml}
        </div>

        <div class="flex justify-end space-x-3 mt-8">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                ${id ? "Actualizar Pago" : "Registrar Pago"}
            </button>
        </div>
    </form>
`;

    mostrarModal(formHtml);

    // --- Script de autollenado robusto ---
    const inmuebleSelect = document.getElementById('inmuebleId');
    const inquilinoSelect = document.getElementById('inquilinoId');
    const montoTotalInput = document.getElementById('montoTotal');
    const montoPagoInput = document.getElementById('montoPago');

    // Dentro de la función mostrarFormularioNuevoPago, después de cargar los inmuebles e inquilinos, agregar la consulta de mobiliario
    const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
    let mobiliarioMap = new Map();
    mobiliarioSnap.forEach(doc => {
        const mob = doc.data();
        if (Array.isArray(mob.asignaciones)) {
            mobiliarioMap.set(doc.id, mob);
        }
    });

    // Función para obtener solo el costo del inmueble (sin sumar mobiliario)
    async function calcularTotal(inmuebleId) {
        const inmueble = inmuebles.find(inm => inm.id === inmuebleId);
        if (!inmueble) return 0;
        return inmueble.rentaMensual || 0;
    }

    // Al cargar el formulario, calcular y mostrar el total si hay un inmueble seleccionado
    if (selectedInmueble) {
        const total = await calcularTotal(selectedInmueble);
        montoTotalInput.value = total;
    }

    // En el event listener de cambio del inmueble, usar la función calcularTotal
    inmuebleSelect.addEventListener('change', async function() {
        const inmuebleId = this.value;
        const total = await calcularTotal(inmuebleId);
        montoTotalInput.value = total;
        // montoPagoInput.value = total; // Actualizar el monto a pagar con el total calculado

        // Autocompletar el campo del inquilino con el inquilino asociado al inmueble
        const inmueble = inmuebles.find(inm => inm.id === inmuebleId);
        if (inmueble && inmueble.inquilinoActualId) {
            inquilinoSelect.value = inmueble.inquilinoActualId;
            inquilinoSelect.disabled = true; // Bloquear el campo del inquilino
        } else {
            inquilinoSelect.value = '';
            inquilinoSelect.disabled = false; // Desbloquear el campo si no hay inquilino asociado
        }
    });



    // Si es edición, selecciona los valores actuales
    inmuebleSelect.value = selectedInmueble;
    inquilinoSelect.value = selectedInquilino;
    document.getElementById('mesCorrespondiente').value = selectedMes;
    document.getElementById('anioCorrespondiente').value = selectedAnio;
    montoTotalInput.value = montoTotal;
    montoPagoInput.value = montoPagado;

    // --- Guardar pago ---
    document.getElementById('formPago').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inmuebleId = inmuebleSelect.value;
        const inquilinoId = inquilinoSelect.value;
        const montoTotal = parseFloat(montoTotalInput.value);
        const montoPago = parseFloat(montoPagoInput.value);
        const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
        const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
        const fechaRegistro = document.getElementById('fechaRegistro').value;

        // Validación de duplicidad solo para nuevo pago
        if (!id) {
            const pagosRef = collection(db, "pagos");
            const q = query(
                pagosRef,
                where("inmuebleId", "==", inmuebleId),
                where("mesCorrespondiente", "==", mesCorrespondiente),
                where("anioCorrespondiente", "==", anioCorrespondiente),
                where("estado", "==", "pagado")
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                mostrarNotificacion('Ya existe un pago completo registrado para este inmueble, mes y año. No se permite duplicados.', 'error', 8000);
                return;
            }
        }

        // Estado y saldos según el monto pagado
        let estado = "pendiente";
        let saldoPendiente = montoTotal - montoPago;
        if (montoPago >= montoTotal) {
            estado = "pagado";
            saldoPendiente = 0;
        } else if (montoPago > 0) {
            estado = "parcial";
        }

        // --- AQUÍ VA EL FRAGMENTO DE SALDO A FAVOR ---
    if (montoPago > montoTotal) {
        const excedente = montoPago - montoTotal;
        const abonosSnap = await getDocs(query(
            collection(db, "abonosSaldoFavor"),
            where("inquilinoId", "==", inquilinoId),
            where("saldoRestante", ">", 0)
        ));
        if (!abonosSnap.empty) {
            const abonoDoc = abonosSnap.docs[0];
            const abonoData = abonoDoc.data();
            await updateDoc(doc(db, "abonosSaldoFavor", abonoDoc.id), {
                saldoRestante: abonoData.saldoRestante + excedente,
                montoOriginal: abonoData.montoOriginal + excedente
            });
        } else {
            await addDoc(collection(db, "abonosSaldoFavor"), {
                inquilinoId,
                montoOriginal: excedente,
                saldoRestante: excedente,
                descripcion: "Saldo a favor generado por pago excedente",
                fechaAbono: fechaRegistro,
                fechaRegistro: fechaRegistro
            });
        }
    }
    // --- FIN DEL FRAGMENTO ---

        const formaPago = document.getElementById('formaPago').value;
        const propietarioId = document.getElementById('propietarioId').value;
        const serviciosPagados = {};
        
        // Verificar si existen los elementos de servicios antes de acceder a ellos
        const servicioInternet = document.getElementById('servicioInternet');
        if (servicioInternet && servicioInternet.checked) {
            serviciosPagados.internet = true;
            const montoInternet = document.getElementById('montoInternet');
            serviciosPagados.internetMonto = montoInternet ? parseFloat(montoInternet.value) || 0 : 0;
        }

        const datos = {
            inmuebleId,
            inquilinoId,
            mesCorrespondiente,
            anioCorrespondiente,
            montoTotal,
            montoPagado: montoPago,
            saldoPendiente,
            estado,
            fechaRegistro,
            abonos: [{
                montoAbonado: montoPago,
                fechaAbono: fechaRegistro
            }],
            formaPago,
            propietarioId,
            serviciosPagados
        };

        try {
            if (id) {
                await updateDoc(doc(db, "pagos", id), datos);
                mostrarNotificacion('Pago actualizado con éxito.', 'success');
            } else {
                await addDoc(collection(db, "pagos"), datos);
                mostrarNotificacion('Pago registrado con éxito.', 'success');
            }
            ocultarModal();
            mostrarPagos();
            
        } catch (error) {
            mostrarNotificacion('Error al guardar el pago.', 'error');
        }
    });

    if (document.getElementById('servicioInternet')) {
        document.getElementById('servicioInternet').addEventListener('change', function() {
            document.getElementById('montoInternet').style.display = this.checked ? 'inline-block' : 'none';
        });
    }

    document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
        btn.addEventListener('click', async function() {
            const servicio = this.dataset.servicio;
            if (confirm(`¿Eliminar el servicio "${servicio}" de este pago?`)) {
                // Elimina el servicio y su monto del objeto
                delete pago.serviciosPagados[servicio];
                delete pago.serviciosPagados[`${servicio}Monto`];
                // Actualiza en Firestore
                await updateDoc(doc(db, "pagos", pago.id), { serviciosPagados: pago.serviciosPagados });
                mostrarNotificacion('Servicio eliminado correctamente.', 'success');
                ocultarModal();
                mostrarPagos();
            }
        });
    });

    // Después de mostrar el modal
    if (
        (pago.serviciosPagados && Object.keys(pago.serviciosPagados).length > 0) ||
        (inmuebles.find(inm => inm.id === selectedInmueble)?.tieneInternet)
    ) {
        document.getElementById('serviciosAdicionales').style.display = 'block';
    }
}


/**
 * Permite editar un pago existente.
 * @param {string} id - El ID del pago a editar.
 */
export async function editarPago(id) {
    await mostrarFormularioNuevoPago(id);
}

/**
 * Muestra el formulario para registrar pagos de servicios (internet, agua, luz).
 * Permite registrar servicios de manera independiente o todos a la vez.
 */
export async function mostrarFormularioPagoServicio() {
    try {
        // Obtener inquilinos activos
        const inquilinosSnap = await getDocs(query(collection(db, "inquilinos"), where("activo", "==", true)));
        const inquilinos = [];
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (inquilinos.length === 0) {
            mostrarNotificacion("No hay inquilinos activos para registrar pagos.", "error");
            return;
        }
        
        // Obtener inmuebles para mostrar junto a los inquilinos
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        // Opciones de inquilinos con inmueble asociado
        const inquilinosOptions = inquilinos.map(inq => {
            const inmuebleNombre = inmueblesMap.get(inq.inmuebleAsociadoId) || 'Sin inmueble';
            return `<option value="${inq.id}">${inq.nombre} - ${inmuebleNombre}</option>`;
        }).join('');

        // Meses y años para el formulario
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

        // Formulario HTML
        const formHtml = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Registrar Pago de Servicios</h3>
            </div>
            <form id="formPagoServicio" class="space-y-5 px-2">
                <div>
                    <label for="inquilinoId" class="block text-sm font-semibold text-gray-700 mb-1">Inquilino</label>
                    <select id="inquilinoId" name="inquilinoId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="">Selecciona un inquilino</option>
                        ${inquilinosOptions}
                    </select>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="font-medium text-gray-700 mb-3">Servicios a pagar</h4>
                    
                    <div class="space-y-4">
                        <!-- Internet -->
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioInternet" name="servicioInternet" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioInternet" class="text-sm font-medium text-gray-700">Internet</label>
                                <input type="number" id="montoInternet" name="montoInternet" placeholder="Monto" min="0" step="0.01" 
                                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            </div>
                        </div>
                        
                        <!-- Agua -->
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioAgua" name="servicioAgua" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioAgua" class="text-sm font-medium text-gray-700">Agua</label>
                                <input type="number" id="montoAgua" name="montoAgua" placeholder="Monto" min="0" step="0.01" 
                                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            </div>
                        </div>
                        
                        <!-- Luz -->
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioLuz" name="servicioLuz" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioLuz" class="text-sm font-medium text-gray-700">Luz</label>
                                <input type="number" id="montoLuz" name="montoLuz" placeholder="Monto" min="0" step="0.01" 
                                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="mesCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Mes Correspondiente</label>
                        <select id="mesCorrespondiente" name="mesCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                            ${mesesOptions}
                        </select>
                    </div>
                    <div>
                        <label for="anioCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Año Correspondiente</label>
                        <select id="anioCorrespondiente" name="anioCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                            ${aniosOptions}
                        </select>
                    </div>
                    <div>
                        <label for="fechaRegistro" class="block text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</label>
                        <input type="date" id="fechaRegistro" name="fechaRegistro" value="${new Date().toISOString().split('T')[0]}" required
                            class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>

                <div>
                    <label for="formaPago" class="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
                    <select id="formaPago" name="formaPago" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                        <option value="">Selecciona una forma de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>

                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                        Registrar Pago
                    </button>
                </div>
            </form>
        `;

        mostrarModal(formHtml);

        // Establecer mes y año actuales
        const fechaActual = new Date();
        document.getElementById('mesCorrespondiente').value = meses[fechaActual.getMonth()];
        document.getElementById('anioCorrespondiente').value = fechaActual.getFullYear();

        // Manejar cambio en checkboxes de servicios
        document.getElementById('servicioInternet').addEventListener('change', function() {
            document.getElementById('montoInternet').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoInternet').value = '';
        });
        
        document.getElementById('servicioAgua').addEventListener('change', function() {
            document.getElementById('montoAgua').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoAgua').value = '';
        });
        
        document.getElementById('servicioLuz').addEventListener('change', function() {
            document.getElementById('montoLuz').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoLuz').value = '';
        });

        // Deshabilitar campos de monto inicialmente
        document.getElementById('montoInternet').disabled = true;
        document.getElementById('montoAgua').disabled = true;
        document.getElementById('montoLuz').disabled = true;

        // Manejar envío del formulario
        document.getElementById('formPagoServicio').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inquilinoId = document.getElementById('inquilinoId').value;
            const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
            const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
            const fechaRegistro = document.getElementById('fechaRegistro').value;
            const formaPago = document.getElementById('formaPago').value;
            
            // Verificar servicios seleccionados
            const servicioInternet = document.getElementById('servicioInternet').checked;
            const servicioAgua = document.getElementById('servicioAgua').checked;
            const servicioLuz = document.getElementById('servicioLuz').checked;
            
            if (!servicioInternet && !servicioAgua && !servicioLuz) {
                mostrarNotificacion("Debes seleccionar al menos un servicio para registrar el pago.", "error");
                return;
            }
            
            // Obtener montos
            const montoInternet = servicioInternet ? parseFloat(document.getElementById('montoInternet').value) || 0 : 0;
            const montoAgua = servicioAgua ? parseFloat(document.getElementById('montoAgua').value) || 0 : 0;
            const montoLuz = servicioLuz ? parseFloat(document.getElementById('montoLuz').value) || 0 : 0;
            
            // Validar que los servicios seleccionados tengan monto
            if ((servicioInternet && montoInternet <= 0) || 
                (servicioAgua && montoAgua <= 0) || 
                (servicioLuz && montoLuz <= 0)) {
                mostrarNotificacion("Debes ingresar un monto válido para cada servicio seleccionado.", "error");
                return;
            }
            
            try {
                // Buscar el inmueble asociado al inquilino
                const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
                const inmuebleId = inquilinoDoc.data().inmuebleAsociadoId;
                
                // Crear objeto de servicios pagados
                const serviciosPagados = {};
                if (servicioInternet) {
                    serviciosPagados.internet = true;
                    serviciosPagados.internetMonto = montoInternet;
                }
                if (servicioAgua) {
                    serviciosPagados.agua = true;
                    serviciosPagados.aguaMonto = montoAgua;
                }
                if (servicioLuz) {
                    serviciosPagados.luz = true;
                    serviciosPagados.luzMonto = montoLuz;
                }
                
                // Buscar si ya existe un pago para ese mes/año
                const pagosRef = collection(db, "pagos");
                const q = query(
                    pagosRef,
                    where("inmuebleId", "==", inmuebleId),
                    where("inquilinoId", "==", inquilinoId),
                    where("mesCorrespondiente", "==", mesCorrespondiente),
                    where("anioCorrespondiente", "==", anioCorrespondiente)
                );
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    // Ya existe un pago para este mes, actualizar servicios
                    const pagoDoc = querySnapshot.docs[0];
                    const pagoExistente = pagoDoc.data();
                    
                    // Combinar servicios existentes con nuevos
                    const serviciosActualizados = pagoExistente.serviciosPagados || {};
                    
                    if (servicioInternet) {
                        serviciosActualizados.internet = true;
                        serviciosActualizados.internetMonto = montoInternet;
                    }
                    if (servicioAgua) {
                        serviciosActualizados.agua = true;
                        serviciosActualizados.aguaMonto = montoAgua;
                    }
                    if (servicioLuz) {
                        serviciosActualizados.luz = true;
                        serviciosActualizados.luzMonto = montoLuz;
                    }
                    
                    // Actualizar documento existente
                    await updateDoc(doc(db, "pagos", pagoDoc.id), {
                        serviciosPagados: serviciosActualizados
                    });
                    
                    mostrarNotificacion("Servicios agregados al pago existente.", "success");
                } else {
                    // No existe pago para este mes, crear uno nuevo solo con servicios
                    const montoTotal = montoInternet + montoAgua + montoLuz;
                    
                    await addDoc(collection(db, "pagos"), {
                        inmuebleId,
                        inquilinoId,
                        mesCorrespondiente,
                        anioCorrespondiente,
                        montoTotal: 0, // El pago principal es 0, solo son servicios
                        montoPagado: 0,
                        saldoPendiente: 0,
                        estado: "pagado",
                        fechaRegistro,
                        formaPago,
                        tipoPago: "servicios",
                        serviciosPagados
                    });
                    
                    mostrarNotificacion("Pago de servicios registrado con éxito.", "success");
                }
                
                ocultarModal();
                mostrarPagos();
                
            } catch (error) {
                console.error("Error al registrar pago de servicios:", error);
                mostrarNotificacion("Error al registrar el pago de servicios.", "error");
            }
        });
        
    } catch (error) {
        console.error("Error al preparar formulario de pago de servicios:", error);
        mostrarNotificacion("Error al preparar el formulario de pago.", "error");
    }
}

/**
 * Muestra el formulario para registrar un pago específico de mobiliario.
 * Considera la fecha de asignación para determinar si se cobra en el mes actual o siguiente.
 */
export async function mostrarFormularioPagoMobiliario() {
    try {
        // Obtener inquilinos activos con mobiliario asignado
        const inquilinosSnap = await getDocs(query(collection(db, "inquilinos"), where("activo", "==", true)));
        const inquilinos = [];
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (inquilinos.length === 0) {
            mostrarNotificacion("No hay inquilinos activos para registrar pagos.", "error");
            return;
        }

        // Obtener inmuebles para mostrar junto a los inquilinos
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        // Obtener mobiliario asignado
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        const mobiliarioAsignado = [];
        
        mobiliarioSnap.forEach(doc => {
            const mob = doc.data();
            if (Array.isArray(mob.asignaciones)) {
                const asignacionesActivas = mob.asignaciones.filter(a => a.activa !== false);
                if (asignacionesActivas.length > 0) {
                    mobiliarioAsignado.push({
                        id: doc.id,
                        ...mob,
                        asignacionesActivas
                    });
                }
            }
        });

        if (mobiliarioAsignado.length === 0) {
            mostrarNotificacion("No hay mobiliario asignado para registrar pagos.", "info");
            return;
        }

        // Opciones de inquilinos con inmueble asociado
        const inquilinosOptions = inquilinos.map(inq => {
            const inmuebleNombre = inmueblesMap.get(inq.inmuebleAsociadoId) || 'Sin inmueble';
            return `<option value="${inq.id}">${inq.nombre} - ${inmuebleNombre}</option>`;
        }).join('');

        // Meses y años para el formulario
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 5 }, (_, i) => anioActual - 2 + i);
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

        // Formulario HTML
        const formHtml = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Registrar Pago de Mobiliario</h3>
            </div>
            <form id="formPagoMobiliario" class="space-y-5 px-2">
                <div>
                    <label for="inquilinoId" class="block text-sm font-semibold text-gray-700 mb-1">Inquilino</label>
                    <select id="inquilinoId" name="inquilinoId" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                        <option value="">Selecciona un inquilino</option>
                        ${inquilinosOptions}
                    </select>
                </div>
                
                <div id="mobiliarioContainer" class="space-y-4">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Mobiliario Asignado</label>
                    <div id="listaMobiliarioAsignado" class="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <p class="text-gray-500 text-center">Selecciona un inquilino para ver su mobiliario asignado</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="mesCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Mes Correspondiente</label>
                        <select id="mesCorrespondiente" name="mesCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                            ${mesesOptions}
                        </select>
                    </div>
                    <div>
                        <label for="anioCorrespondiente" class="block text-sm font-semibold text-gray-700 mb-1">Año Correspondiente</label>
                        <select id="anioCorrespondiente" name="anioCorrespondiente" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white">
                            ${aniosOptions}
                        </select>
                    </div>
                    <div>
                        <label for="fechaRegistro" class="block text-sm font-semibold text-gray-700 mb-1">Fecha de Registro</label>
                        <input type="date" id="fechaRegistro" name="fechaRegistro" value="${new Date().toISOString().split('T')[0]}" required
                            class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>

                <div>
                    <label for="formaPago" class="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
                    <select id="formaPago" name="formaPago" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
                        <option value="">Selecciona una forma de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>

                <div class="flex justify-end space-x-3 mt-8">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                        Registrar Pago
                    </button>
                </div>
            </form>
        `;

        mostrarModal(formHtml);

        // Establecer mes y año actuales
        const fechaActual = new Date();
        document.getElementById('mesCorrespondiente').value = meses[fechaActual.getMonth()];
        document.getElementById('anioCorrespondiente').value = fechaActual.getFullYear();

        // Manejar cambio de inquilino
        document.getElementById('inquilinoId').addEventListener('change', function() {
            const inquilinoId = this.value;
            if (!inquilinoId) {
                document.getElementById('listaMobiliarioAsignado').innerHTML = 
                    '<p class="text-gray-500 text-center">Selecciona un inquilino para ver su mobiliario asignado</p>';
                return;
            }

            // Filtrar mobiliario asignado al inquilino seleccionado
            const mobiliarioInquilino = mobiliarioAsignado.filter(mob => 
                mob.asignacionesActivas.some(a => a.inquilinoId === inquilinoId)
            );

            if (mobiliarioInquilino.length === 0) {
                document.getElementById('listaMobiliarioAsignado').innerHTML = 
                    '<p class="text-gray-500 text-center">Este inquilino no tiene mobiliario asignado</p>';
                return;
            }

            // Generar lista de mobiliario con checkboxes
            let html = '';
            mobiliarioInquilino.forEach(mob => {
                const asignacion = mob.asignacionesActivas.find(a => a.inquilinoId === inquilinoId);
                if (asignacion) {
                    // Determinar si debe cobrarse en el mes actual o siguiente
                    const fechaAsignacion = new Date(asignacion.fechaAsignacion);
                    const diaAsignacion = fechaAsignacion.getDate();
                    const cobroEnMesActual = diaAsignacion < 15;
                    
                    // Calcular mes de cobro
                    let mesCobro, anioCobro;
                    if (cobroEnMesActual) {
                        mesCobro = meses[fechaAsignacion.getMonth()];
                        anioCobro = fechaAsignacion.getFullYear();
                    } else {
                        // Si es después del día 15, cobrar el siguiente mes
                        const fechaSiguienteMes = new Date(fechaAsignacion);
                        fechaSiguienteMes.setMonth(fechaAsignacion.getMonth() + 1);
                        mesCobro = meses[fechaSiguienteMes.getMonth()];
                        anioCobro = fechaSiguienteMes.getFullYear();
                    }
                    
                    const costoTotal = (mob.costoRenta || 0) * asignacion.cantidad;
                    
                    html += `
                        <div class="border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                            <div class="flex items-start">
                                <input type="checkbox" name="mobiliario" value="${mob.id}" 
                                    data-costo="${costoTotal.toFixed(2)}" 
                                    data-mes="${mesCobro}" 
                                    data-anio="${anioCobro}"
                                    data-asignacion-id="${asignacion.id || ''}"
                                    class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <div class="ml-3">
                                    <p class="font-medium">${mob.nombre} (${asignacion.cantidad} unidades)</p>
                                    <p class="text-sm text-gray-600">Costo: ${costoTotal.toFixed(2)}</p>
                                    <p class="text-sm ${cobroEnMesActual ? 'text-green-600' : 'text-blue-600'}">
                                        ${cobroEnMesActual ? 'Cobrar en mes actual' : 'Cobrar en mes siguiente'}: 
                                        ${mesCobro} ${anioCobro}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        Asignado: ${new Date(asignacion.fechaAsignacion).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            document.getElementById('listaMobiliarioAsignado').innerHTML = html;
            
            // Manejar cambio en checkboxes para actualizar mes/año
            document.querySelectorAll('input[name="mobiliario"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        document.getElementById('mesCorrespondiente').value = this.dataset.mes;
                        document.getElementById('anioCorrespondiente').value = this.dataset.anio;
                    }
                });
            });
        });

        // Manejar envío del formulario
        document.getElementById('formPagoMobiliario').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inquilinoId = document.getElementById('inquilinoId').value;
            const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
            const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
            const fechaRegistro = document.getElementById('fechaRegistro').value;
            const formaPago = document.getElementById('formaPago').value;
            
            // Verificar mobiliario seleccionado
            const mobiliarioSeleccionado = Array.from(document.querySelectorAll('input[name="mobiliario"]:checked'));
            
            if (mobiliarioSeleccionado.length === 0) {
                mostrarNotificacion("Debes seleccionar al menos un mobiliario para registrar el pago.", "error");
                return;
            }
            
            // Calcular monto total
            let montoTotal = 0;
            mobiliarioSeleccionado.forEach(checkbox => {
                montoTotal += parseFloat(checkbox.dataset.costo);
            });
            
            // Crear o actualizar registro de pago
            try {
                // Buscar el inmueble asociado al inquilino
                const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
                const inmuebleId = inquilinoDoc.data().inmuebleAsociadoId;
                
                // Verificar si ya existe un pago para este mes/año
                const pagosRef = collection(db, "pagos");
                const q = query(
                    pagosRef,
                    where("inmuebleId", "==", inmuebleId),
                    where("inquilinoId", "==", inquilinoId),
                    where("mesCorrespondiente", "==", mesCorrespondiente),
                    where("anioCorrespondiente", "==", anioCorrespondiente)
                );
                const querySnapshot = await getDocs(q);
                
                // Preparar datos del mobiliario
                const nuevoMobiliario = mobiliarioSeleccionado.map(checkbox => ({
                    mobiliarioId: checkbox.value,
                    costo: parseFloat(checkbox.dataset.costo),
                    asignacionId: checkbox.dataset.asignacionId || null
                }));
                
                if (!querySnapshot.empty) {
                    // Ya existe un pago para este mes, actualizar agregando el mobiliario
                    const pagoDoc = querySnapshot.docs[0];
                    const pagoExistente = pagoDoc.data();
                    
                    // Combinar mobiliario existente con nuevo
                    const mobiliarioActualizado = Array.isArray(pagoExistente.mobiliarioPagado) 
                        ? [...pagoExistente.mobiliarioPagado, ...nuevoMobiliario]
                        : nuevoMobiliario;
                    
                    // Recalcular montos
                    const nuevoMontoTotal = pagoExistente.montoTotal + montoTotal;
                    const nuevoMontoPagado = pagoExistente.montoPagado + montoTotal;
                    
                    // Actualizar documento existente
                    await updateDoc(doc(db, "pagos", pagoDoc.id), {
                        mobiliarioPagado: mobiliarioActualizado,
                        montoTotal: nuevoMontoTotal,
                        montoPagado: nuevoMontoPagado
                    });
                    
                    mostrarNotificacion("Mobiliario agregado al pago existente.", "success");
                } else {
                    // No existe pago para este mes, crear uno nuevo
                    const pagoData = {
                        inmuebleId,
                        inquilinoId,
                        mesCorrespondiente,
                        anioCorrespondiente,
                        montoTotal,
                        montoPagado: montoTotal,
                        saldoPendiente: 0,
                        estado: "pagado",
                        fechaRegistro,
                        abonos: [{
                            montoAbonado: montoTotal,
                            fechaAbono: fechaRegistro
                        }],
                        formaPago,
                        tipoPago: "mobiliario",
                        mobiliarioPagado: nuevoMobiliario
                    };
                    
                    await addDoc(collection(db, "pagos"), pagoData);
                    mostrarNotificacion("Pago de mobiliario registrado con éxito.", "success");
                }
                
                ocultarModal();
                mostrarPagos();
                
            } catch (error) {
                console.error("Error al registrar pago de mobiliario:", error);
                mostrarNotificacion("Error al registrar el pago de mobiliario.", "error");
            }
        });
        
    } catch (error) {
        console.error("Error al preparar formulario de pago de mobiliario:", error);
        mostrarNotificacion("Error al preparar el formulario de pago.", "error");
    }
}


/**
 * Muestra el formulario para registrar un abono a un pago pendiente o parcial.
 * @param {string} pagoId - El ID del pago al que se va a abonar.
 */
export async function mostrarFormularioRegistrarAbono(pagoId) {
    let pago = {};
    try {
        const docSnap = await getDoc(doc(db, "pagos", pagoId));
        if (docSnap.exists()) {
            pago = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("No se encontró el pago con el ID:", pagoId);
            mostrarNotificacion("Pago no encontrado para abonar.", 'error');
            return;
        }
    } catch (error) {
        console.error("Error al cargar datos para abono:", error);
        mostrarNotificacion("Error al preparar el formulario de abono.", 'error');
        return;
    }

    // --- VALIDACIÓN: No permitir abonos si el pago ya está pagado ---
    if (pago.estado === 'pagado' || pago.saldoPendiente === 0) {
        mostrarNotificacion('Este pago ya está completamente pagado. No puedes registrar más abonos.', 'warning');
        return;
    }

    const montoTotal = pago.montoTotal || 0;
    const montoPagadoActual = pago.montoPagado || 0;
    const saldoPendiente = montoTotal - montoPagadoActual;

    const formAbonoHtml = `
    <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
        <h3 class="text-2xl font-bold text-center">Registrar Abono</h3>
    </div>
    <form id="formAbono" class="space-y-5 px-2">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto total del pago</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-blue-900 font-bold text-lg">$${montoTotal.toFixed(2)}</div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto pagado actualmente</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-green-700 font-bold text-lg">$${montoPagadoActual.toFixed(2)}</div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Monto pendiente</label>
                <div class="bg-gray-100 rounded-md px-3 py-2 text-red-700 font-bold text-lg">$${saldoPendiente.toFixed(2)}</div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="montoAbono" class="block text-sm font-semibold text-gray-700 mb-1">Cantidad a Abonar</label>
                <input type="number" id="montoAbono" name="montoAbono" step="0.01" min="0.01" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
            </div>
            <div>
                <label for="fechaAbono" class="block text-sm font-semibold text-gray-700 mb-1">Fecha del Abono</label>
                <input type="date" id="fechaAbono" name="fechaAbono" value="${new Date().toISOString().split('T')[0]}" required
                    class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
            </div>
        </div>
        <div class="flex justify-end space-x-3 mt-8">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                Registrar Abono
            </button>
        </div>
    </form>
`;

    mostrarModal(formAbonoHtml);

    document.getElementById('formAbono').addEventListener('submit', async (e) => {
        e.preventDefault();
        const montoAbono = parseFloat(document.getElementById('montoAbono').value);
        const fechaAbono = document.getElementById('fechaAbono').value;

        if (montoAbono <= 0) {
            mostrarNotificacion('El monto a abonar debe ser mayor a 0.', 'error');
            return;
        }

        try {
            const abonosActuales = pago.abonos || [];
            abonosActuales.push({
                montoAbonado: montoAbono,
                fechaAbono: fechaAbono
            });

            // Recalcular montoPagado sumando todos los abonos
            let nuevoMontoPagado = abonosActuales.reduce((sum, abono) => sum + abono.montoAbonado, 0);
            let nuevoSaldoPendiente = pago.montoTotal - nuevoMontoPagado;
            let nuevoEstado = 'pendiente';

            // Si el abono es mayor al saldo pendiente, calcula el excedente
            let excedente = 0;
            if (nuevoMontoPagado > pago.montoTotal) {
                excedente = nuevoMontoPagado - pago.montoTotal;
                nuevoMontoPagado = pago.montoTotal;
                nuevoSaldoPendiente = 0;
                nuevoEstado = 'pagado';
            } else if (nuevoMontoPagado === pago.montoTotal) {
                nuevoEstado = 'pagado';
                nuevoSaldoPendiente = 0;
            } else if (nuevoMontoPagado > 0) {
                nuevoEstado = 'parcial';
            }
            if (pago.estado === 'vencido' && nuevoMontoPagado < pago.montoTotal) {
                if (nuevoMontoPagado > 0) {
                    nuevoEstado = 'parcial';
                } else {
                    nuevoEstado = 'vencido';
                }
            }

            // Actualiza el pago
            await updateDoc(doc(db, "pagos", pagoId), {
                montoPagado: nuevoMontoPagado,
                saldoPendiente: nuevoSaldoPendiente,
                estado: nuevoEstado,
                abonos: abonosActuales
            });

            // Si hay excedente, mándalo a saldo a favor
            if (excedente > 0) {
                // Busca si ya hay un saldo a favor activo
                const abonosSnap = await getDocs(query(
                    collection(db, "abonosSaldoFavor"),
                    where("inquilinoId", "==", pago.inquilinoId),
                    where("saldoRestante", ">", 0)
                ));
                if (!abonosSnap.empty) {
                    const abonoDoc = abonosSnap.docs[0];
                    const abonoData = abonoDoc.data();
                    await updateDoc(doc(db, "abonosSaldoFavor", abonoDoc.id), {
                        saldoRestante: abonoData.saldoRestante + excedente,
                        montoOriginal: abonoData.montoOriginal + excedente
                    });
                } else {
                    await addDoc(collection(db, "abonosSaldoFavor"), {
                        inquilinoId: pago.inquilinoId,
                        montoOriginal: excedente,
                        saldoRestante: excedente,
                        descripcion: "Saldo a favor generado por abono excedente",
                        fechaAbono: fechaAbono,
                        fechaRegistro: fechaAbono
                    });
                }
                mostrarNotificacion(`El excedente de $${excedente.toFixed(2)} se ha agregado al saldo a favor del inquilino.`, 'info');
            }

            mostrarNotificacion('Abono registrado con éxito.', 'success');
            ocultarModal();
            mostrarPagos();

        } catch (error) {
            console.error('Error al registrar el abono:', error);
            mostrarNotificacion('Error al registrar el abono.', 'error');
        }
    });
}


/**
 * Muestra los detalles de un pago en un modal, incluyendo el historial de abonos.
 * @param {string} pagoId - El ID del pago a mostrar.
 */
export async function mostrarDetallePago(pagoId) {
    try {
        const docSnap = await getDoc(doc(db, "pagos", pagoId));
        if (!docSnap.exists()) {
            mostrarNotificacion("Pago no encontrado.", 'error');
            return;
        }

        const pago = docSnap.data();

        // Obtener nombres de inmueble e inquilino
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Desconocido';

        const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Desconocido';

        // Obtener nombre del propietario
        let nombrePropietario = 'Desconocido';
        if (pago.propietarioId) {
            try {
                const propietarioDoc = await getDoc(doc(db, "propietarios", pago.propietarioId));
                if (propietarioDoc.exists()) {
                    nombrePropietario = propietarioDoc.data().nombre;
                }
            } catch (e) {}
        }

        let abonosHtml = '';
        if (pago.abonos && pago.abonos.length > 0) {
            abonosHtml = `
                <h4 class="text-lg font-semibold mt-6 mb-2 text-gray-800">Historial de Abonos:</h4>
                <div class="overflow-x-auto rounded-lg border border-gray-200 shadow">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Abonado</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Abono</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;
            pago.abonos
                .sort((a, b) => new Date(a.fechaAbono) - new Date(b.fechaAbono))
                .forEach((abono, idx) => {
                    abonosHtml += `
                        <tr>
                            <td class="px-4 py-2 text-sm text-gray-500">${idx + 1}</td>
                            <td class="px-4 py-2 text-sm text-green-700 font-bold">$${(abono.montoAbonado || 0).toFixed(2)}</td>
                            <td class="px-4 py-2 text-sm text-gray-700">${abono.fechaAbono}</td>
                        </tr>
                    `;
                });
            abonosHtml += `
                </tbody>
            </table>
        </div>
    `;
        } else {
            abonosHtml = `<p class="text-gray-600 mt-4">No hay abonos registrados para este pago.</p>`;
        }


        const detalleHtml = `
            <div class="px-4 py-3 bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Detalles del Pago</h3>
            </div>
            <div class="space-y-3 text-gray-700 px-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Inmueble:</strong> <span class="text-blue-900">${nombreInmueble}</span></div>
                    <div><strong>Inquilino:</strong> <span class="text-blue-900">${nombreInquilino}</span></div>
                    <div><strong>Mes Correspondiente:</strong> <span>${pago.mesCorrespondiente}</span></div>
                    <div><strong>Año Correspondiente:</strong> <span>${pago.anioCorrespondiente}</span></div>
                    <div><strong>Monto Total:</strong> <span class="text-green-700 font-bold">$${(pago.montoTotal || 0).toFixed(2)}</span></div>
                    <div><strong>Monto Pagado:</strong> <span class="text-green-700 font-bold">$${(pago.montoPagado || 0).toFixed(2)}</span></div>
                    <div><strong>Saldo Pendiente:</strong> <span class="text-red-700 font-bold">$${(pago.saldoPendiente || 0).toFixed(2)}</span></div>
                    <div><strong>Estado:</strong> <span class="inline-block px-3 py-1 rounded-full font-semibold ${pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : pago.estado === 'pendiente' ? 'bg-orange-100 text-orange-800' : pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${pago.estado}</span></div>
                    <div><strong>Fecha de Registro:</strong> <span>${pago.fechaRegistro}</span></div>
                    <div><strong>Forma de Pago:</strong> <span>${pago.formaPago || 'N/A'}</span></div>
                    <div><strong>Propietario:</strong> <span>${nombrePropietario}</span></div>
                </div>
                ${abonosHtml}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(detalleHtml);

    } catch (error) {
        console.error("Error al mostrar detalles del pago:", error);
        mostrarNotificacion("Error al cargar los detalles del pago.", 'error');
    }
}


/**
 * Muestra el historial de pagos para un inquilino específico.
 * Incluye los detalles de los abonos.
 * @param {string} inquilinoId - El ID del inquilino.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId) {
    try {
        const pagosQuery = query(collection(db, "pagos"), where("inquilinoId", "==", inquilinoId));
        const pagosSnap = await getDocs(pagosQuery);

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Inquilino Desconocido';

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInquilino}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Inmueble
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Mes / Año
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Total
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Pagado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Saldo Pendiente
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Abonos
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (pagosSnap.empty) {
            historialPagosHtml += `
                        <tr>
                            <td colspan="7" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inquilino.
                            </td>
                        </tr>
            `;
        } else {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    // Ordenar abonos por fecha para mostrarlos cronológicamente
                    pago.abonos.sort((a, b) => new Date(a.fechaAbono) - new Date(b.fechaAbono));
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>$${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
                    });
                    abonosDetalleHtml += `</ul>`;
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-500">Sin abonos</span>`;
                }

                historialPagosHtml += `
                            <tr class="hover:bg-gray-50">
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${pago.mesCorrespondiente} / ${pago.anioCorrespondiente}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${abonosDetalleHtml}
                                </td>
                            </tr>
                `;
            });
        }
        historialPagosHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(historialPagosHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inquilino:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inquilino.", 'error');
    }
}


/**
 * Muestra el historial de pagos para un inmueble específico.
 * @param {string} inmuebleId - El ID del inmueble.
 */
export async function mostrarHistorialPagosInmueble(inmuebleId) {
    try {
        const pagosQuery = query(collection(db, "pagos"), where("inmuebleId", "==", inmuebleId));
        const pagosSnap = await getDocs(pagosQuery);

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInmueble}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Inquilino
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Mes / Año
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Total
                            </th>
                             <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Monto Pagado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Saldo Pendiente
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Estado
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Abonos
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (pagosSnap.empty) {
            historialPagosHtml += `
                        <tr>
                            <td colspan="7" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inmueble.
                            </td>
                        </tr>
            `;
        } else {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>$${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
                    });
                    abonosDetalleHtml += `</ul>`;
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-500">Sin abonos</span>`;
                }

                historialPagosHtml += `
                            <tr class="hover:bg-gray-50">
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${inquilinosMap.get(pago.inquilinoId) || 'Desconocido'}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${pago.mesCorrespondiente} / ${pago.anioCorrespondiente}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">$${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${abonosDetalleHtml}
                                </td>
                            </tr>
                `;
            });
        }
        historialPagosHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;
        mostrarModal(historialPagosHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inmueble:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inmueble.", 'error');
    }
}


/**
 * Revisa y actualiza el estado de los pagos vencidos.
 * Esta función se debe llamar periódicamente, por ejemplo, al cargar el dashboard.
 */
export async function revisarPagosVencidos() {
    try {
        const today = new Date();
        // Establecer la hora a 00:00:00 para comparar solo fechas
        today.setHours(0, 0, 0, 0);

        // Obtener pagos que no estén 'pagado'
        const pagosPendientesParcialesQuery = query(
            collection(db, "pagos"),
            where("estado", "!=", "pagado")
        );
        const pagosSnap = await getDocs(pagosPendientesParcialesQuery);

        const actualizaciones = [];

        pagosSnap.forEach(documento => {
            const pago = documento.data();
            const pagoId = documento.id;

            const anioPago = pago.anioCorrespondiente;
            const meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];
            const mesPagoNumero = meses.indexOf(pago.mesCorrespondiente); // 0-indexed month

            // Creamos una fecha de vencimiento que es el último día del mes del pago
            // Si el pago es de Enero, vence el 31 de Enero.
            const fechaVencimiento = new Date(anioPago, mesPagoNumero + 1, 0); // Día 0 del mes siguiente es el último día del mes actual
            fechaVencimiento.setHours(23, 59, 59, 999); // Establecer la hora al final del día para una comparación precisa

            // Un pago se considera vencido si la fecha actual es posterior a la fecha de vencimiento
            // Y si el estado actual no es ya 'vencido' y no está 'pagado'
            if (today > fechaVencimiento && pago.estado !== 'vencido' && pago.montoPagado < pago.montoTotal) {
                actualizaciones.push(updateDoc(doc(db, "pagos", pagoId), {
                    estado: 'vencido'
                }));
                // Opcional: Mostrar una notificación si el pago pasa a estar vencido
                mostrarNotificacion(`¡Alerta! El pago del inmueble para el mes ${pago.mesCorrespondiente} del ${pago.anioCorrespondiente} está vencido.`, 'warning', 10000);
            }
        });

        await Promise.all(actualizaciones);

    } catch (error) {
        console.error("Error al revisar pagos vencidos:", error);
        mostrarNotificacion("Error al revisar pagos vencidos.", 'error');
    }
}

// Función auxiliar para eliminar documentos (probablemente ya la tienes en ui.js o utilities.js)
// Si no la tienes, aquí una versión simple para pagos:
export async function eliminarDocumento(coleccion, id, callbackRefresh) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');
            if (callbackRefresh) callbackRefresh();
            
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

// Esta función ya está definida anteriormente en el archivo

/**
 * Devuelve los meses (mes/año) que un inquilino debe desde su ocupación hasta el mes actual.
 * @param {string} inquilinoId
 * @param {string} inmuebleId
 * @param {Date} fechaOcupacion
 * @returns {Promise<Array<{mes: string, anio: number}>>}
 */
export async function obtenerMesesAdeudadosHistorico(inquilinoId, inmuebleId, fechaOcupacion) {
    const mesesNombres = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let fechaIter = new Date(fechaOcupacion.getFullYear(), fechaOcupacion.getMonth(), 1);
    if (fechaOcupacion.getDate() > 1) {
        fechaIter.setMonth(fechaIter.getMonth() + 1);
    }

    let fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    let mesesPendientes = [];

    // Trae todos los pagos del inquilino/inmueble una sola vez
    const pagosQuery = query(
        collection(db, "pagos"),
        where("inquilinoId", "==", inquilinoId),
        where("inmuebleId", "==", inmuebleId)
    );
    const pagosSnap = await getDocs(pagosQuery);
    const pagosList = [];
    pagosSnap.forEach(doc => pagosList.push(doc.data()));

    while (fechaIter <= fin) {
        let mes = mesesNombres[fechaIter.getMonth()];
        let anio = fechaIter.getFullYear();

        // Busca pagos de ese mes/año (ignorando mayúsculas y espacios)
       const pagosMes = pagosList.filter(p =>
    p.mesCorrespondiente &&
    p.anioCorrespondiente &&
    p.mesCorrespondiente.toString().trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') === mes.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') &&
    Number(p.anioCorrespondiente) === anio
);

        // Si NO hay ningún pago con estado "pagado", se considera pendiente
        let pagado = false;
        pagosMes.forEach(pago => {
            if (
                typeof pago.estado === "string" &&
                pago.estado.trim().toLowerCase() === "pagado"
            ) {
                pagado = true;
            }
        });

        if (!pagado) {
            mesesPendientes.push({ mes, anio });
        }

        fechaIter.setMonth(fechaIter.getMonth() + 1);
    }
    return mesesPendientes;
}

/**
 * Calcula el monto total de servicios en un objeto serviciosPagados
 * @param {Object} serviciosPagados - Objeto con los servicios pagados
 * @returns {number} - Monto total de servicios
 */
function calcularTotalServicios(serviciosPagados) {
    if (!serviciosPagados) return 0;
    
    let total = 0;
    if (serviciosPagados.internet && serviciosPagados.internetMonto) {
        total += parseFloat(serviciosPagados.internetMonto) || 0;
    }
    if (serviciosPagados.agua && serviciosPagados.aguaMonto) {
        total += parseFloat(serviciosPagados.aguaMonto) || 0;
    }
    if (serviciosPagados.luz && serviciosPagados.luzMonto) {
        total += parseFloat(serviciosPagados.luzMonto) || 0;
    }
    return total;
}

/**
 * Muestra un formulario para gestionar los servicios pagados de un pago.
 * @param {string} pagoId - El ID del pago.
 */
export async function gestionarServiciosPago(pagoId) {
    try {
        const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
        if (!pagoDoc.exists()) {
            mostrarNotificacion("Pago no encontrado", "error");
            return;
        }
        
        const pago = pagoDoc.data();
        const serviciosPagados = pago.serviciosPagados || {};
        
        // Obtener información del inmueble y del inquilino
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';
        
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Inquilino Desconocido';
        
        // Preparar datos de servicios existentes
        const servicios = [
            { id: "internet", nombre: "Internet", monto: serviciosPagados.internetMonto || 0, activo: serviciosPagados.internet || false },
            { id: "agua", nombre: "Agua", monto: serviciosPagados.aguaMonto || 0, activo: serviciosPagados.agua || false },
            { id: "luz", nombre: "Luz", monto: serviciosPagados.luzMonto || 0, activo: serviciosPagados.luz || false }
        ];
        
        // Generar HTML para el formulario
        let serviciosHtml = '';
        servicios.forEach(servicio => {
            serviciosHtml += `
                <div class="border-b border-gray-200 py-3 ${servicio.activo ? '' : 'opacity-60'}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input type="checkbox" id="servicio${servicio.id}" name="servicio${servicio.id}" 
                                ${servicio.activo ? 'checked' : ''} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            <label for="servicio${servicio.id}" class="ml-2 text-sm font-medium text-gray-700">${servicio.nombre}</label>
                        </div>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="monto${servicio.id}" name="monto${servicio.id}" 
                                value="${servicio.monto}" min="0" step="0.01" 
                                class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                ${servicio.activo ? '' : 'disabled'}>
                            <button type="button" data-servicio="${servicio.id}" class="btn-eliminar-servicio text-red-500 hover:text-red-700">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        const formHtml = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Gestionar Servicios</h3>
            </div>
            <form id="formGestionServicios" class="space-y-4">
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                    <div class="flex flex-col gap-1">
                        <p class="text-sm font-medium text-blue-800">Inmueble: <span class="font-bold">${nombreInmueble}</span></p>
                        <p class="text-sm font-medium text-blue-800">Inquilino: <span class="font-bold">${nombreInquilino}</span></p>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="font-medium text-gray-700 mb-3">Servicios del pago</h4>
                    <div class="space-y-2">
                        ${serviciosHtml}
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        `;
        
        mostrarModal(formHtml);
        
        // Manejar cambios en checkboxes
        document.getElementById('serviciointernet').addEventListener('change', function() {
            document.getElementById('montointernet').disabled = !this.checked;
        });
        
        document.getElementById('servicioagua').addEventListener('change', function() {
            document.getElementById('montoagua').disabled = !this.checked;
        });
        
        document.getElementById('servicioluz').addEventListener('change', function() {
            document.getElementById('montoluz').disabled = !this.checked;
        });
        
        // Manejar eliminación de servicios
        document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', async function() {
                const servicioId = this.dataset.servicio;
                
                if (confirm(`¿Estás seguro de eliminar el servicio de ${servicioId}?`)) {
                    try {
                        // Eliminar el servicio
                        delete serviciosPagados[servicioId];
                        delete serviciosPagados[`${servicioId}Monto`];
                        
                        // Actualizar en Firestore solo los servicios
                        await updateDoc(doc(db, "pagos", pagoId), { 
                            serviciosPagados: serviciosPagados
                        });
                        
                        // Disparar un evento personalizado para notificar que se eliminó un servicio
                        const event = new CustomEvent('servicioEliminado', { detail: { pagoId, servicio: servicioId } });
                        document.dispatchEvent(event);
                        
                        mostrarNotificacion(`Servicio ${servicioId} eliminado correctamente`, "success");
                        ocultarModal();
                        mostrarPagos();
                    } catch (error) {
                        console.error("Error al eliminar servicio:", error);
                        mostrarNotificacion("Error al eliminar el servicio", "error");
                    }
                }
            });
        });
        
        // Manejar envío del formulario
        document.getElementById('formGestionServicios').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Recopilar datos del formulario
            const nuevoServicios = {};
            
            // Internet
            if (document.getElementById('serviciointernet').checked) {
                nuevoServicios.internet = true;
                nuevoServicios.internetMonto = parseFloat(document.getElementById('montointernet').value) || 0;
            }
            
            // Agua
            if (document.getElementById('servicioagua').checked) {
                nuevoServicios.agua = true;
                nuevoServicios.aguaMonto = parseFloat(document.getElementById('montoagua').value) || 0;
            }
            
            // Luz
            if (document.getElementById('servicioluz').checked) {
                nuevoServicios.luz = true;
                nuevoServicios.luzMonto = parseFloat(document.getElementById('montoluz').value) || 0;
            }
            
            try {
                // Actualizar en Firestore solo los servicios
                await updateDoc(doc(db, "pagos", pagoId), { 
                    serviciosPagados: nuevoServicios
                });
                
                mostrarNotificacion("Servicios actualizados correctamente", "success");
                ocultarModal();
                mostrarPagos(); // Recargar la lista de pagos
            } catch (error) {
                console.error("Error al actualizar servicios:", error);
                mostrarNotificacion("Error al actualizar los servicios", "error");
            }
        });
        
    } catch (error) {
        console.error("Error al gestionar servicios:", error);
        mostrarNotificacion("Error al cargar el formulario de servicios", "error");
    }
}

/**
 * Elimina un servicio específico de un pago.
 * @param {string} pagoId - El ID del pago.
 * @param {string} nombreServicio - El nombre del servicio a eliminar.
 */
export async function eliminarServicioDePago(pagoId, nombreServicio) {
    try {
        const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
        if (!pagoDoc.exists()) {
            mostrarNotificacion("Pago no encontrado", "error");
            return;
        }
        
        const pago = pagoDoc.data();
        if (!pago.serviciosPagados) return;

        // Guardar el monto del servicio antes de eliminarlo
        const montoServicio = pago.serviciosPagados[`${nombreServicio}Monto`] || 0;
        
        // Elimina el servicio y su monto
        delete pago.serviciosPagados[nombreServicio];
        delete pago.serviciosPagados[`${nombreServicio}Monto`];

        // Actualizar en Firestore solo los servicios, sin modificar montoTotal
        // El montoTotal en la base de datos solo incluye la renta base
        await updateDoc(doc(db, "pagos", pagoId), { 
            serviciosPagados: pago.serviciosPagados
        });
        
        // Disparar un evento personalizado para notificar que se eliminó un servicio
        const event = new CustomEvent('servicioEliminado', { detail: { pagoId, servicio: nombreServicio } });
        document.dispatchEvent(event);
        
        mostrarNotificacion("Servicio eliminado correctamente", "success");
        mostrarPagos(); // Recargar la lista de pagos
    } catch (error) {
        console.error("Error al eliminar servicio:", error);
        mostrarNotificacion("Error al eliminar el servicio", "error");
    }
}

/**
 * Muestra un formulario para gestionar el mobiliario pagado de un pago.
 * @param {string} pagoId - El ID del pago.
 */
export async function gestionarMobiliarioPago(pagoId) {
    try {
        const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
        if (!pagoDoc.exists()) {
            mostrarNotificacion("Pago no encontrado", "error");
            return;
        }
        
        const pago = pagoDoc.data();
        const mobiliarioPagado = pago.mobiliarioPagado || [];
        
        // Obtener información del inmueble y del inquilino
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';
        
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Inquilino Desconocido';
        
        // Obtener detalles del mobiliario
        const mobiliarioDetalles = [];
        for (const item of mobiliarioPagado) {
            try {
                const mobDoc = await getDoc(doc(db, "mobiliario", item.mobiliarioId));
                if (mobDoc.exists()) {
                    const mobData = mobDoc.data();
                    mobiliarioDetalles.push({
                        id: item.mobiliarioId,
                        nombre: mobData.nombre || 'Mobiliario sin nombre',
                        descripcion: mobData.descripcion || '',
                        costo: item.costo || 0,
                        asignacionId: item.asignacionId || null
                    });
                } else {
                    mobiliarioDetalles.push({
                        id: item.mobiliarioId,
                        nombre: 'Mobiliario no encontrado',
                        descripcion: '',
                        costo: item.costo || 0,
                        asignacionId: item.asignacionId || null
                    });
                }
            } catch (error) {
                console.error("Error al obtener detalles del mobiliario:", error);
            }
        }
        
        // Generar HTML para el formulario
        let mobiliarioHtml = '';
        if (mobiliarioDetalles.length === 0) {
            mobiliarioHtml = '<p class="text-gray-500 text-center py-4">No hay mobiliario registrado en este pago.</p>';
        } else {
            mobiliarioDetalles.forEach((mob, index) => {
                mobiliarioHtml += `
                    <div class="border-b border-gray-200 py-3 last:border-b-0">
                        <div class="flex items-start justify-between">
                            <div>
                                <h4 class="font-medium text-gray-800">${mob.nombre}</h4>
                                <p class="text-sm text-gray-600">${mob.descripcion || 'Sin descripción'}</p>
                                <p class="text-sm font-semibold text-green-600">Costo: ${mob.costo.toFixed(2)}</p>
                            </div>
                            <button type="button" data-index="${index}" class="btn-eliminar-mobiliario text-red-500 hover:text-red-700">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        const formHtml = `
            <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Gestionar Mobiliario</h3>
            </div>
            <div class="space-y-4">
                <div class="bg-green-50 p-3 rounded-lg border border-green-200 mb-3">
                    <div class="flex flex-col gap-1">
                        <p class="text-sm font-medium text-green-800">Inmueble: <span class="font-bold">${nombreInmueble}</span></p>
                        <p class="text-sm font-medium text-green-800">Inquilino: <span class="font-bold">${nombreInquilino}</span></p>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 class="font-medium text-gray-700 mb-3">Mobiliario incluido en este pago</h4>
                    <div class="space-y-2">
                        ${mobiliarioHtml}
                    </div>
                </div>
                
                <div class="flex justify-between items-center">
                    <p class="text-sm text-gray-600">Total: <span class="font-bold text-green-600">${mobiliarioPagado.reduce((sum, item) => sum + (item.costo || 0), 0).toFixed(2)}</span></p>
                    <p class="text-sm text-gray-600">Mes: <span class="font-semibold">${pago.mesCorrespondiente} ${pago.anioCorrespondiente}</span></p>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
                </div>
            </div>
        `;
        
        mostrarModal(formHtml);
        
        // Manejar eliminación de mobiliario
        document.querySelectorAll('.btn-eliminar-mobiliario').forEach(btn => {
            btn.addEventListener('click', async function() {
                const index = parseInt(this.dataset.index);
                const mobiliario = mobiliarioDetalles[index];
                
                if (confirm(`¿Estás seguro de eliminar "${mobiliario.nombre}" de este pago?`)) {
                    try {
                        // Eliminar el mobiliario del array
                        const nuevoMobiliario = [...mobiliarioPagado];
                        nuevoMobiliario.splice(index, 1);
                        
                        // Recalcular el monto total
                        const nuevoMontoTotal = pago.montoTotal - mobiliario.costo;
                        
                        // Actualizar en Firestore
                        await updateDoc(doc(db, "pagos", pagoId), { 
                            mobiliarioPagado: nuevoMobiliario,
                            montoTotal: nuevoMontoTotal,
                            montoPagado: Math.min(pago.montoPagado, nuevoMontoTotal),
                            saldoPendiente: Math.max(0, nuevoMontoTotal - pago.montoPagado)
                        });
                        
                        mostrarNotificacion(`Mobiliario eliminado correctamente`, "success");
                        ocultarModal();
                        mostrarPagos();
                    } catch (error) {
                        console.error("Error al eliminar mobiliario:", error);
                        mostrarNotificacion("Error al eliminar el mobiliario", "error");
                    }
                }
            });
        });
        
    } catch (error) {
        console.error("Error al gestionar mobiliario:", error);
        mostrarNotificacion("Error al cargar el formulario de mobiliario", "error");
    }
}