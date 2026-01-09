// js/pagos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarLoader, ocultarLoader, mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { generarReciboPDF } from './recibos.js';
/**
 * Muestra la lista de pagos.
 */
export async function mostrarPagos(mostrarTabla = false) {
    mostrarLoader();
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de pagos.", 'error');
        ocultarLoader();
        return;
    }

    // Si no se solicita mostrar la tabla directamente, mostrar los botones grandes
    if (!mostrarTabla) {
        contenedor.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10">
                <h2 class="text-3xl font-bold text-gray-800 mb-10">Gestión de Pagos</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                    <button id="btnNuevoPago" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                        text-white p-8 rounded-xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span class="text-xl font-bold">Registrar Nuevo Pago</span>
                        <span class="text-sm text-green-100 mt-2">Registrar pago de renta</span>
                    </button>
                    
                    <button id="btnPagoServicio" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                        text-white p-8 rounded-xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span class="text-xl font-bold">Registrar Pago de Servicio</span>
                        <span class="text-sm text-blue-100 mt-2">Internet, agua, luz, mobiliario</span>
                    </button>
                    
                    <button id="btnHistorialPagos" class="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                        text-white p-8 rounded-xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span class="text-xl font-bold">Historial de Pagos</span>
                        <span class="text-sm text-purple-100 mt-2">Ver todos los pagos registrados</span>
                    </button>
                </div>
            </div>
        `;

        // Agregar event listeners a los botones
        document.getElementById('btnNuevoPago').addEventListener('click', () => mostrarFormularioNuevoPago());
        document.getElementById('btnPagoServicio').addEventListener('click', () => {
            // Mostrar opciones para elegir entre pago de servicios o mobiliario
            const opcionesHtml = `
                <div class="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative">
                    <button id="btnCerrarModal" class="absolute top-3 right-3 text-white hover:text-indigo-200 transition-colors duration-200 focus:outline-none">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h3 class="text-2xl font-bold text-center">Seleccionar Tipo de Pago</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                    <button id="btnPagarServicios" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                        text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center transform hover:-translate-y-1">
                        <div class="bg-blue-400 bg-opacity-30 p-3 rounded-full mb-3">
                            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Pago de Servicios</span>
                        <span class="text-sm text-blue-100 mt-1">Internet, Agua, Luz</span>
                    </button>
                    <button id="btnPagarMobiliario" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                        text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center transform hover:-translate-y-1">
                        <div class="bg-green-400 bg-opacity-30 p-3 rounded-full mb-3">
                            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Pago de Mobiliario</span>
                        <span class="text-sm text-green-100 mt-1">Muebles y Equipamiento</span>
                    </button>
                </div>
            `;

            mostrarModal(opcionesHtml);

            // Agregar event listeners a los botones
            document.getElementById('btnCerrarModal').addEventListener('click', () => {
                ocultarModal();
            });

            document.getElementById('btnPagarServicios').addEventListener('click', () => {
                ocultarModal();
                mostrarFormularioPagoServicio();
            });

            document.getElementById('btnPagarMobiliario').addEventListener('click', () => {
                ocultarModal();
                mostrarFormularioPagoMobiliario();
            });
        });
        document.getElementById('btnHistorialPagos').addEventListener('click', () => mostrarPagos(true));

        ocultarLoader();
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

                // Obtener el costo real del inmueble desde la colección de inmuebles
                let montoBase = 0;
                const inmuebleData = inmueblesSnap.docs.find(doc => doc.id === pago.inmuebleId)?.data();
                if (inmuebleData && inmuebleData.rentaMensual) {
                    montoBase = inmuebleData.rentaMensual;
                } else {
                    montoBase = pago.montoBase || pago.montoTotal || 0;
                }

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

                // Sumar el mobiliario pagado al monto total
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                    pago.mobiliarioPagado.forEach(item => {
                        montoTotal += item.costo || 0;
                    });
                }

                // Asegurar que los montos se muestren con 2 decimales, incluso si son null o undefined
                const montoTotalFormatted = montoTotal.toFixed(2);
                const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                // Verificar si el inquilino tiene servicios asignados
                const inquilinoData = inquilinosSnap.docs.find(doc => doc.id === pago.inquilinoId)?.data();
                const tieneServicios = inquilinoData && inquilinoData.pagaServicios &&
                    ((inquilinoData.servicios && Array.isArray(inquilinoData.servicios) && inquilinoData.servicios.length > 0) ||
                        (inquilinoData.tipoServicio && inquilinoData.montoServicio));

                // Verificar si el inquilino tiene mobiliario asignado
                const tieneMobiliario = inquilinoData && inquilinoData.mobiliarioAsignado &&
                    Array.isArray(inquilinoData.mobiliarioAsignado) && inquilinoData.mobiliarioAsignado.length > 0;

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

                // Determinar si hay servicios pendientes
                let serviciosHtml = '';
                if (servicios.length > 0) {
                    serviciosHtml = servicios.join('<br>');
                } else if (tieneServicios) {
                    serviciosHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pendiente</span>`;
                } else {
                    serviciosHtml = '-';
                }

                // Calcular total de mobiliario
                let mobiliarioTotal = 0;
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                    pago.mobiliarioPagado.forEach(item => {
                        mobiliarioTotal += item.costo || 0;
                    });
                }

                // BLOQUE PRINCIPAL
                // Determinar si hay mobiliario pendiente
                let mobiliarioHtml = '';
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
                    let mobiliarioTotal = 0;
                    pago.mobiliarioPagado.forEach(item => {
                        mobiliarioTotal += item.costo || 0;
                    });
                    mobiliarioHtml = `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Pagado
        </span>
        <p class="text-xs text-gray-700 mt-1">Total: ${mobiliarioTotal.toFixed(2)}</p>
    `;
                } else if (tieneMobiliario) {
                    mobiliarioHtml = `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Pendiente
        </span>
    `;
                } else {
                    mobiliarioHtml = '-';
                }


                tablaFilas += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-2 py-2 text-xs text-gray-800">${pago.nombreInmueble}</td>
                        <td class="px-2 py-2 text-xs text-gray-700">${pago.nombreInquilino}</td>
                        <td class="px-2 py-2 text-xs text-gray-800">${montoTotalFormatted}</td>
                        <td class="px-2 py-2 text-xs text-gray-800">${montoBase.toFixed(2)}</td>
                        <td class="px-2 py-2 text-xs text-gray-800">${saldoPendienteFormatted}</td>
                        <td class="px-2 py-2 text-xs"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-2 py-2 text-xs text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                        <td class="px-2 py-2 text-xs text-gray-800">${serviciosHtml}</td>
                        <td class="px-2 py-2 text-xs text-gray-800">${mobiliarioHtml}</td>
                        <td class="px-2 py-2 text-xs text-right">
                            <div class="pill-menu-container">
                                <div class="pill-menu-actions">
                                    <a href="#" title="Detalles" class="btn-detalle-pago text-gray-600 p-2" style="--icon-color: #4B5563;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                        <span class="pill-menu-text">Detalles</span>
                                    </a>
                                    <a href="#" title="Abonar" class="btn-abonar-pago text-green-600 p-2" style="--icon-color: #16A34A;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span class="pill-menu-text">Abonar</span>
                                    </a>
                                    <a href="#" title="Editar" class="btn-editar-pago text-orange-600 p-2" style="--icon-color: #EA580C;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                        <span class="pill-menu-text">Editar</span>
                                    </a>
                                    <a href="#" title="Servicios" class="btn-gestionar-servicios text-purple-600 p-2" style="--icon-color: #9333EA;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        <span class="pill-menu-text">Servicios</span>
                                    </a>
                                    ${mobiliarioTotal > 0 ? `<a href="#" title="Mobiliario" class="btn-gestionar-mobiliario text-teal-600 p-2" style="--icon-color: #0D9488;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                        <span class="pill-menu-text">Mobiliario</span>
                                    </a>` : ''}
                                    <a href="#" title="Recibo PDF" class="btn-recibo-pdf text-indigo-600 p-2" style="--icon-color: #4F46E5;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                        <span class="pill-menu-text">Recibo</span>
                                    </a>
                                    <a href="#" title="Eliminar" class="btn-eliminar-pago text-red-600 p-2" style="--icon-color: #DC2626;" role="menuitem" data-pago-id="${pago.id}">
                                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        <span class="pill-menu-text">Eliminar</span>
                                    </a>
                                </div>
                                <button type="button" class="pill-menu-button inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150">
                                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
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
        // NUEVO: Opciones de año para filtro
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 7 }, (_, i) => anioActual - 3 + i);
        const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

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
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Año</label>
                    <select id="filtroAnio" class="border border-gray-300 rounded-md px-2 py-1 bg-white">
                        <option value="">Todos</option>
                        ${aniosOptions}
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
                    <button id="btnGenerarReporte" class="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span>Generar Reporte PDF</span>
                    </button>
                </div>
            </div>
            ${filtrosHtml}
            <div class="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg no-hover-effect">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago de Renta</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Pendiente</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Corresp.</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios Pagados</th>
                            <th scope="col" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobiliario</th>
                            <th scope="col" class="relative px-2 py-3 text-right"><span class="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200 no-hover-effect">
                        ${tablaFilas}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('btnPagoServicio').addEventListener('click', () => {
            // Mostrar opciones para elegir entre pago de servicios o mobiliario
            const opcionesHtml = `
        <div class="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative">
            <button id="btnCerrarModal" class="absolute top-3 right-3 text-white hover:text-indigo-200 transition-colors duration-200 focus:outline-none">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 class="text-2xl font-bold text-center">Seleccionar Tipo de Pago</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <button id="btnPagarServicios" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center transform hover:-translate-y-1">
                <div class="bg-blue-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <span class="text-lg font-medium">Pago de Servicios</span>
                <span class="text-sm text-blue-100 mt-1">Internet, Agua, Luz</span>
            </button>
            <button id="btnPagarMobiliario" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center transform hover:-translate-y-1">
                <div class="bg-green-400 bg-opacity-30 p-3 rounded-full mb-3">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </div>
                <span class="text-lg font-medium">Pago de Mobiliario</span>
                <span class="text-sm text-green-100 mt-1">Muebles y Equipamiento</span>
            </button>
        </div>
    `;

            mostrarModal(opcionesHtml);

            // Agregar event listeners a los botones
            document.getElementById('btnCerrarModal').addEventListener('click', () => {
                ocultarModal();
            });

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

        function adjuntarListenersPillMenu() {
            document.querySelectorAll('.pill-menu-container').forEach(container => {
                const button = container.querySelector('.pill-menu-button');
                if (button) {
                    if (button.dataset.pillMenuAttached) return;
                    button.dataset.pillMenuAttached = 'true';

                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Close other active menus
                        document.querySelectorAll('.pill-menu-container.active').forEach(otherContainer => {
                            if (otherContainer !== container) {
                                otherContainer.classList.remove('active');
                            }
                        });
                        // Toggle current menu
                        container.classList.toggle('active');
                    });
                }
            });
        }

        // Listener global para cerrar los menús. Se añade una sola vez.
        if (!window.pillMenuClickListenerAdded) {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.pill-menu-container')) {
                    document.querySelectorAll('.pill-menu-container.active').forEach(container => {
                        container.classList.remove('active');
                    });
                }
            });
            window.pillMenuClickListenerAdded = true;
        }

        adjuntarListenersPillMenu();
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
                seleccionarFirmaYGenerarRecibo(pagoId);
            });
        });

        document.querySelectorAll('.btn-gestionar-mobiliario').forEach(button => {
            button.addEventListener('click', (e) => {
                const pagoId = e.currentTarget.dataset.pagoId;
                gestionarMobiliarioPago(pagoId);
            });
        });

        // --- Filtros interactivos ---
        document.getElementById('btnGenerarReporte').addEventListener('click', () => mostrarModalReportePagos(pagosList, inmueblesMap, inquilinosMap));

        function aplicarFiltros() {
            const filtroInmueble = document.getElementById('filtroInmueble').value;
            const filtroInquilino = document.getElementById('filtroInquilino').value;
            const filtroMes = document.getElementById('filtroMes').value;
            const filtroAnio = document.getElementById('filtroAnio').value;
            const filtroEstado = document.getElementById('filtroEstado').value;

            let pagosFiltrados = pagosList.filter(pago => {
                return (!filtroInmueble || pago.inmuebleId === filtroInmueble)
                    && (!filtroInquilino || pago.inquilinoId === filtroInquilino)
                    && (!filtroMes || pago.mesCorrespondiente === filtroMes)
                    && (!filtroAnio || pago.anioCorrespondiente == filtroAnio)
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

                    // Obtener el costo real del inmueble desde la colección de inmuebles
                    let montoBase = 0;
                    const inmuebleData = inmueblesSnap.docs.find(doc => doc.id === pago.inmuebleId)?.data();
                    if (inmuebleData && inmuebleData.rentaMensual) {
                        montoBase = inmuebleData.rentaMensual;
                    } else {
                        montoBase = pago.montoBase || pago.montoTotal || 0;
                    }

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

                    // Sumar el mobiliario pagado al monto total
                    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                        pago.mobiliarioPagado.forEach(item => {
                            montoTotal += item.costo || 0;
                        });
                    }

                    // Asegurar que los montos se muestren with 2 decimales, incluso si son null o undefined
                    const montoTotalFormatted = montoTotal.toFixed(2);
                    const montoPagadoFormatted = pago.montoPagado ? pago.montoPagado.toFixed(2) : '0.00';
                    const saldoPendienteFormatted = pago.saldoPendiente ? pago.saldoPendiente.toFixed(2) : '0.00';

                    // Verificar si el inquilino tiene servicios asignados
                    const inquilinoData = inquilinosSnap.docs.find(doc => doc.id === pago.inquilinoId)?.data();
                    const tieneServicios = inquilinoData && inquilinoData.pagaServicios &&
                        ((inquilinoData.servicios && Array.isArray(inquilinoData.servicios) && inquilinoData.servicios.length > 0) ||
                            (inquilinoData.tipoServicio && inquilinoData.montoServicio));

                    // Verificar si el inquilino tiene mobiliario asignado
                    const tieneMobiliario = inquilinoData && inquilinoData.mobiliarioAsignado &&
                        Array.isArray(inquilinoData.mobiliarioAsignado) && inquilinoData.mobiliarioAsignado.length > 0;

                    // En la generaciÃ³n de filas de la tabla:
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

                    // Determinar si hay servicios pendientes
                    let serviciosHtml = '';
                    if (servicios.length > 0) {
                        serviciosHtml = servicios.join('<br>');
                    } else if (tieneServicios) {
                        serviciosHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pendiente</span>`;
                    } else {
                        serviciosHtml = '-';
                    }

                    // Calcular total de mobiliario
                    let mobiliarioTotal = 0;
                    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
                        pago.mobiliarioPagado.forEach(item => {
                            mobiliarioTotal += item.costo || 0;
                        });
                    }

                    // Determinar si hay mobiliario pendiente
                    let mobiliarioHtml = '';
                    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
                        let mobiliarioTotal = 0;
                        pago.mobiliarioPagado.forEach(item => {
                            mobiliarioTotal += item.costo || 0;
                        });
                        mobiliarioHtml = `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Pagado
                            </span>
                            <p class="text-xs text-gray-700 mt-1">Total: ${mobiliarioTotal.toFixed(2)}</p>
                        `;
                    } else if (tieneMobiliario) {
                        mobiliarioHtml = `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Pendiente
                            </span>
                        `;
                    } else {
                        mobiliarioHtml = '-';
                    }


                    tablaFilas += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-2 py-2 text-xs text-gray-800">${pago.nombreInmueble}</td>
                            <td class="px-2 py-2 text-xs text-gray-700">${pago.nombreInquilino}</td>
                            <td class="px-2 py-2 text-xs text-gray-800">${montoTotalFormatted}</td>
                            <td class="px-2 py-2 text-xs text-gray-800">${montoBase.toFixed(2)}</td>
                            <td class="px-2 py-2 text-xs text-gray-800">${saldoPendienteFormatted}</td>
                            <td class="px-2 py-2 text-xs"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                            <td class="px-2 py-2 text-xs text-gray-700">${pago.mesCorrespondiente || 'N/A'}</td>
                            <td class="px-2 py-2 text-xs text-gray-800">${serviciosHtml}</td>
                            <td class="px-2 py-2 text-xs text-gray-800">${mobiliarioHtml}</td>
                                                    <td class="px-2 py-2 text-xs text-right">
                                                        <div class="pill-menu-container">
                                                            <div class="pill-menu-actions">
                                                                <a href="#" title="Detalles" class="btn-detalle-pago text-gray-300 p-2" style="--icon-color: #D1D5DB;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                                    <span class="pill-menu-text">Detalles</span>
                                                                </a>
                                                                <a href="#" title="Abonar" class="btn-abonar-pago text-green-400 p-2" style="--icon-color: #4ADE80;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                                    <span class="pill-menu-text">Abonar</span>
                                                                </a>
                                                                <a href="#" title="Editar" class="btn-editar-pago text-orange-400 p-2" style="--icon-color: #FB923C;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                                    <span class="pill-menu-text">Editar</span>
                                                                </a>
                                                                <a href="#" title="Servicios" class="btn-gestionar-servicios text-purple-400 p-2" style="--icon-color: #C084FC;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                                    <span class="pill-menu-text">Servicios</span>
                                                                </a>
                                                                ${mobiliarioTotal > 0 ? `<a href="#" title="Mobiliario" class="btn-gestionar-mobiliario text-teal-400 p-2" style="--icon-color: #2DD4BF;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                                                    <span class="pill-menu-text">Mobiliario</span>
                                                                </a>` : ''}
                                                                <a href="#" title="Recibo PDF" class="btn-recibo-pdf text-indigo-400 p-2" style="--icon-color: #818CF8;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                                                    <span class="pill-menu-text">Recibo</span>
                                                                </a>
                                                                <a href="#" title="Eliminar" class="btn-eliminar-pago text-red-400 p-2" style="--icon-color: #F87171;" role="menuitem" data-pago-id="${pago.id}">
                                                                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                    <span class="pill-menu-text">Eliminar</span>
                                                                </a>
                                                            </div>
                                                            <button type="button" class="pill-menu-button inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150">
                                                                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>                        </tr>
                    `;
                });
            }
            document.querySelector('.min-w-full tbody').innerHTML = tablaFilas;

            // Re-adjuntar listeners para los nuevos elementos
            adjuntarListenersPillMenu();

            document.querySelectorAll('.btn-detalle-pago').forEach(button => {
                button.addEventListener('click', (e) => {
                    const pagoId = e.currentTarget.dataset.pagoId;
                    mostrarDetallePago(pagoId);
                });
            });
            document.querySelectorAll('.btn-abonar-pago').forEach(button => {
                button.addEventListener('click', (e) => {
                    const pagoId = e.currentTarget.dataset.pagoId;
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
            document.querySelectorAll('.btn-recibo-pdf').forEach(button => {
                button.addEventListener('click', (e) => {
                    const pagoId = e.currentTarget.dataset.pagoId;
                    seleccionarFirmaYGenerarRecibo(pagoId);
                });
            });
            document.querySelectorAll('.btn-gestionar-mobiliario').forEach(button => {
                button.addEventListener('click', (e) => {
                    const pagoId = e.currentTarget.dataset.pagoId;
                    gestionarMobiliarioPago(pagoId);
                });
            });

        }

        // Listeners de filtros
        document.getElementById('filtroInmueble').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroInquilino').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroMes').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroAnio').addEventListener('change', aplicarFiltros);
        document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            document.getElementById('filtroInmueble').value = "";
            document.getElementById('filtroInquilino').value = "";
            document.getElementById('filtroMes').value = "";
            document.getElementById('filtroAnio').value = "";
            document.getElementById('filtroEstado').value = "";
            aplicarFiltros();
        });
        if (!document.getElementById('filtroMes').value && !document.getElementById('filtroAnio').value) {
            const fechaActual = new Date();
            document.getElementById('filtroMes').value = meses[fechaActual.getMonth()];
            document.getElementById('filtroAnio').value = fechaActual.getFullYear();
        }
        aplicarFiltros();

    } catch (error) {
        console.error("Error al mostrar pagos:", error);
        mostrarNotificacion("Error al cargar la lista de pagos.", 'error');
    } finally {
        ocultarLoader();
    }
}

/**
 * Determina el mes correspondiente a un pago según la fecha de registro.
 * Si el pago se realiza el día 1 o el día 15 o posterior, corresponde al mes actual.
 * @param {Date} fechaPago - La fecha en que se realiza el pago
 * @returns {Object} - Objeto con el mes y año correspondientes
 */
function determinarMesCorrespondiente(fechaPago) {
    const mesesNombres = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Siempre corresponde al mes actual, independientemente del día
    const mesActual = fechaPago.getMonth();
    const anioActual = fechaPago.getFullYear();

    // Siempre devolvemos el mes actual
    return {
        mes: mesesNombres[mesActual],
        anio: anioActual
    };
}

/**
 * Actualiza el mes correspondiente en el formulario según la fecha de registro.
 * Si la fecha es el día 15 o posterior, corresponde al mes actual.
 * @param {HTMLElement} fechaRegistroInput - El input de fecha de registro
 */
function actualizarMesCorrespondiente(fechaRegistroInput) {
    const mesesNombres = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const fechaValue = fechaRegistroInput.value;
    if (!fechaValue) return;

    const fecha = new Date(fechaValue);
    const mesCorrespondienteObj = determinarMesCorrespondiente(fecha);

    // Actualizar los campos del formulario
    const mesSelect = document.getElementById('mesCorrespondiente');
    const anioSelect = document.getElementById('anioCorrespondiente');

    if (mesSelect && anioSelect) {
        mesSelect.value = mesCorrespondienteObj.mes;
        anioSelect.value = mesCorrespondienteObj.anio;
    }
}


// Nueva función para mostrar el modal de reporte de pagos con UI mejorada y selección múltiple
function mostrarModalReportePagos(pagosList, inmueblesMap, inquilinosMap) {
    const createCheckboxList = (id, items) => {
        const itemsHtml = [...items.entries()].map(([itemId, name]) => `
            <label class="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors duration-200">
                <input type="checkbox" value="${itemId}" name="${id}" class="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500">
                <span class="ml-3 text-base text-gray-800">${name}</span>
            </label>
        `).join('');
        return `<div id="${id}" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">${itemsHtml}</div>`;
    };

    const inmueblesCheckboxList = createCheckboxList('reporteInmueblesList', inmueblesMap);
    const inquilinosCheckboxList = createCheckboxList('reporteInquilinosList', inquilinosMap);

    const modalHtml = `
        <div class="px-6 py-4 bg-gradient-to-r from-pink-600 to-pink-800 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow-lg relative">
            <button id="btnCerrarModalReporte" class="absolute top-3 right-4 text-white hover:text-pink-200 transition-colors duration-200 focus:outline-none">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 class="text-2xl font-bold text-center">Generar Reporte de Pagos</h3>
        </div>
        <div class="space-y-6 p-5">
            <div>
                <label class="block text-lg font-semibold text-gray-800 mb-2">1. Seleccione Inmueble(s)</label>
                ${inmueblesCheckboxList}
            </div>
            <div>
                <label class="block text-lg font-semibold text-gray-800 mb-2">2. Seleccione Inquilino(s)</label>
                ${inquilinosCheckboxList}
            </div>
            <div>
                <label class="block text-lg font-semibold text-gray-800 mb-2">3. Seleccione Rango de Fechas (Opcional)</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                        <label for="reporteFechaInicio" class="block text-sm font-medium text-gray-600 mb-1">Desde</label>
                        <input type="date" id="reporteFechaInicio" class="block w-full border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-base">
                    </div>
                    <div>
                        <label for="reporteFechaFin" class="block text-sm font-medium text-gray-600 mb-1">Hasta</label>
                        <input type="date" id="reporteFechaFin" class="block w-full border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-base">
                    </div>
                </div>
            </div>
        </div>
        <div class="flex justify-end space-x-4 mt-8 p-4 bg-gray-50 -mx-6 -mb-6 rounded-b-lg">
            <button type="button" id="btnCancelarReporte" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="button" id="btnGenerarPdf" class="bg-pink-600 hover:bg-pink-700 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                Generar PDF
            </button>
        </div>
    `;

    mostrarModal(modalHtml);

    document.getElementById('btnCerrarModalReporte').addEventListener('click', ocultarModal);
    document.getElementById('btnCancelarReporte').addEventListener('click', ocultarModal);
    document.getElementById('btnGenerarPdf').addEventListener('click', () => {
        const filtrosInmueble = Array.from(document.querySelectorAll('#reporteInmueblesList input:checked')).map(cb => cb.value);
        const filtrosInquilino = Array.from(document.querySelectorAll('#reporteInquilinosList input:checked')).map(cb => cb.value);
        const filtroFechaInicio = document.getElementById('reporteFechaInicio').value;
        const filtroFechaFin = document.getElementById('reporteFechaFin').value;

        let pagosFiltrados = pagosList.filter(pago => {
            const fechaPago = new Date(pago.fechaRegistro);
            const fechaInicio = filtroFechaInicio ? new Date(filtroFechaInicio) : null;
            const fechaFin = filtroFechaFin ? new Date(filtroFechaFin) : null;

            if (fechaInicio) fechaInicio.setHours(0, 0, 0, 0);
            if (fechaFin) fechaFin.setHours(23, 59, 59, 999);

            const inmuebleMatch = filtrosInmueble.length === 0 || filtrosInmueble.includes(pago.inmuebleId);
            const inquilinoMatch = filtrosInquilino.length === 0 || filtrosInquilino.includes(pago.inquilinoId);

            return inmuebleMatch &&
                inquilinoMatch &&
                (!fechaInicio || fechaPago >= fechaInicio) &&
                (!fechaFin || fechaPago <= fechaFin);
        });

        generarReportePDF(pagosFiltrados);
    });

    // --- Lógica de Exclusión Mutua ---
    const inmueblesContainer = document.getElementById('reporteInmueblesList');
    const inquilinosContainer = document.getElementById('reporteInquilinosList');

    const handleSelection = (container, otherContainer) => {
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.checked) {
                const otherCheckboxes = otherContainer.querySelectorAll('input[type="checkbox"]:checked');
                if (otherCheckboxes.length > 0) {
                    // Revertir la selecciÃ³n
                    e.target.checked = false;

                    // Mostrar alerta con SweetAlert2
                    Swal.fire({
                        title: '\u00A1Un momento! 🚨',
                        html: 'Solo puedes filtrar por <b>inmuebles</b> o por <b>inquilinos</b> a la vez, \u00A1no ambos!',
                        icon: 'warning',
                        confirmButtonText: '\u00A1Entendido!',
                        confirmButtonColor: '#3B82F6', // Un azul más amigable
                        background: '#fff url(/img/bubbles.png)', // Un fondo sutil si tienes una imagen de burbujas
                        backdrop: `
                            rgba(0,0,0,0.4)
                            url("img/nyan-cat.gif")
                            left top
                            no-repeat
                        `,
                        showClass: {
                            popup: 'animate__animated animate__tada' // Animación más divertida
                        },
                        didOpen: () => {
                            const container = Swal.getPopup().parentElement;
                            if (container) {
                                container.style.zIndex = '10000';
                            }
                        }
                    });
                }
            }
        });
    };

    handleSelection(inmueblesContainer, inquilinosContainer);
    handleSelection(inquilinosContainer, inmueblesContainer);
}

// Nueva función para generar el PDF del reporte de pagos
function generarReportePDF(pagosList) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const filtrosInmueble = Array.from(document.querySelectorAll('#reporteInmueblesList input:checked')).map(cb => cb.value);
    const filtrosInquilino = Array.from(document.querySelectorAll('#reporteInquilinosList input:checked')).map(cb => cb.value);
    const filtroFechaInicio = document.getElementById('reporteFechaInicio').value;
    const filtroFechaFin = document.getElementById('reporteFechaFin').value;

    let pagosFiltrados = pagosList.filter(pago => {
        const fechaPago = new Date(pago.fechaRegistro);
        const fechaInicio = filtroFechaInicio ? new Date(filtroFechaInicio) : null;
        const fechaFin = filtroFechaFin ? new Date(filtroFechaFin) : null;

        if (fechaInicio) fechaInicio.setHours(0, 0, 0, 0);
        if (fechaFin) fechaFin.setHours(23, 59, 59, 999);

        const inmuebleMatch = filtrosInmueble.length === 0 || filtrosInmueble.includes(pago.inmuebleId);
        const inquilinoMatch = filtrosInquilino.length === 0 || filtrosInquilino.includes(pago.inquilinoId);

        return inmuebleMatch &&
            inquilinoMatch &&
            (!fechaInicio || fechaPago >= fechaInicio) && // Corregido aquí
            (!fechaFin || fechaPago <= fechaFin);
    });

    if (pagosFiltrados.length === 0) {
        mostrarNotificacion("No hay pagos que coincidan con los filtros seleccionados.", "info");
        return;
    }

    // Agrupar pagos
    const agruparPorInmueble = filtrosInmueble.length > 1;
    const agruparPorInquilino = filtrosInquilino.length > 1 && !agruparPorInmueble;

    let grupos = {};
    if (agruparPorInmueble) {
        pagosFiltrados.forEach(pago => {
            if (!grupos[pago.inmuebleId]) {
                grupos[pago.inmuebleId] = { nombre: pago.nombreInmueble, pagos: [] };
            }
            grupos[pago.inmuebleId].pagos.push(pago);
        });
    } else if (agruparPorInquilino) {
        pagosFiltrados.forEach(pago => {
            if (!grupos[pago.inquilinoId]) {
                grupos[pago.inquilinoId] = { nombre: pago.nombreInquilino, pagos: [] };
            }
            grupos[pago.inquilinoId].pagos.push(pago);
        });
    } else {
        // Si no hay agrupación múltiple, se crea un solo grupo para mantener la lógica
        grupos['todos'] = { nombre: 'Todos los pagos seleccionados', pagos: pagosFiltrados };
    }

    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // Ordenar los pagos dentro de cada grupo
    for (const key in grupos) {
        grupos[key].pagos.sort((a, b) => {
            if (b.anioCorrespondiente !== a.anioCorrespondiente) {
                return b.anioCorrespondiente - a.anioCorrespondiente;
            }
            return mesesNombres.indexOf(b.mesCorrespondiente) - mesesNombres.indexOf(a.mesCorrespondiente);
        });
    }

    doc.setFontSize(18);
    doc.text("Reporte de Pagos", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    let startY = 30;

    const tableColumn = ["Inmueble", "Inquilino", "Monto Pagado", "Fecha de Pago", "Mes Correspondiente"];

    for (const key in grupos) {
        const grupo = grupos[key];
        if (grupo.pagos.length === 0) continue;

        if (agruparPorInmueble || agruparPorInquilino) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(grupo.nombre, 14, startY);
            startY += 8;
        }

        const tableRows = [];
        grupo.pagos.forEach(pago => {
            const pagoData = [
                pago.nombreInmueble,
                pago.nombreInquilino,
                `${(pago.montoPagado || 0).toFixed(2)}`,
                pago.fechaRegistro,
                `${pago.mesCorrespondiente} ${pago.anioCorrespondiente}`
            ];
            tableRows.push(pagoData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { font: 'helvetica', fontSize: 10 },
            didDrawPage: (data) => {
                startY = data.cursor.y + 10; // Actualizar startY para la siguiente tabla
            }
        });

        if (doc.autoTable.previous.finalY) {
            startY = doc.autoTable.previous.finalY + 10;
        }

        if (startY > 250) {
            doc.addPage();
            startY = 20;
        }
    }

    doc.save('reporte_pagos.pdf');
    ocultarModal();
}

// Nueva función para el flujo guiado después de registrar un pago
async function iniciarFlujoPostPago(pagoId, inquilinoId, enVistaTabla) {
    ocultarModal();

    try {
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        if (!inquilinoDoc.exists()) {
            mostrarNotificacion("No se encontró el inquilino.", "error");
            if (enVistaTabla) mostrarPagos(true);
            return;
        }
        const inquilinoData = inquilinoDoc.data();

        const tieneServicios = inquilinoData.pagaServicios &&
            ((inquilinoData.servicios && inquilinoData.servicios.length > 0) ||
                (inquilinoData.tipoServicio && inquilinoData.montoServicio));

        // --- CORRECCIÓN: Verificar si el inquilino tiene mobiliario asignado ---
        // La verificación se hace buscando en la colección 'mobiliario' si hay alguna
        // asignación activa para este inquilino.
        let tieneMobiliario = false;
        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        for (const mobDoc of mobiliarioSnap.docs) {
            const mobData = mobDoc.data();
            if (Array.isArray(mobData.asignaciones) && mobData.asignaciones.some(a => a.inquilinoId === inquilinoId && a.activa === true && a.cantidad > 0)) {
                tieneMobiliario = true;
                break; // Si encontramos al menos uno, es suficiente
            }
        }

        // Iniciar el flujo de preguntas
        if (tieneServicios) {
            await preguntarPorServicios(pagoId, inquilinoId, tieneMobiliario, enVistaTabla);
        } else if (tieneMobiliario) {
            await preguntarPorMobiliario(pagoId, inquilinoId, enVistaTabla);
        } else {
            await preguntarPorRecibo(pagoId, enVistaTabla);
        }

    } catch (error) {
        console.error("Error en el flujo post-pago:", error);
        mostrarNotificacion("Ocurrió un error al verificar los datos del inquilino.", "error");
        if (enVistaTabla) mostrarPagos(true);
    }
}

async function preguntarPorServicios(pagoId, inquilinoId, tieneMobiliario, enVistaTabla) {
    Swal.fire({
        title: '\u00BFPago de Servicios?',
        text: "Este inquilino tiene servicios asignados. \u00BFDeseas registrar el pago de servicios ahora?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'S\u00ED, registrar',
        cancelButtonText: 'No, omitir',
        customClass: {
            popup: 'animated fadeInDown'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            // El usuario quiere registrar servicios.
            // Pasamos una función de callback para continuar el flujo.
            const callbackFlujo = () => {
                if (tieneMobiliario) {
                    preguntarPorMobiliario(pagoId, inquilinoId, enVistaTabla);
                } else {
                    preguntarPorRecibo(pagoId, enVistaTabla);
                }
            };
            await mostrarFormularioPagoServicio(inquilinoId, pagoId, callbackFlujo);
        } else {
            // El usuario no quiere registrar servicios, pasar a la siguiente pregunta.
            if (tieneMobiliario) {
                await preguntarPorMobiliario(pagoId, inquilinoId, enVistaTabla);
            } else {
                await preguntarPorRecibo(pagoId, enVistaTabla);
            }
        }
    });
}

async function preguntarPorMobiliario(pagoId, inquilinoId, enVistaTabla) {
    Swal.fire({
        title: '\u00BFPago de Mobiliario?',
        text: "Este inquilino tiene mobiliario asignado. \u00BFDeseas registrar el pago del mobiliario ahora?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'S\u00ED, registrar',
        cancelButtonText: 'No, omitir',
        customClass: {
            popup: 'animated fadeInDown'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            // El usuario quiere registrar mobiliario.
            // Pasamos una función de callback para continuar el flujo.
            const callbackFlujo = () => preguntarPorRecibo(pagoId, enVistaTabla);
            await mostrarFormularioPagoMobiliario(inquilinoId, pagoId, callbackFlujo);
        } else {
            // El usuario no quiere registrar mobiliario, pasar a la siguiente pregunta.
            await preguntarPorRecibo(pagoId, enVistaTabla);
        }
    });
}

async function preguntarPorRecibo(pagoId, enVistaTabla) {
    Swal.fire({
        title: '\u00BFGenerar Recibo?',
        text: "\u00BFDeseas generar el recibo de pago en PDF ahora?",
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#d33',
        confirmButtonText: 'S\u00ED, generar PDF',
        cancelButtonText: 'No, finalizar',
        customClass: {
            popup: 'animated fadeInUp'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            seleccionarFirmaYGenerarRecibo(pagoId);
        }
        // Ya sea que se genere o no el recibo, refrescamos la vista principal.
        if (enVistaTabla) {
            mostrarPagos(true);
        } else {
            mostrarPagos();
        }
    });
}

/**
 * Muestra el formulario para registrar o editar un pago.
 * @param {string} id - El ID del pago a editar (opcional).
 */
export async function mostrarFormularioNuevoPago(id = null, onCancel = null) {

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
    const anos = Array.from({ length: 7 }, (_, i) => anioActual - 3 + i);

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
        <!-- Buscador -->
        <div class="relative">
            <label for="buscadorInmuebleInquilino" class="block text-sm font-semibold text-gray-700 mb-1">Buscar por Inmueble o Inquilino</label>
            <input type="text" id="buscadorInmuebleInquilino" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Escribe para buscar...">
            <div id="resultadosBusqueda" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg" style="display: none;"></div>
        </div>

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
                <span class="text-xs text-blue-500">Los pagos corresponden a partir del mes de ocupación.</span>
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
                <span class="text-xs text-gray-500">Al cambiar la fecha, se actualiza el mes correspondiente.</span>
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
            <button type="button" onclick="cerrarModalDePago()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                ${id ? "Actualizar Pago" : "Registrar Pago"}
            </button>
        </div>
    </form>
`;

    mostrarModal(formHtml);

    // --- Buscador ---
    const buscadorInput = document.getElementById('buscadorInmuebleInquilino');
    const resultadosBusqueda = document.getElementById('resultadosBusqueda');
    const inmuebleSelect = document.getElementById('inmuebleId');

    buscadorInput.addEventListener('keyup', () => {
        const searchTerm = buscadorInput.value.toLowerCase();
        if (searchTerm.length < 2) {
            resultadosBusqueda.innerHTML = '';
            resultadosBusqueda.style.display = 'none';
            return;
        }

        const resultados = [];

        // Buscar en inmuebles
        inmuebles.forEach(inmueble => {
            if (inmueble.nombre.toLowerCase().includes(searchTerm)) {
                resultados.push({
                    tipo: 'Inmueble',
                    nombre: inmueble.nombre,
                    id: inmueble.id
                });
            }
        });

        // Buscar en inquilinos
        inquilinos.forEach(inquilino => {
            if (inquilino.nombre.toLowerCase().includes(searchTerm)) {
                // Encontrar el inmueble asociado al inquilino
                const inmuebleAsociado = inmuebles.find(inm => inm.inquilinoActualId === inquilino.id);
                if (inmuebleAsociado) {
                    resultados.push({
                        tipo: 'Inquilino',
                        nombre: `${inquilino.nombre} (en ${inmuebleAsociado.nombre})`,
                        id: inmuebleAsociado.id // El id que nos importa es el del inmueble
                    });
                }
            }
        });

        if (resultados.length > 0) {
            resultadosBusqueda.innerHTML = resultados.map(r =>
                `<div class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${r.id}">${r.nombre} <span class="text-xs text-gray-500">(${r.tipo})</span></div>`
            ).join('');
            resultadosBusqueda.style.display = 'block';
        } else {
            resultadosBusqueda.innerHTML = '<div class="p-2 text-gray-500">No se encontraron resultados</div>';
            resultadosBusqueda.style.display = 'block';
        }
    });

    resultadosBusqueda.addEventListener('click', (e) => {
        if (e.target.closest('[data-id]')) {
            const inmuebleId = e.target.closest('[data-id]').dataset.id;
            inmuebleSelect.value = inmuebleId;

            // Disparar el evento change para que se actualice el inquilino
            const event = new Event('change', { bubbles: true });
            inmuebleSelect.dispatchEvent(event);

            buscadorInput.value = '';
            resultadosBusqueda.innerHTML = '';
            resultadosBusqueda.style.display = 'none';
        }
    });

    // Ocultar resultados si se hace clic fuera
    document.addEventListener('click', function (event) {
        if (!buscadorInput.contains(event.target) && !resultadosBusqueda.contains(event.target)) {
            resultadosBusqueda.style.display = 'none';
        }
    });


    // --- Script de autollenado robusto ---
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
    inmuebleSelect.addEventListener('change', async function () {
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

    // Si es un nuevo pago, determinar el mes correspondiente según la fecha de registro
    if (!id) {
        const fechaRegistroInput = document.getElementById('fechaRegistro');
        actualizarMesCorrespondiente(fechaRegistroInput);

        // Actualizar mes correspondiente cuando cambie la fecha de registro
        fechaRegistroInput.addEventListener('change', function () {
            actualizarMesCorrespondiente(this);
        });
    } else {
        // Si es edición, mantener los valores originales
        document.getElementById('mesCorrespondiente').value = selectedMes;
        document.getElementById('anioCorrespondiente').value = selectedAnio;
    }

    montoTotalInput.value = montoTotal;
    montoPagoInput.value = montoPagado;

    // --- Guardar pago ---
    document.getElementById('formPago').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Verificar si estamos en la vista de tabla
        const enVistaTabla = document.querySelector('.min-w-full') !== null;

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

        // Determinar el mes correspondiente según la fecha de pago
        // Si el pago se realiza el día 15, se considera como pago del mes actual
        const fechaPago = new Date(fechaRegistro);
        const diaPago = fechaPago.getDate();
        // No modificamos mesCorrespondiente ni anioCorrespondiente ya que el usuario los selecciona manualmente

        // --- AQUÃ VA EL FRAGMENTO DE SALDO A FAVOR ---
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

        // --- CÃLCULO DE PERIODO HISTÃ“RICO (Persistencia) ---
        let periodoInicio = "";
        let periodoFin = "";

        try {
            // Obtener datos frescos del inquilino para la fecha de ocupación
            const inquilinoDocForPeriod = await getDoc(doc(db, "inquilinos", inquilinoId));
            if (inquilinoDocForPeriod.exists()) {
                const inquilinoData = inquilinoDocForPeriod.data();
                if (inquilinoData.fechaOcupacion && mesCorrespondiente && anioCorrespondiente) {
                    let diaInicio = 1;
                    if (inquilinoData.fechaOcupacion.includes('/')) {
                        const partes = inquilinoData.fechaOcupacion.split('/');
                        diaInicio = parseInt(partes[0]);
                    } else if (inquilinoData.fechaOcupacion.includes('-')) {
                        const partes = inquilinoData.fechaOcupacion.split('-');
                        diaInicio = parseInt(partes[2]);
                    }

                    const meses = [
                        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                    ];
                    const mesPagoIdx = meses.findIndex(m => m.toLowerCase() === mesCorrespondiente.toLowerCase());
                    const anioPago = parseInt(anioCorrespondiente);

                    // Fecha inicio: día de ocupación, mes/año del pago
                    const fechaInicioObj = new Date(anioPago, mesPagoIdx, diaInicio);

                    // Fecha fin: un día antes del mismo día del mes siguiente
                    let mesFinVal = mesPagoIdx + 1;
                    let anioFinVal = anioPago;
                    if (mesFinVal > 11) { mesFinVal = 0; anioFinVal++; }
                    const fechaFinObj = new Date(anioFinVal, mesFinVal, diaInicio);
                    fechaFinObj.setDate(fechaFinObj.getDate() - 1);

                    const opciones = { day: '2-digit', month: 'long', year: 'numeric' };
                    periodoInicio = fechaInicioObj.toLocaleDateString('es-MX', opciones);
                    periodoFin = fechaFinObj.toLocaleDateString('es-MX', opciones);
                }
            }
        } catch (error) {
            console.error("Error calculando periodo histórico:", error);
        }

        const datos = {
            periodoInicio, // Guardamos el periodo histórico
            periodoFin,
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
                ocultarModal();
                if (enVistaTabla) {
                    mostrarPagos(true);
                }
            } else {
                const docRef = await addDoc(collection(db, "pagos"), datos);
                mostrarNotificacion('Pago de Renta Registrado.', 'success');
                // Iniciar el nuevo flujo de preguntas
                await iniciarFlujoPostPago(docRef.id, inquilinoId, enVistaTabla);
            }

        } catch (error) {
            mostrarNotificacion('Error al guardar el pago.', 'error');
        }
    });

    if (document.getElementById('servicioInternet')) {
        document.getElementById('servicioInternet').addEventListener('change', function () {
            document.getElementById('montoInternet').style.display = this.checked ? 'inline-block' : 'none';
        });
    }

    document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
        btn.addEventListener('click', async function () {
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
    // Guardar el estado actual para saber si estamos en la vista de tabla
    const enVistaTabla = document.querySelector('.min-w-full') !== null;

    // Mostrar el formulario de edición
    await mostrarFormularioNuevoPago(id);

    // Modificar el comportamiento del formulario para mantener la vista de tabla
    const formPago = document.getElementById('formPago');
    if (formPago) {
        const originalSubmitHandler = formPago.onsubmit;
        formPago.onsubmit = async (e) => {
            e.preventDefault();

            // Obtener todos los datos del formulario
            const formData = new FormData(formPago);
            const datos = Object.fromEntries(formData.entries());

            try {
                // Procesar los datos como lo haría normalmente
                // (Aquí iría la lógica de procesamiento que ya tienes)

                // Cerrar el modal
                ocultarModal();

                // Mostrar la vista de tabla si estábamos en ella
                if (enVistaTabla) {
                    mostrarPagos(true);
                } else {
                    mostrarPagos();
                }
            } catch (error) {
                console.error('Error al guardar el pago:', error);
                mostrarNotificacion('Error al guardar el pago.', 'error');
            }
        };
    }
}

/**
 * Muestra el formulario para registrar pagos de servicios (internet, agua, luz).
 * Permite registrar servicios de manera independiente o todos a la vez.
 */
export async function mostrarFormularioPagoServicio(inquilinoIdPreseleccionado = null, pagoIdAsociado = null, callbackFlujo = null) {
    try {
        const inquilinosSnap = await getDocs(query(collection(db, "inquilinos"), where("activo", "==", true)));
        const inquilinos = [];
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (inquilinos.length === 0) {
            mostrarNotificacion("No hay inquilinos activos para registrar pagos.", "error");
            return;
        }

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmuebles = [];
        inmueblesSnap.forEach(doc => {
            inmuebles.push({ id: doc.id, ...doc.data() });
        });

        const inquilinosOptions = inquilinos.map(inq => {
            const inmuebleAsociado = inmuebles.find(inm => inm.id === inq.inmuebleAsociadoId);
            const inmuebleNombre = inmuebleAsociado ? inmuebleAsociado.nombre : 'Sin inmueble';
            return `<option value="${inq.id}">${inq.nombre} - ${inmuebleNombre}</option>`;
        }).join('');

        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 7 }, (_, i) => anioActual - 3 + i);
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

        const formHtml = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Registrar Pago de Servicios</h3>
            </div>
            <form id="formPagoServicio" class="space-y-5 px-2">
                <div class="relative">
                    <label for="buscadorInmuebleServicios" class="block text-sm font-semibold text-gray-700 mb-1">Buscar por Inmueble</label>
                    <input type="text" id="buscadorInmuebleServicios" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Escribe para buscar...">
                    <div id="resultadosBusquedaInmuebleServicios" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg" style="display: none;"></div>
                </div>
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
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioInternet" name="servicioInternet" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioInternet" class="text-sm font-medium text-gray-700">Internet</label>
                                <input type="number" id="montoInternet" name="montoInternet" placeholder="Monto" min="0" step="0.01" class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            </div>
                        </div>
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioAgua" name="servicioAgua" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioAgua" class="text-sm font-medium text-gray-700">Agua</label>
                                <input type="number" id="montoAgua" name="montoAgua" placeholder="Monto" min="0" step="0.01" class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                            </div>
                        </div>
                        <div class="flex items-start">
                            <div class="flex items-center h-5">
                                <input id="servicioLuz" name="servicioLuz" type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            </div>
                            <div class="ml-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <label for="servicioLuz" class="text-sm font-medium text-gray-700">Luz</label>
                                <input type="number" id="montoLuz" name="montoLuz" placeholder="Monto" min="0" step="0.01" class="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
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
                        <input type="date" id="fechaRegistro" name="fechaRegistro" value="${new Date().toISOString().split('T')[0]}" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
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
                    <button type="button" id="btnCancelarPagoServicio" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                        Registrar Pago
                    </button>
                </div>
            </form>
        `;

        mostrarModal(formHtml);

        const inquilinoSelect = document.getElementById('inquilinoId');

        if (inquilinoIdPreseleccionado) {
            inquilinoSelect.value = inquilinoIdPreseleccionado;
            inquilinoSelect.disabled = true;
            // Disparar evento change para cargar los servicios del inquilino
            inquilinoSelect.dispatchEvent(new Event('change', { bubbles: true }));

            // Cargar montos de servicios para el inquilino preseleccionado
            const inquilinoPreseleccionado = inquilinos.find(i => i.id === inquilinoIdPreseleccionado);
            if (inquilinoPreseleccionado && inquilinoPreseleccionado.pagaServicios) {
                if (inquilinoPreseleccionado.servicios && Array.isArray(inquilinoPreseleccionado.servicios)) {
                    inquilinoPreseleccionado.servicios.forEach(servicio => {
                        const tipo = servicio.tipo.toLowerCase();
                        const montoInput = document.getElementById(`monto${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
                        const checkbox = document.getElementById(`servicio${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
                        if (montoInput && checkbox) {
                            checkbox.checked = true;
                            montoInput.value = servicio.monto || '';
                            montoInput.disabled = false;
                        }
                    });
                } else if (inquilinoPreseleccionado.tipoServicio && inquilinoPreseleccionado.montoServicio) {
                    const tipoServicio = inquilinoPreseleccionado.tipoServicio.toLowerCase();
                    const montoInput = document.getElementById(`monto${tipoServicio.charAt(0).toUpperCase() + tipoServicio.slice(1)}`);
                    if (montoInput) {
                        montoInput.value = inquilinoPreseleccionado.montoServicio || '';
                    }
                }
            }
        }

        document.getElementById('btnCancelarPagoServicio').addEventListener('click', () => cerrarModalDePago(mostrarPagos));

        const buscadorInmuebleInput = document.getElementById('buscadorInmuebleServicios');
        const resultadosBusquedaInmueble = document.getElementById('resultadosBusquedaInmuebleServicios');

        buscadorInmuebleInput.addEventListener('keyup', () => {
            const searchTerm = buscadorInmuebleInput.value.toLowerCase();
            if (searchTerm.length < 2) {
                resultadosBusquedaInmueble.innerHTML = '';
                resultadosBusquedaInmueble.style.display = 'none';
                return;
            }

            const resultados = inmuebles.filter(inmueble =>
                inmueble.nombre.toLowerCase().includes(searchTerm) && inmueble.estado === 'Ocupado'
            );

            if (resultados.length > 0) {
                resultadosBusquedaInmueble.innerHTML = resultados.map(r =>
                    `<div class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${r.id}">${r.nombre}</div>`
                ).join('');
                resultadosBusquedaInmueble.style.display = 'block';
            } else {
                resultadosBusquedaInmueble.innerHTML = '<div class="p-2 text-gray-500">No se encontraron resultados</div>';
                resultadosBusquedaInmueble.style.display = 'block';
            }
        });

        resultadosBusquedaInmueble.addEventListener('click', (e) => {
            if (e.target.closest('[data-id]')) {
                const inmuebleId = e.target.closest('[data-id]').dataset.id;
                const inmuebleSeleccionado = inmuebles.find(inm => inm.id === inmuebleId);
                if (inmuebleSeleccionado && inmuebleSeleccionado.inquilinoActualId) {
                    inquilinoSelect.value = inmuebleSeleccionado.inquilinoActualId;
                    const event = new Event('change', { bubbles: true });
                    inquilinoSelect.dispatchEvent(event);
                }

                buscadorInmuebleInput.value = '';
                resultadosBusquedaInmueble.innerHTML = '';
                resultadosBusquedaInmueble.style.display = 'none';
            }
        });

        document.addEventListener('click', function (event) {
            if (buscadorInmuebleInput && !buscadorInmuebleInput.contains(event.target) && !resultadosBusquedaInmueble.contains(event.target)) {
                resultadosBusquedaInmueble.style.display = 'none';
            }
        });

        // Autocompletar montos de servicios al seleccionar un inquilino
        inquilinoSelect.addEventListener('change', (e) => {
            const selectedInquilinoId = e.target.value;
            const selectedInquilino = inquilinos.find(i => i.id === selectedInquilinoId);

            // Reset all service fields first
            document.getElementById('servicioInternet').checked = false;
            document.getElementById('montoInternet').value = '';
            document.getElementById('montoInternet').disabled = true;
            document.getElementById('servicioAgua').checked = false;
            document.getElementById('montoAgua').value = '';
            document.getElementById('montoAgua').disabled = true;
            document.getElementById('servicioLuz').checked = false;
            document.getElementById('montoLuz').value = '';
            document.getElementById('montoLuz').disabled = true;

            if (selectedInquilino && selectedInquilino.pagaServicios) {
                if (selectedInquilino.servicios && Array.isArray(selectedInquilino.servicios)) {
                    selectedInquilino.servicios.forEach(servicio => {
                        const tipo = servicio.tipo.toLowerCase();
                        if (tipo === 'internet') {
                            document.getElementById('servicioInternet').checked = true;
                            document.getElementById('montoInternet').value = servicio.monto || '';
                            document.getElementById('montoInternet').disabled = false;
                        } else if (tipo === 'agua') {
                            document.getElementById('servicioAgua').checked = true;
                            document.getElementById('montoAgua').value = servicio.monto || '';
                            document.getElementById('montoAgua').disabled = false;
                        } else if (tipo === 'luz') {
                            document.getElementById('servicioLuz').checked = true;
                            document.getElementById('montoLuz').value = servicio.monto || '';
                            document.getElementById('montoLuz').disabled = false;
                        }
                    });
                } else if (selectedInquilino.tipoServicio && selectedInquilino.montoServicio) {
                    // Handle legacy single service
                    const tipoServicio = selectedInquilino.tipoServicio.toLowerCase();
                    if (tipoServicio === 'internet') {
                        document.getElementById('servicioInternet').checked = true;
                        document.getElementById('montoInternet').value = selectedInquilino.montoServicio || '';
                        document.getElementById('montoInternet').disabled = false;
                    }
                }
            }
        });

        const fechaActual = new Date();
        document.getElementById('mesCorrespondiente').value = meses[fechaActual.getMonth()];
        document.getElementById('anioCorrespondiente').value = fechaActual.getFullYear();

        document.getElementById('servicioInternet').addEventListener('change', function () {
            document.getElementById('montoInternet').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoInternet').value = '';
        });

        document.getElementById('servicioAgua').addEventListener('change', function () {
            document.getElementById('montoAgua').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoAgua').value = '';
        });

        document.getElementById('servicioLuz').addEventListener('change', function () {
            document.getElementById('montoLuz').disabled = !this.checked;
            if (!this.checked) document.getElementById('montoLuz').value = '';
        });

        document.getElementById('montoInternet').disabled = true;
        document.getElementById('montoAgua').disabled = true;
        document.getElementById('montoLuz').disabled = true;

        document.getElementById('formPagoServicio').addEventListener('submit', async (e) => {
            e.preventDefault();

            const inquilinoId = document.getElementById('inquilinoId').value;
            const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
            const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
            const fechaRegistro = document.getElementById('fechaRegistro').value;
            const formaPago = document.getElementById('formaPago').value;

            const servicioInternet = document.getElementById('servicioInternet').checked;
            const servicioAgua = document.getElementById('servicioAgua').checked;
            const servicioLuz = document.getElementById('servicioLuz').checked;

            if (!servicioInternet && !servicioAgua && !servicioLuz) {
                mostrarNotificacion("Debes seleccionar al menos un servicio para registrar el pago.", "error");
                return;
            }

            const montoInternet = servicioInternet ? parseFloat(document.getElementById('montoInternet').value) || 0 : 0;
            const montoAgua = servicioAgua ? parseFloat(document.getElementById('montoAgua').value) || 0 : 0;
            const montoLuz = servicioLuz ? parseFloat(document.getElementById('montoLuz').value) || 0 : 0;

            if ((servicioInternet && montoInternet <= 0) || (servicioAgua && montoAgua <= 0) || (servicioLuz && montoLuz <= 0)) {
                mostrarNotificacion("Debes ingresar un monto válido para cada servicio seleccionado.", "error");
                return;
            }

            // --- INICIO: Verificación de duplicados ---
            const pagosRefCheck = collection(db, "pagos");
            const qCheck = query(pagosRefCheck, where("inquilinoId", "==", inquilinoId), where("mesCorrespondiente", "==", mesCorrespondiente), where("anioCorrespondiente", "==", anioCorrespondiente));
            const querySnapshotCheck = await getDocs(qCheck);

            if (!querySnapshotCheck.empty) {
                const pagoExistente = querySnapshotCheck.docs[0].data();
                if (pagoExistente.serviciosPagados) {
                    if (servicioInternet && pagoExistente.serviciosPagados.internet) {
                        mostrarNotificacion("El pago de Internet para este mes ya fue registrado.", "error");
                        return;
                    }
                    if (servicioAgua && pagoExistente.serviciosPagados.agua) {
                        mostrarNotificacion("El pago de Agua para este mes ya fue registrado.", "error");
                        return;
                    }
                    if (servicioLuz && pagoExistente.serviciosPagados.luz) {
                        mostrarNotificacion("El pago de Luz para este mes ya fue registrado.", "error");
                        return;
                    }
                }
            }
            // --- FIN: Verificación de duplicados ---

            try {
                const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
                const inmuebleId = inquilinoDoc.data().inmuebleAsociadoId;

                const serviciosPagados = {
                    fechaRegistroServicio: fechaRegistro,
                    formaPagoServicio: formaPago
                };

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

                if (pagoIdAsociado) {
                    // Estamos en el flujo guiado, actualizamos el pago de renta existente.
                    const pagoRef = doc(db, "pagos", pagoIdAsociado);
                    const pagoSnap = await getDoc(pagoRef);
                    const pagoData = pagoSnap.data();

                    const serviciosActualizados = { ...(pagoData.serviciosPagados || {}), ...serviciosPagados };

                    await updateDoc(pagoRef, {
                        serviciosPagados: serviciosActualizados
                    });

                    mostrarNotificacion("Pago de servicios añadido con éxito.", "success");
                    ocultarModal();
                    if (callbackFlujo) {
                        callbackFlujo(); // Continuar con el flujo (mobiliario o recibo)
                    }
                } else {
                    // Flujo normal: buscar un pago existente para el mes o crear uno nuevo.
                    const pagosRef = collection(db, "pagos");
                    const q = query(pagosRef, where("inmuebleId", "==", inmuebleId), where("inquilinoId", "==", inquilinoId), where("mesCorrespondiente", "==", mesCorrespondiente), where("anioCorrespondiente", "==", anioCorrespondiente));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const pagoDoc = querySnapshot.docs[0];
                        const pagoExistente = pagoDoc.data();
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

                        await updateDoc(doc(db, "pagos", pagoDoc.id), {
                            serviciosPagados: { ...serviciosActualizados, fechaRegistroServicio: fechaRegistro, formaPagoServicio: formaPago }
                        });

                        mostrarNotificacion("Servicios agregados al pago existente.", "success");
                    } else {
                        await addDoc(collection(db, "pagos"), {
                            inmuebleId,
                            inquilinoId,
                            mesCorrespondiente,
                            anioCorrespondiente,
                            montoTotal: 0,
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
                    mostrarPagos(true);
                }

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
export async function mostrarFormularioPagoMobiliario(inquilinoIdPreseleccionado = null, pagoIdAsociado = null, callbackFlujo = null) {
    try {
        const inquilinosSnap = await getDocs(query(collection(db, "inquilinos"), where("activo", "==", true)));
        const inquilinos = [];
        inquilinosSnap.forEach(doc => {
            inquilinos.push({ id: doc.id, ...doc.data() });
        });

        if (inquilinos.length === 0) {
            mostrarNotificacion("No hay inquilinos activos para registrar pagos.", "error");
            return;
        }

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmuebles = [];
        inmueblesSnap.forEach(doc => {
            inmuebles.push({ id: doc.id, ...doc.data() });
        });

        const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
        const mobiliarioAsignado = [];
        mobiliarioSnap.forEach(doc => {
            const mob = doc.data();
            if (Array.isArray(mob.asignaciones)) {
                const asignacionesActivas = mob.asignaciones.filter(a => a.activa !== false);
                if (asignacionesActivas.length > 0) {
                    mobiliarioAsignado.push({ id: doc.id, ...mob, asignacionesActivas });
                }
            }
        });

        if (mobiliarioAsignado.length === 0) {
            mostrarNotificacion("No hay mobiliario asignado para registrar pagos.", "info");
            return;
        }

        const inquilinosOptions = inquilinos.map(inq => {
            const inmuebleAsociado = inmuebles.find(inm => inm.id === inq.inmuebleAsociadoId);
            const inmuebleNombre = inmuebleAsociado ? inmuebleAsociado.nombre : 'Sin inmueble';
            return `<option value="${inq.id}">${inq.nombre} - ${inmuebleNombre}</option>`;
        }).join('');

        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const anioActual = new Date().getFullYear();
        const anos = Array.from({ length: 7 }, (_, i) => anioActual - 3 + i);
        const mesesOptions = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        const aniosOptions = anos.map(year => `<option value="${year}">${year}</option>`).join('');

        const formHtml = `
            <div class="px-4 py-3 bg-indigo-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6 shadow">
                <h3 class="text-2xl font-bold text-center">Registrar Pago de Mobiliario</h3>
            </div>
            <form id="formPagoMobiliario" class="space-y-5 px-2">
                <div class="relative">
                    <label for="buscadorInmuebleMobiliario" class="block text-sm font-semibold text-gray-700 mb-1">Buscar por Inmueble</label>
                    <input type="text" id="buscadorInmuebleMobiliario" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Escribe para buscar...">
                    <div id="resultadosBusquedaInmuebleMobiliario" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg" style="display: none;"></div>
                </div>
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
                        <input type="date" id="fechaRegistro" name="fechaRegistro" value="${new Date().toISOString().split('T')[0]}" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
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
                    <button type="button" id="btnCancelarPagoMobiliario" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-md shadow-sm transition-colors duration-200">Cancelar</button>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-md shadow-md transition-colors duration-200">
                        Registrar Pago
                    </button>
                </div>
            </form>
        `;

        mostrarModal(formHtml);

        const inquilinoSelect = document.getElementById('inquilinoId');

        // Si se preselecciona un inquilino (desde el flujo guiado)
        if (inquilinoIdPreseleccionado) {
            // La declaración de inquilinoSelect se movió arriba para que esté disponible aquí.
            inquilinoSelect.value = inquilinoIdPreseleccionado;
            inquilinoSelect.disabled = true;
            // Disparar el evento 'change' para cargar y marcar automáticamente el mobiliario
            const event = new Event('change', { bubbles: true });
            inquilinoSelect.dispatchEvent(event);
        }


        document.getElementById('btnCancelarPagoMobiliario').addEventListener('click', () => cerrarModalDePago(mostrarPagos));

        const buscadorInmuebleInput = document.getElementById('buscadorInmuebleMobiliario');
        const resultadosBusquedaInmueble = document.getElementById('resultadosBusquedaInmuebleMobiliario');

        document.addEventListener('click', function (event) {
            if (buscadorInmuebleInput && !buscadorInmuebleInput.contains(event.target) && !resultadosBusquedaInmueble.contains(event.target)) {
                resultadosBusquedaInmueble.style.display = 'none';
            }
        });

        const fechaActual = new Date();
        document.getElementById('mesCorrespondiente').value = meses[fechaActual.getMonth()];
        document.getElementById('anioCorrespondiente').value = fechaActual.getFullYear();

        const cargarMobiliarioParaInquilino = async () => {
            const inquilinoId = inquilinoSelect.value;
            if (!inquilinoId) {
                document.getElementById('listaMobiliarioAsignado').innerHTML = '<p class="text-gray-500 text-center">Selecciona un inquilino para ver su mobiliario asignado</p>';
                return;
            }

            const mobiliarioInquilino = mobiliarioAsignado.filter(mob =>
                mob.asignacionesActivas.some(a => a.inquilinoId === inquilinoId)
            );

            if (mobiliarioInquilino.length === 0) {
                document.getElementById('listaMobiliarioAsignado').innerHTML = '<p class="text-gray-500 text-center">Este inquilino no tiene mobiliario asignado</p>';
                return;
            }

            let html = '';
            mobiliarioInquilino.forEach(mob => {
                const asignacion = mob.asignacionesActivas.find(a => a.inquilinoId === inquilinoId);
                if (asignacion) {
                    const costoTotal = (mob.costoRenta || 0) * asignacion.cantidad;

                    html += `
                        <div class="border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                            <div class="flex items-start" data-auto-check="${inquilinoIdPreseleccionado ? 'true' : 'false'}">
                                <input type="checkbox" name="mobiliario" value="${mob.id}" data-costo="${costoTotal.toFixed(2)}" data-asignacion-id="${asignacion.id || ''}" class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                <div class="ml-3">
                                    <p class="font-medium">${mob.nombre} (${asignacion.cantidad} unidades)</p>
                                    <p class="text-sm text-gray-600">Costo Mensual: ${costoTotal.toFixed(2)}</p>
                                    <p class="text-xs text-gray-500">Asignado: ${new Date(asignacion.fechaAsignacion).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            document.getElementById('listaMobiliarioAsignado').innerHTML = html;

            // Si venimos del flujo guiado, marcar todos los checkboxes
            if (inquilinoIdPreseleccionado) {
                document.querySelectorAll('#listaMobiliarioAsignado input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = true;
                });
            }
        };

        inquilinoSelect.addEventListener('change', cargarMobiliarioParaInquilino);

        // Si hay un inquilino preseleccionado, llama a la función directamente
        if (inquilinoIdPreseleccionado) {
            cargarMobiliarioParaInquilino.call(inquilinoSelect);
        }

        buscadorInmuebleInput.addEventListener('keyup', () => {
            const searchTerm = buscadorInmuebleInput.value.toLowerCase();
            if (searchTerm.length < 2) {
                resultadosBusquedaInmueble.innerHTML = '';
                resultadosBusquedaInmueble.style.display = 'none';
                return;
            }

            const resultados = inmuebles.filter(inmueble =>
                inmueble.nombre.toLowerCase().includes(searchTerm) && inmueble.estado === 'Ocupado'
            );

            if (resultados.length > 0) {
                resultadosBusquedaInmueble.innerHTML = resultados.map(r =>
                    `<div class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${r.id}">${r.nombre}</div>`
                ).join('');
                resultadosBusquedaInmueble.style.display = 'block';
            } else {
                resultadosBusquedaInmueble.innerHTML = '<div class="p-2 text-gray-500">No se encontraron resultados</div>';
                resultadosBusquedaInmueble.style.display = 'block';
            }
        });

        resultadosBusquedaInmueble.addEventListener('click', (e) => {
            if (e.target.closest('[data-id]')) {
                const inmuebleId = e.target.closest('[data-id]').dataset.id;
                const inmuebleSeleccionado = inmuebles.find(inm => inm.id === inmuebleId);
                if (inmuebleSeleccionado && inmuebleSeleccionado.inquilinoActualId) {
                    inquilinoSelect.value = inmuebleSeleccionado.inquilinoActualId;
                    cargarMobiliarioParaInquilino.call(inquilinoSelect);
                }

                buscadorInmuebleInput.value = '';
                resultadosBusquedaInmueble.innerHTML = '';
                resultadosBusquedaInmueble.style.display = 'none';
            }
        });

        document.getElementById('formPagoMobiliario').addEventListener('submit', async (e) => {
            e.preventDefault();

            const inquilinoId = document.getElementById('inquilinoId').value;
            const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
            const anioCorrespondiente = parseInt(document.getElementById('anioCorrespondiente').value);
            const fechaRegistro = document.getElementById('fechaRegistro').value;
            const formaPago = document.getElementById('formaPago').value;

            const mobiliarioSeleccionado = Array.from(document.querySelectorAll('input[name="mobiliario"]:checked'));

            if (mobiliarioSeleccionado.length === 0) {
                mostrarNotificacion("Debes seleccionar al menos un mobiliario para registrar el pago.", "error");
                return;
            }

            // --- INICIO: Verificación de duplicados ---
            const pagosRefCheck = collection(db, "pagos");
            const qCheck = query(pagosRefCheck, where("inquilinoId", "==", inquilinoId), where("mesCorrespondiente", "==", mesCorrespondiente), where("anioCorrespondiente", "==", anioCorrespondiente));
            const querySnapshotCheck = await getDocs(qCheck);

            if (!querySnapshotCheck.empty) {
                const pagoExistente = querySnapshotCheck.docs[0].data();
                if (pagoExistente.mobiliarioPagado && Array.isArray(pagoExistente.mobiliarioPagado) && pagoExistente.mobiliarioPagado.length > 0) {
                    mostrarNotificacion("El pago de mobiliario para este mes ya fue registrado.", "error");
                    return;
                }
            }
            // --- FIN: Verificación de duplicados ---

            let montoTotal = 0;
            mobiliarioSeleccionado.forEach(checkbox => {
                montoTotal += parseFloat(checkbox.dataset.costo);
            });

            try {
                const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
                const inmuebleId = inquilinoDoc.data().inmuebleAsociadoId;

                const nuevoMobiliario = mobiliarioSeleccionado.map(checkbox => ({
                    mobiliarioId: checkbox.value,
                    costo: parseFloat(checkbox.dataset.costo),
                    asignacionId: checkbox.dataset.asignacionId || null,
                    fechaRegistroMobiliario: fechaRegistro,
                    formaPagoMobiliario: formaPago
                }));

                if (pagoIdAsociado) {
                    // Estamos en el flujo guiado, actualizamos el pago de renta existente.
                    const pagoRef = doc(db, "pagos", pagoIdAsociado);
                    const pagoSnap = await getDoc(pagoRef);
                    const pagoData = pagoSnap.data();

                    const mobiliarioActualizado = Array.isArray(pagoData.mobiliarioPagado) ? [...pagoData.mobiliarioPagado, ...nuevoMobiliario] : nuevoMobiliario;

                    await updateDoc(pagoRef, {
                        mobiliarioPagado: mobiliarioActualizado
                    });

                    mostrarNotificacion("Pago de mobiliario añadido con éxito.", "success");
                    ocultarModal();
                    if (callbackFlujo) {
                        callbackFlujo(); // Continuar con el flujo (recibo)
                    }
                } else {
                    // Flujo normal: buscar un pago existente para el mes o crear uno nuevo.
                    const pagosRef = collection(db, "pagos");
                    const q = query(pagosRef, where("inmuebleId", "==", inmuebleId), where("inquilinoId", "==", inquilinoId), where("mesCorrespondiente", "==", mesCorrespondiente), where("anioCorrespondiente", "==", anioCorrespondiente));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const pagoDoc = querySnapshot.docs[0];
                        const pagoExistente = pagoDoc.data();
                        const mobiliarioActualizado = Array.isArray(pagoExistente.mobiliarioPagado) ? [...pagoExistente.mobiliarioPagado, ...nuevoMobiliario] : nuevoMobiliario;

                        await updateDoc(doc(db, "pagos", pagoDoc.id), {
                            mobiliarioPagado: mobiliarioActualizado
                        });

                        mostrarNotificacion("Mobiliario agregado al pago existente.", "success");
                    } else {
                        const pagoData = {
                            inmuebleId,
                            inquilinoId,
                            mesCorrespondiente,
                            anioCorrespondiente,
                            montoTotal: montoTotal, // El total es solo el mobiliario en este caso
                            montoPagado: montoTotal,
                            saldoPendiente: 0,
                            estado: "pagado",
                            fechaRegistro,
                            abonos: [{ montoAbonado: montoTotal, fechaAbono: fechaRegistro }],
                            formaPago,
                            tipoPago: "mobiliario",
                            mobiliarioPagado: nuevoMobiliario
                        };

                        await addDoc(collection(db, "pagos"), pagoData);
                        mostrarNotificacion("Pago de mobiliario registrado con éxito.", "success");
                    }
                    ocultarModal();
                    mostrarPagos(true);
                }

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

            // Verificar si estamos en la vista de tabla
            const enVistaTabla = document.querySelector('.min-w-full') !== null;

            mostrarNotificacion('Abono registrado con éxito.', 'success');
            ocultarModal();

            // Mantener la vista de tabla si estábamos en ella
            if (enVistaTabla) {
                mostrarPagos(true);
            } else {
                mostrarPagos();
            }

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
            } catch (e) { }
        }

        // Generar HTML para servicios pagados
        let serviciosHtml = '';
        if (pago.serviciosPagados) {
            const servicios = [];
            // Usar explícitamente los campos específicos de servicios
            const fechaServicio = pago.serviciosPagados.fechaRegistroServicio || pago.fechaRegistro || 'N/A';
            const formaPagoServicio = pago.serviciosPagados.formaPagoServicio || pago.formaPago || 'N/A';

            console.log("Detalle pago - Fecha servicio:", fechaServicio, "Forma pago servicio:", formaPagoServicio);
            console.log("Campos disponibles en serviciosPagados:", Object.keys(pago.serviciosPagados));

            if (pago.serviciosPagados.internet) {
                servicios.push(`Internet: ${(pago.serviciosPagados.internetMonto || 0).toFixed(2)} | Fecha: ${fechaServicio} | Forma de pago: ${formaPagoServicio}`);
            }
            if (pago.serviciosPagados.agua) {
                servicios.push(`Agua: ${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)} | Fecha: ${fechaServicio} | Forma de pago: ${formaPagoServicio}`);
            }
            if (pago.serviciosPagados.luz) {
                servicios.push(`Luz: ${(pago.serviciosPagados.luzMonto || 0).toFixed(2)} | Fecha: ${fechaServicio} | Forma de pago: ${formaPagoServicio}`);
            }

            if (servicios.length > 0) {
                serviciosHtml = `
                    <h4 class="text-lg font-semibold mt-6 mb-2 text-gray-800">Servicios Pagados:</h4>
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <ul class="list-disc list-inside space-y-1">
                            ${servicios.map(s => `<li class="text-blue-800">${s}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        // Generar HTML para mobiliario pagado
        let mobiliarioHtml = '';
        if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
            let mobiliarioTotal = 0;
            const mobiliarioItems = [];

            for (const item of pago.mobiliarioPagado) {
                const costo = item.costo || 0;
                mobiliarioTotal += costo;

                // Obtener fecha y forma de pago específicas del mobiliario o usar las del pago general
                const fechaMobiliario = item.fechaRegistroMobiliario || pago.fechaRegistro || 'N/A';
                const formaPagoMobiliario = item.formaPagoMobiliario || pago.formaPago || 'N/A';

                console.log("Fecha mobiliario:", fechaMobiliario, "Forma pago mobiliario:", formaPagoMobiliario);

                // Intentar obtener el nombre del mobiliario
                let nombreMobiliario = 'Mobiliario';
                try {
                    const mobDoc = await getDoc(doc(db, "mobiliario", item.mobiliarioId));
                    if (mobDoc.exists()) {
                        nombreMobiliario = mobDoc.data().nombre || 'Mobiliario';
                    }
                } catch (e) { }

                mobiliarioItems.push(`${nombreMobiliario}: ${costo.toFixed(2)} | Fecha: ${fechaMobiliario} | Forma de pago: ${formaPagoMobiliario}`);
            }

            mobiliarioHtml = `
                <h4 class="text-lg font-semibold mt-6 mb-2 text-gray-800">Mobiliario Pagado:</h4>
                <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                    <ul class="list-disc list-inside space-y-1">
                        ${mobiliarioItems.map(m => `<li class="text-green-800">${m}</li>`).join('')}
                    </ul>
                    <p class="mt-2 font-semibold text-green-800">Total Mobiliario: ${mobiliarioTotal.toFixed(2)}</p>
                </div>
            `;
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
                            <td class="px-4 py-2 text-sm text-green-700 font-bold">${(abono.montoAbonado || 0).toFixed(2)}</td>
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
                    <div class="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <!-- Card Inmueble con Glassmorphism -->
                        <div class="p-4 rounded-xl shadow-md flex items-center space-x-4 transition-transform duration-300 hover:scale-[1.02]" 
                             style="background: rgba(59, 130, 246, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.2);">
                            <div class="p-3 rounded-full text-blue-600 shadow-sm" style="background: rgba(255, 255, 255, 0.8);">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Inmueble</p>
                                <p class="text-xl font-black text-gray-800 leading-tight">${nombreInmueble}</p>
                            </div>
                        </div>

                        <!-- Card Inquilino con Glassmorphism -->
                        <div class="p-4 rounded-xl shadow-md flex items-center space-x-4 transition-transform duration-300 hover:scale-[1.02]" 
                             style="background: rgba(147, 51, 234, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(147, 51, 234, 0.2);">
                            <div class="p-3 rounded-full text-purple-600 shadow-sm" style="background: rgba(255, 255, 255, 0.8);">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-purple-600 uppercase tracking-wider mb-0.5">Inquilino</p>
                                <p class="text-xl font-black text-gray-800 leading-tight">${nombreInquilino}</p>
                            </div>
                        </div>
                    </div>
                    <div><strong>Mes Correspondiente:</strong> <span>${pago.mesCorrespondiente}</span></div>
                    <div><strong>Año Correspondiente:</strong> <span>${pago.anioCorrespondiente}</span></div>
                    <div><strong>Monto Total:</strong> <span class="text-green-700 font-bold">${(pago.montoTotal || 0).toFixed(2)}</span></div>
                    <div><strong>Monto Pagado:</strong> <span class="text-green-700 font-bold">${(pago.montoPagado || 0).toFixed(2)}</span></div>
                    <div><strong>Saldo Pendiente:</strong> <span class="text-red-700 font-bold">${(pago.saldoPendiente || 0).toFixed(2)}</span></div>
                    <div><strong>Estado:</strong> <span class="inline-block px-3 py-1 rounded-full font-semibold ${pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : pago.estado === 'pendiente' ? 'bg-orange-100 text-orange-800' : pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${pago.estado}</span></div>
                    <div><strong>Fecha de Registro:</strong> <span>${pago.fechaRegistro}</span></div>
                    <div><strong>Forma de Pago:</strong> <span>${pago.formaPago || 'N/A'}</span></div>
                    <div><strong>Propietario:</strong> <span>${nombrePropietario}</span></div>
                </div>
                ${serviciosHtml}
                ${mobiliarioHtml}
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
        const inquilinoData = inquilinoDoc.exists() ? inquilinoDoc.data() : null;
        const nombreInquilino = inquilinoData ? inquilinoData.nombre : 'Inquilino Desconocido';

        // Verificar si el inquilino tiene servicios asignados
        const tieneServicios = inquilinoData && inquilinoData.pagaServicios &&
            ((inquilinoData.servicios && Array.isArray(inquilinoData.servicios) && inquilinoData.servicios.length > 0) ||
                (inquilinoData.tipoServicio && inquilinoData.montoServicio));

        // Verificar si el inquilino tiene inmueble asignado
        const tieneInmueble = inquilinoData && inquilinoData.inmuebleAsociadoId;
        const inmuebleAsociado = tieneInmueble ? inmueblesMap.get(inquilinoData.inmuebleAsociadoId) || 'Inmueble Desconocido' : 'Sin inmueble asignado';

        // Obtener el mes y año actual para verificar pagos pendientes
        const fechaActual = new Date();
        const mesActual = fechaActual.getMonth(); // 0-11
        const anioActual = fechaActual.getFullYear();
        const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const mesActualNombre = mesesNombres[mesActual];

        // Verificar si hay pago para el mes actual
        let pagoMesActual = null;
        if (pagosSnap.size > 0) {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                if (pago.mesCorrespondiente === mesActualNombre && pago.anioCorrespondiente === anioActual) {
                    pagoMesActual = { id: doc.id, ...pago };
                }
            });
        }

        // Información de servicios
        let serviciosInfo = '';
        if (tieneServicios) {
            serviciosInfo = `
                <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-blue-700">
                                Este inquilino tiene servicios asignados. 
                                ${pagoMesActual ?
                    (pagoMesActual.serviciosPagados ?
                        '<span class="font-semibold text-green-600">Servicios pagados para el mes actual.</span>' :
                        '<span class="font-semibold text-red-600">Servicios pendientes de pago para el mes actual.</span>') :
                    '<span class="font-semibold text-red-600">No hay registro de pago para el mes actual.</span>'}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Información de inmueble
        let inmuebleInfo = '';
        if (tieneInmueble) {
            inmuebleInfo = `
                <div class="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-green-700">
                                Inmueble asignado: <span class="font-semibold">${inmuebleAsociado}</span>
                                ${pagoMesActual ?
                    (pagoMesActual.estado === 'pagado' ?
                        '<span class="ml-2 font-semibold text-green-600">Renta pagada para el mes actual.</span>' :
                        '<span class="ml-2 font-semibold text-red-600">Renta pendiente o parcial para el mes actual.</span>') :
                    '<span class="ml-2 font-semibold text-red-600">No hay registro de pago para el mes actual.</span>'}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInquilino}</h3>
            
            ${inmuebleInfo}
            ${serviciosInfo}
            
            <div class="overflow-x-auto no-hover-effect">
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
                                Servicios
                            </th>
                            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Mobiliario
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
                            <td colspan="9" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inquilino.
                            </td>
                        </tr>
            `;
        } else {
            // Ordenar pagos por fecha (más reciente primero)
            const pagosOrdenados = [];
            pagosSnap.forEach(doc => {
                pagosOrdenados.push({ id: doc.id, ...doc.data() });
            });

            pagosOrdenados.sort((a, b) => {
                const mesA = mesesNombres.indexOf(a.mesCorrespondiente);
                const mesB = mesesNombres.indexOf(b.mesCorrespondiente);
                if (a.anioCorrespondiente !== b.anioCorrespondiente) {
                    return b.anioCorrespondiente - a.anioCorrespondiente;
                }
                return mesB - mesA;
            });

            pagosOrdenados.forEach(pago => {
                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    // Ordenar abonos por fecha para mostrarlos cronológicamente
                    pago.abonos.sort((a, b) => new Date(a.fechaAbono) - new Date(b.fechaAbono));
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
                    });
                    abonosDetalleHtml += `</ul>`;
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-500">Sin abonos</span>`;
                }

                // Verificar servicios pagados
                let serviciosHtml = '';
                if (pago.serviciosPagados) {
                    const servicios = [];
                    if (pago.serviciosPagados.internet) servicios.push(`Internet: ${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                    if (pago.serviciosPagados.agua) servicios.push(`Agua: ${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                    if (pago.serviciosPagados.luz) servicios.push(`Luz: ${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);

                    if (servicios.length > 0) {
                        serviciosHtml = `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Pagados
                            </span>
                            <ul class="list-disc list-inside text-xs text-gray-700 mt-1">
                                ${servicios.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        `;
                    } else {
                        serviciosHtml = `<span class="text-xs text-gray-500">Sin servicios</span>`;
                    }
                } else if (tieneServicios) {
                    serviciosHtml = `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Pendientes
                        </span>
                    `;
                } else {
                    serviciosHtml = `<span class="text-xs text-gray-500">N/A</span>`;
                }

                // Verificar mobiliario pagado
                let mobiliarioHtml = '';
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
                    let mobiliarioTotal = 0;
                    pago.mobiliarioPagado.forEach(item => {
                        mobiliarioTotal += item.costo || 0;
                    });
                    mobiliarioHtml = `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Pagado
        </span>
        <p class="text-xs text-gray-700 mt-1">Total: ${mobiliarioTotal.toFixed(2)}</p>
    `;
                } else {
                    mobiliarioHtml = `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Pendiente
        </span>
    `;
                }

                // Resaltar el mes actual
                const esMesActual = pago.mesCorrespondiente === mesActualNombre && pago.anioCorrespondiente === anioActual;
                const claseFila = esMesActual ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50';

                historialPagosHtml += `
                            <tr class="${claseFila}">
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap ${esMesActual ? 'font-bold' : ''}">${pago.mesCorrespondiente} / ${pago.anioCorrespondiente} ${esMesActual ? '(Actual)' : ''}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${serviciosHtml}
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${mobiliarioHtml}
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
        const inquilinosDataMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosDataMap.set(doc.id, doc.data());
        });
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        const nombreInmuebleReal = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';

        let historialPagosHtml = `
            <h3 class="text-xl font-semibold mb-4">Historial de Pagos de ${nombreInmuebleReal}</h3>
            <div class="overflow-x-auto no-hover-effect">
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
                                Mobiliario
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
                            <td colspan="8" class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                No hay pagos registrados para este inmueble.
                            </td>
                        </tr>
            `;
        } else {
            pagosSnap.forEach(doc => {
                const pago = doc.data();
                const inquilinoData = inquilinosDataMap.get(pago.inquilinoId);
                const tieneMobiliario = inquilinoData && inquilinoData.mobiliarioAsignado && Array.isArray(inquilinoData.mobiliarioAsignado) && inquilinoData.mobiliarioAsignado.length > 0;

                let mobiliarioHtml = '';
                if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado) && pago.mobiliarioPagado.length > 0) {
                    mobiliarioHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Pagado</span>`;
                } else if (tieneMobiliario) {
                    mobiliarioHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pendiente</span>`;
                } else {
                    mobiliarioHtml = '-';
                }

                let abonosDetalleHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml += `<ul class="list-disc list-inside text-xs text-gray-700">`;
                    pago.abonos.forEach(abono => {
                        abonosDetalleHtml += `<li>${(abono.montoAbonado || 0).toFixed(2)} (${abono.fechaAbono})</li>`;
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
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.montoTotal || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.montoPagado || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p class="text-gray-900 whitespace-no-wrap">${(pago.saldoPendiente || 0).toFixed(2)}</p>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span class="relative inline-block px-3 py-1 font-semibold leading-tight">
                                        <span aria-hidden="true" class="absolute inset-0 ${pago.estado === 'pagado' ? 'bg-green-200' : pago.estado === 'pendiente' ? 'bg-orange-200' : pago.estado === 'vencido' ? 'bg-red-200' : 'bg-yellow-200'} opacity-50 rounded-full"></span>
                                        <span class="relative text-gray-900">${pago.estado}</span>
                                    </span>
                                </td>
                                <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    ${mobiliarioHtml}
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
            const fechaVencimiento = new Date(anioPago, mesPagoNumero + 1, 0); // DÃ­a 0 del mes siguiente es el último día del mes actual
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

// Función auxiliar para eliminar documentos y mantener la vista actual
export async function eliminarDocumento(coleccion, id, callbackRefresh) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');

            // Si estamos en la vista de pagos, mostrar la tabla de pagos directamente
            if (coleccion === 'pagos') {
                mostrarPagos(true); // Parámetro true para mostrar la tabla en lugar de los botones
            } else if (callbackRefresh) {
                callbackRefresh();
            }

        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

// Esta función ya está definida anteriormente en el archivo

/**
 * Devuelve los meses (mes/año) que un inquilino debe desde su ocupación hasta el mes actual.
 * Solo considera los meses a partir de la fecha de ocupación.
 * @param {string} inquilinoId
 * @param {string} inmuebleId
 * @param {Date} fechaOcupacion
 * @returns {Promise<Array<{mes: string, anio: number, montoTotal: number, serviciosPendientes: boolean}>>}
 */
export async function obtenerMesesAdeudadosHistorico(inquilinoId, inmuebleId, fechaOcupacion) {
    try {
        const mesesNombres = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalize 'hoy' to start of day for accurate comparison

        // Validar fecha de ocupación
        if (!fechaOcupacion || isNaN(fechaOcupacion.getTime())) {
            console.error("Fecha de ocupación inválida:", fechaOcupacion);
            return [];
        }

        // Obtener información del inquilino para verificar servicios
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        const inquilinoData = inquilinoDoc.exists() ? inquilinoDoc.data() : null;
        const tieneServicios = inquilinoData && inquilinoData.pagaServicios &&
            ((inquilinoData.servicios && Array.isArray(inquilinoData.servicios) && inquilinoData.servicios.length > 0) ||
                (inquilinoData.tipoServicio && inquilinoData.montoServicio));

        // FIX: Determine the end date for debt calculation
        const fechaFinCalculo = inquilinoData && inquilinoData.fechaDesocupacion ? new Date(inquilinoData.fechaDesocupacion) : hoy;
        fechaFinCalculo.setHours(0, 0, 0, 0);

        // Obtener el inmueble para conocer el monto de renta
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        const montoRenta = inmuebleDoc.exists() ? (inmuebleDoc.data().rentaMensual || 0) : 0;

        // Trae todos los pagos del inquilino/inmueble una sola vez
        const pagosQuery = query(
            collection(db, "pagos"),
            where("inquilinoId", "==", inquilinoId),
            where("inmuebleId", "==", inmuebleId)
        );
        const pagosSnap = await getDocs(pagosQuery);
        const pagosList = [];
        pagosSnap.forEach(doc => {
            pagosList.push({ ...doc.data(), id: doc.id });
        });

        // Mes y año de ocupación
        const fechaOcupacionObj = new Date(fechaOcupacion);
        const diaDePago = fechaOcupacionObj.getDate(); // Use this as the payment day
        const mesOcupacion = fechaOcupacionObj.getMonth();
        const anioOcupacion = fechaOcupacionObj.getFullYear();

        // Mes y año de fin de cálculo
        const mesFin = fechaFinCalculo.getMonth();
        const anioFin = fechaFinCalculo.getFullYear();

        let mesesPendientes = [];

        // Start iteration from the month of occupation
        let currentIterMonth = mesOcupacion;
        let currentIterYear = anioOcupacion;
        const anioActual = hoy.getFullYear();
        const mesActual = hoy.getMonth();

        // Loop through months from occupation date up to the end date
        while (currentIterYear < anioFin || (currentIterYear === anioFin && currentIterMonth <= mesFin)) {
            const nombreMes = mesesNombres[currentIterMonth];

            // Check if this is the current month being processed
            const esMesActualIteracion = currentIterMonth === mesActual && currentIterYear === anioActual;

            // Only check for debts from occupation month onwards
            const isBeforeOccupationMonth = currentIterYear < anioOcupacion ||
                (currentIterYear === anioOcupacion &&
                    currentIterMonth < mesOcupacion);

            if (!isBeforeOccupationMonth) {
                // Search payments for this month/year
                const pagosMes = pagosList.filter(p =>
                    p.mesCorrespondiente &&
                    p.anioCorrespondiente &&
                    p.mesCorrespondiente.toString().trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') === nombreMes.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') &&
                    Number(p.anioCorrespondiente) === currentIterYear
                );

                let pagado = false;
                let serviciosPagados = false;

                pagosMes.forEach(pago => {
                    if (typeof pago.estado === "string" && pago.estado.trim().toLowerCase() === "pagado") {
                        pagado = true;
                    }

                    if (tieneServicios && pago.serviciosPagados) {
                        const tieneServiciosPagados = pago.serviciosPagados.internet ||
                            pago.serviciosPagados.agua ||
                            pago.serviciosPagados.luz;
                        if (tieneServiciosPagados) {
                            serviciosPagados = true;
                        }
                    }
                });

                // Apply the payment day logic for the current month being iterated
                const shouldConsiderRentDebt = !esMesActualIteracion || (esMesActualIteracion && hoy.getDate() >= diaDePago);
                const shouldConsiderServiceDebt = !esMesActualIteracion || (esMesActualIteracion && hoy.getDate() >= diaDePago);

                let adeudoRenta = false;
                let adeudoServicios = false;

                if (shouldConsiderRentDebt && !pagado) {
                    adeudoRenta = true;
                }

                if (shouldConsiderServiceDebt && tieneServicios && !serviciosPagados) {
                    adeudoServicios = true;
                }

                if (adeudoRenta || adeudoServicios) {
                    mesesPendientes.push({
                        mes: nombreMes,
                        anio: currentIterYear,
                        montoTotal: montoRenta, // This is rent amount, services are separate
                        rentaPendiente: adeudoRenta,
                        serviciosPendientes: adeudoServicios
                    });
                }
            }

            // Move to the next month
            currentIterMonth++;
            if (currentIterMonth > 11) {
                currentIterMonth = 0;
                currentIterYear++;
            }
        }

        return mesesPendientes;
    } catch (error) {
        console.error("Error en obtenerMesesAdeudadosHistorico:", error);
        return [];
    }
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
 * Genera el HTML para mostrar la información del mobiliario en la tabla de pagos
 * @param {Object} pago - Objeto con la información del pago
 * @returns {string} - HTML para mostrar el mobiliario
 */
function generarMobiliarioHtml(pago) {
    // Calcular total de mobiliario
    let mobiliarioTotal = 0;
    if (pago.mobiliarioPagado && Array.isArray(pago.mobiliarioPagado)) {
        pago.mobiliarioPagado.forEach(item => {
            mobiliarioTotal += item.costo || 0;
        });
        // Mostrar "Pagado" si hay elementos en el array, aunque el total sea 0
        if (pago.mobiliarioPagado.length > 0) {
            return `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Pagado
                </span>
                <p class="text-xs text-gray-700 mt-1">Total: ${mobiliarioTotal.toFixed(2)}</p>
            `;
        }
    }
    // Si no hay mobiliario pagado, mostrar pendiente
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pendiente</span>`;
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
        document.getElementById('serviciointernet').addEventListener('change', function () {
            document.getElementById('montointernet').disabled = !this.checked;
        });

        document.getElementById('servicioagua').addEventListener('change', function () {
            document.getElementById('montoagua').disabled = !this.checked;
        });

        document.getElementById('servicioluz').addEventListener('change', function () {
            document.getElementById('montoluz').disabled = !this.checked;
        });

        // Manejar eliminación de servicios
        document.querySelectorAll('.btn-eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', async function () {
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
            const nuevoServicios = {
                // Agregar fecha y forma de pago específicas para servicios
                fechaRegistroServicio: fechaRegistro,
                formaPagoServicio: formaPago
            };

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
            btn.addEventListener('click', async function () {
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

function cerrarModalDePago(callback = null) {
    if (window.vieneDeAdeudos) {
        mostrarModal(window.adeudosModalContent);
        window.vieneDeAdeudos = false; // Reset flag
    } else {
        ocultarModal();
        if (callback) {
            callback();
        }
    }
}
window.cerrarModalDePago = cerrarModalDePago;

/**
 * Consolidar pagos antiguos asignando periodoInicio y periodoFin basados en un día de corte.
 * Esto "congela" los recibos históricos para que no cambien si se edita el inquilino.
 * @param {string} inquilinoId - ID del inquilino.
 * @param {number} diaCorte - Día del mes (1-31) que se usaba antes del cambio.
 */
export async function consolidarPagosAntiguos(inquilinoId, diaCorte) {
    try {
        const pagosQuery = query(collection(db, "pagos"), where("inquilinoId", "==", inquilinoId));
        const pagosSnap = await getDocs(pagosQuery);
        let cont = 0;

        for (const docSnap of pagosSnap.docs) {
            const pago = docSnap.data();

            // Solo procesamos si NO tiene ya periodo asignado (para no sobreescribir repetidamente)
            if (!pago.periodoInicio || !pago.periodoFin) {
                if (pago.mesCorrespondiente && pago.anioCorrespondiente) {
                    const meses = [
                        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                    ];
                    const mesPagoIdx = meses.findIndex(m => m.toLowerCase() === pago.mesCorrespondiente.toLowerCase());
                    const anioPago = parseInt(pago.anioCorrespondiente);

                    if (mesPagoIdx !== -1) {
                        // Fecha inicio: día de corte, mes/año del pago
                        const fechaInicioObj = new Date(anioPago, mesPagoIdx, diaCorte);

                        // Fecha fin: un día antes del mismo día del mes siguiente
                        let mesFinVal = mesPagoIdx + 1;
                        let anioFinVal = anioPago;
                        if (mesFinVal > 11) { mesFinVal = 0; anioFinVal++; }
                        const fechaFinObj = new Date(anioFinVal, mesFinVal, diaCorte);
                        fechaFinObj.setDate(fechaFinObj.getDate() - 1);

                        const opciones = { day: '2-digit', month: 'long', year: 'numeric' };
                        const periodoInicio = fechaInicioObj.toLocaleDateString('es-MX', opciones);
                        const periodoFin = fechaFinObj.toLocaleDateString('es-MX', opciones);

                        await updateDoc(doc(db, "pagos", docSnap.id), {
                            periodoInicio: periodoInicio,
                            periodoFin: periodoFin
                        });
                        cont++;
                    }
                }
            }
        }
        return cont;
    } catch (error) {
        console.error("Error consolidando pagos:", error);
        throw error;
    }
}
