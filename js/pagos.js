// js/pagos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

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
            pagosList.push({...doc.data(), id: doc.id});
        });

        // Mes y año de ocupación
        const mesOcupacion = fechaOcupacion.getMonth();
        const anioOcupacion = fechaOcupacion.getFullYear();
        
        // Mes y año actual
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        
        let mesesPendientes = [];
        
        // Iterar desde el mes de ocupación hasta el mes actual
        for (let anio = anioOcupacion; anio <= anioActual; anio++) {
            // Determinar mes inicial y final para este año
            const mesInicial = (anio === anioOcupacion) ? mesOcupacion : 0;
            const mesFinal = (anio === anioActual) ? mesActual : 11;
            
            for (let mes = mesInicial; mes <= mesFinal; mes++) {
                const nombreMes = mesesNombres[mes];
                
                // Buscar pagos para este mes/año
                const pagosMes = pagosList.filter(p => 
                    p.mesCorrespondiente && 
                    p.anioCorrespondiente &&
                    p.mesCorrespondiente.toString().trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') === nombreMes.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '') &&
                    Number(p.anioCorrespondiente) === anio
                );
                
                // Verificar si hay algún pago con estado "pagado"
                let pagado = false;
                let serviciosPagados = false;
                
                pagosMes.forEach(pago => {
                    if (typeof pago.estado === "string" && pago.estado.trim().toLowerCase() === "pagado") {
                        pagado = true;
                    }
                    
                    // Verificar si los servicios están pagados
                    if (tieneServicios && pago.serviciosPagados) {
                        const tieneServiciosPagados = pago.serviciosPagados.internet || 
                                                    pago.serviciosPagados.agua || 
                                                    pago.serviciosPagados.luz;
                        if (tieneServiciosPagados) {
                            serviciosPagados = true;
                        }
                    }
                });
                
                // Si no está pagado, agregar a la lista de meses pendientes
                if (!pagado) {
                    mesesPendientes.push({
                        mes: nombreMes,
                        anio: anio,
                        montoTotal: montoRenta,
                        serviciosPendientes: tieneServicios && !serviciosPagados
                    });
                }
            }
        }
        
        return mesesPendientes;
    } catch (error) {
        console.error("Error en obtenerMesesAdeudadosHistorico:", error);
        return [];
    }
}

/**
 * Muestra la sección principal de pagos.
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
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInquilino = inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido';
            const nombreInmueble = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
            pagosList.push({ id: doc.id, ...data, nombreInquilino, nombreInmueble });
        });

        // Ordenar por fecha de registro (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let tarjetasPagosHtml = "";
        if (pagosList.length === 0) {
            tarjetasPagosHtml = `
                <div class="col-span-full">
                    <div class="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <p class="text-gray-500 text-lg mb-6">No hay pagos registrados.</p>
                        <button onclick="mostrarFormularioNuevoPago()"
                            class="bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700
                            text-white font-medium px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 
                            flex items-center justify-center mx-auto border border-emerald-400/30">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Registrar Nuevo Pago
                        </button>
                    </div>
                </div>`;
        } else {
            tarjetasPagosHtml = pagosList.map(pago => {
                const estadoClass = pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : 
                                   pago.estado === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 
                                   pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600';

                // Servicios pagados
                let serviciosPagadosHtml = '';
                if (pago.serviciosPagados) {
                    const servicios = [];
                    if (pago.serviciosPagados.internet) servicios.push(`Internet: $${(pago.serviciosPagados.internetMonto || 0).toFixed(2)}`);
                    if (pago.serviciosPagados.agua) servicios.push(`Agua: $${(pago.serviciosPagados.aguaMonto || 0).toFixed(2)}`);
                    if (pago.serviciosPagados.luz) servicios.push(`Luz: $${(pago.serviciosPagados.luzMonto || 0).toFixed(2)}`);
                    
                    if (servicios.length > 0) {
                        serviciosPagadosHtml = `
                            <div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 class="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                                    <svg class="w-4 h-4 mr-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                    </svg>
                                    Servicios Incluidos
                                </h4>
                                <div class="text-xs text-blue-700 space-y-1">
                                    ${servicios.map(servicio => `<div>• ${servicio}</div>`).join('')}
                                </div>
                            </div>
                        `;
                    }
                }

                // Historial de abonos
                let historialAbonosHtml = '';
                if (pago.abonos && pago.abonos.length > 0) {
                    pago.abonos.sort((a, b) => (b.fechaAbono || '').localeCompare(a.fechaAbono || ''));
                    historialAbonosHtml = `
                        <div class="mt-4 border-t border-gray-200 pt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-semibold text-sm text-gray-700 flex items-center">
                                    <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                    Historial de abonos
                                </h4>
                                <span class="text-xs text-gray-500">${pago.abonos.length} abono(s)</span>
                            </div>
                            <div class="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                                ${pago.abonos.map(abono => `
                                    <div class="bg-gray-50 rounded-lg p-2.5 text-xs border border-gray-100">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium text-gray-700">$${parseFloat(abono.montoAbonado).toFixed(2)}</span>
                                            <span class="text-gray-500">${abono.fechaAbono}</span>
                                        </div>
                                        ${abono.origen ? `<div class="text-gray-500 text-xs mt-1">Origen: ${abono.origen}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100">
                        <div class="p-4 sm:p-5 md:p-6">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-1">${pago.nombreInquilino}</h3>
                                    <p class="text-sm text-indigo-600 font-medium mb-2">${pago.nombreInmueble}</p>
                                    <div class="flex items-center space-x-2 mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoClass}">
                                            ${pago.estado}
                                        </span>
                                        <span class="text-sm text-gray-500">${pago.mesCorrespondiente} ${pago.anioCorrespondiente}</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm text-gray-600">Monto Total</div>
                                    <div class="text-lg font-semibold text-gray-800">$${parseFloat(pago.montoTotal).toFixed(2)}</div>
                                </div>
                            </div>

                            <div class="mt-4 grid grid-cols-2 gap-4">
                                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                    <div class="text-sm text-green-600">Pagado</div>
                                    <div class="text-lg font-bold text-green-700">$${parseFloat(pago.montoPagado || 0).toFixed(2)}</div>
                                </div>
                                <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                                    <div class="text-sm text-red-600">Pendiente</div>
                                    <div class="text-lg font-bold text-red-700">$${parseFloat(pago.saldoPendiente || 0).toFixed(2)}</div>
                                </div>
                            </div>

                            ${serviciosPagadosHtml}
                            ${historialAbonosHtml}

                            <div class="mt-4 flex flex-wrap gap-2 sm:gap-3">
                                <button onclick="mostrarFormularioRegistrarAbono('${pago.id}')"
                                        class="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-emerald-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                    </svg>
                                    Abonar
                                </button>
                                <button onclick="editarPago('${pago.id}')"
                                        class="flex-1 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-indigo-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Editar
                                </button>
                                <button onclick="generarReciboPDF('${pago.id}')"
                                        class="flex-1 bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-purple-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    PDF
                                </button>
                                <button onclick="eliminarDocumento('pagos', '${pago.id}', mostrarPagos)"
                                        class="flex-1 bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-rose-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        contenedor.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
                        <svg class="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        Gestión de Pagos
                    </h2>
                    <button onclick="mostrarFormularioNuevoPago()"
                            class="mt-4 sm:mt-0 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700
                            text-white font-medium px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 
                            flex items-center justify-center border border-emerald-400/30">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Registrar Nuevo Pago
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    ${tarjetasPagosHtml}
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar los pagos:", error);
        mostrarNotificacion("Error al cargar los pagos.", 'error');
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error al cargar los pagos: ${error.message}</p>`;
    }
}

/**
 * Muestra el formulario para registrar un nuevo pago o editar uno existente.
 * @param {string} [id=null] - ID del pago a editar. Si es null, es un nuevo pago.
 */
export async function mostrarFormularioNuevoPago(id = null) {
    let titulo = "Registrar Nuevo Pago";
    let pago = { inquilinoId: '', inmuebleId: '', montoTotal: '', mesCorrespondiente: '', anioCorrespondiente: '', estado: 'pendiente' };
    let inquilinosList = [];
    let inmueblesList = [];

    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            if (data.activo) { // Solo inquilinos activos
                inquilinosList.push({ id: doc.id, ...data });
            }
        });

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        inmueblesSnap.forEach(doc => {
            inmueblesList.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        mostrarNotificacion("Error al cargar inquilinos e inmuebles disponibles.", 'error');
        return;
    }

    if (id) {
        titulo = "Editar Pago";
        try {
            const docSnap = await getDoc(doc(db, "pagos", id));
            if (docSnap.exists()) {
                pago = { id: docSnap.id, ...docSnap.data() };
            } else {
                mostrarNotificacion("Pago no encontrado.", 'error');
                return;
            }
        } catch (error) {
            mostrarNotificacion("Error al cargar datos del pago para editar.", 'error');
            return;
        }
    }

    const inquilinosOptions = inquilinosList.map(inc => `<option value="${inc.id}" ${inc.id === pago.inquilinoId ? 'selected' : ''}>${inc.nombre}</option>`).join('');
    const inmueblesOptions = inmueblesList.map(inm => `<option value="${inm.id}" ${inm.id === pago.inmuebleId ? 'selected' : ''}>${inm.nombre}</option>`).join('');

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mesesOptions = meses.map(mes => `<option value="${mes}" ${mes === pago.mesCorrespondiente ? 'selected' : ''}>${mes}</option>`).join('');

    const anioActual = new Date().getFullYear();
    const aniosOptions = Array.from({length: 5}, (_, i) => anioActual - 2 + i)
        .map(anio => `<option value="${anio}" ${anio == pago.anioCorrespondiente ? 'selected' : ''}>${anio}</option>`).join('');

    const formHtml = `
        <div class="px-6 py-5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6 shadow-md">
            <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                ${titulo}
            </h3>
        </div>
        <form id="formPago" class="space-y-5 max-w-lg mx-auto px-4">
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="inquilinoId" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            Inquilino:
                        </label>
                        <select id="inquilinoId"
                                class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required>
                            <option value="">-- Seleccionar Inquilino --</option>
                            ${inquilinosOptions}
                        </select>
                    </div>
                    <div>
                        <label for="inmuebleId" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            Inmueble:
                        </label>
                        <select id="inmuebleId"
                                class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required>
                            <option value="">-- Seleccionar Inmueble --</option>
                            ${inmueblesOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="mesCorrespondiente" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Mes:
                        </label>
                        <select id="mesCorrespondiente"
                                class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required>
                            <option value="">-- Seleccionar Mes --</option>
                            ${mesesOptions}
                        </select>
                    </div>
                    <div>
                        <label for="anioCorrespondiente" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Año:
                        </label>
                        <select id="anioCorrespondiente"
                                class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required>
                            <option value="">-- Seleccionar Año --</option>
                            ${aniosOptions}
                        </select>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="space-y-4">
                    <div>
                        <label for="montoTotal" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Monto Total:
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">$</span>
                            <input type="number"
                                   id="montoTotal"
                                   value="${pago.montoTotal}"
                                   class="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                   step="0.01"
                                   required
                                   min="0.01"
                                   placeholder="0.00">
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button type="button"
                        onclick="ocultarModal()"
                        class="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center border border-gray-200">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cancelar
                </button>
                <button type="submit"
                        class="w-full sm:w-auto px-5 py-3 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                        text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border border-indigo-400/30">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Guardar
                </button>
            </div>
        </form>
    `;

    mostrarModal(formHtml);

    const formPago = document.getElementById('formPago');
    if (formPago) {
        formPago.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inquilinoId = document.getElementById('inquilinoId').value;
            const inmuebleId = document.getElementById('inmuebleId').value;
            const montoTotal = parseFloat(document.getElementById('montoTotal').value);
            const mesCorrespondiente = document.getElementById('mesCorrespondiente').value;
            const anioCorrespondiente = document.getElementById('anioCorrespondiente').value;
            const fechaRegistro = id ? pago.fechaRegistro : new Date().toISOString().split('T')[0];

            const pagoData = {
                inquilinoId,
                inmuebleId,
                montoTotal,
                mesCorrespondiente,
                anioCorrespondiente,
                fechaRegistro,
                montoPagado: id ? pago.montoPagado : 0,
                saldoPendiente: id ? pago.saldoPendiente : montoTotal,
                estado: id ? pago.estado : 'pendiente',
                abonos: id ? pago.abonos : []
            };

            try {
                if (id) {
                    await updateDoc(doc(db, "pagos", id), pagoData);
                    mostrarNotificacion("Pago actualizado con éxito.", 'success');
                } else {
                    await addDoc(collection(db, "pagos"), pagoData);
                    mostrarNotificacion("Pago registrado con éxito.", 'success');
                }
                ocultarModal();
                mostrarPagos();
            } catch (err) {
                mostrarNotificacion("Error al guardar el pago.", 'error');
            }
        });
    }
}

/**
 * Función para editar un pago, mostrando el formulario.
 * @param {string} id - ID del pago a editar.
 */
export async function editarPago(id) {
    mostrarFormularioNuevoPago(id);
}

/**
 * Muestra el formulario para registrar un abono a un pago existente.
 * @param {string} pagoId - ID del pago al cual se le registrará el abono.
 */
export async function mostrarFormularioRegistrarAbono(pagoId) {
    try {
        const pagoDoc = await getDoc(doc(db, "pagos", pagoId));
        if (!pagoDoc.exists()) {
            mostrarNotificacion("Pago no encontrado.", 'error');
            return;
        }

        const pago = pagoDoc.data();
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", pago.inquilinoId));
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", pago.inmuebleId));
        
        const nombreInquilino = inquilinoDoc.exists() ? inquilinoDoc.data().nombre : 'Inquilino Desconocido';
        const nombreInmueble = inmuebleDoc.exists() ? inmuebleDoc.data().nombre : 'Inmueble Desconocido';

        const formHtml = `
            <div class="px-6 py-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6 shadow-md">
                <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Registrar Abono
                </h3>
            </div>
            <div class="space-y-5 max-w-lg mx-auto px-4">
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Información del Pago
                    </h4>
                    <div class="space-y-2 text-sm">
                        <p><span class="font-medium text-gray-700">Inquilino:</span> ${nombreInquilino}</p>
                        <p><span class="font-medium text-gray-700">Inmueble:</span> ${nombreInmueble}</p>
                        <p><span class="font-medium text-gray-700">Período:</span> ${pago.mesCorrespondiente} ${pago.anioCorrespondiente}</p>
                        <p><span class="font-medium text-gray-700">Monto Total:</span> $${parseFloat(pago.montoTotal).toFixed(2)}</p>
                        <p><span class="font-medium text-gray-700">Pagado:</span> $${parseFloat(pago.montoPagado || 0).toFixed(2)}</p>
                        <p><span class="font-medium text-gray-700">Saldo Pendiente:</span> $${parseFloat(pago.saldoPendiente || 0).toFixed(2)}</p>
                    </div>
                </div>

                <form id="formAbono" class="space-y-4">
                    <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                        <div class="space-y-4">
                            <div>
                                <label for="montoAbono" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                                    <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Monto del Abono:
                                </label>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">$</span>
                                    <input type="number"
                                           id="montoAbono"
                                           class="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                           step="0.01"
                                           required
                                           min="0.01"
                                           max="${pago.saldoPendiente || 0}"
                                           placeholder="0.00">
                                </div>
                            </div>
                            <div>
                                <label for="fechaAbono" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                                    <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    Fecha del Abono:
                                </label>
                                <input type="date"
                                       id="fechaAbono"
                                       value="${new Date().toISOString().split('T')[0]}"
                                       class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                                       required>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                        <button type="button"
                                onclick="ocultarModal()"
                                class="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center border border-gray-200">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                            Cancelar
                        </button>
                        <button type="submit"
                                class="w-full sm:w-auto px-5 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                                text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center border border-emerald-400/30">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Registrar Abono
                        </button>
                    </div>
                </form>
            </div>
        `;

        mostrarModal(formHtml);

        const formAbono = document.getElementById('formAbono');
        if (formAbono) {
            formAbono.addEventListener('submit', async (e) => {
                e.preventDefault();

                const montoAbono = parseFloat(document.getElementById('montoAbono').value);
                const fechaAbono = document.getElementById('fechaAbono').value;

                if (montoAbono > pago.saldoPendiente) {
                    mostrarNotificacion("El monto del abono no puede ser mayor al saldo pendiente.", 'error');
                    return;
                }

                try {
                    const nuevoMontoPagado = (pago.montoPagado || 0) + montoAbono;
                    const nuevoSaldoPendiente = (pago.saldoPendiente || 0) - montoAbono;
                    let nuevoEstado = 'pendiente';

                    if (nuevoMontoPagado >= pago.montoTotal) {
                        nuevoEstado = 'pagado';
                    } else if (nuevoMontoPagado > 0) {
                        nuevoEstado = 'parcial';
                    }

                    const abonosActuales = pago.abonos || [];
                    abonosActuales.push({
                        montoAbonado: montoAbono,
                        fechaAbono: fechaAbono,
                        origen: 'manual'
                    });

                    await updateDoc(doc(db, "pagos", pagoId), {
                        montoPagado: nuevoMontoPagado,
                        saldoPendiente: nuevoSaldoPendiente,
                        estado: nuevoEstado,
                        abonos: abonosActuales,
                        fechaUltimoAbono: fechaAbono
                    });

                    mostrarNotificacion("Abono registrado con éxito.", 'success');
                    ocultarModal();
                    mostrarPagos();
                } catch (err) {
                    mostrarNotificacion("Error al registrar el abono.", 'error');
                }
            });
        }
    } catch (error) {
        mostrarNotificacion("Error al cargar datos del pago.", 'error');
    }
}

/**
 * Revisa los pagos vencidos y muestra notificaciones.
 */
export async function revisarPagosVencidos() {
    try {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();
        
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const mesActualNombre = meses[mesActual];

        const pagosQuery = query(
            collection(db, "pagos"),
            where("estado", "in", ["pendiente", "parcial"])
        );
        const pagosSnap = await getDocs(pagosQuery);

        let pagosVencidos = 0;
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            const mesPago = pago.mesCorrespondiente;
            const anioPago = parseInt(pago.anioCorrespondiente);
            
            // Verificar si el pago es del mes actual o anterior
            const indiceMesPago = meses.indexOf(mesPago);
            if (anioPago < anioActual || (anioPago === anioActual && indiceMesPago < mesActual)) {
                pagosVencidos++;
                // Actualizar estado a vencido si no lo está ya
                if (pago.estado !== 'vencido') {
                    updateDoc(doc.ref, { estado: 'vencido' });
                }
            }
        });

        if (pagosVencidos > 0) {
            mostrarNotificacion(`Hay ${pagosVencidos} pago(s) vencido(s)`, 'warning', 5000);
        }
    } catch (error) {
        console.error("Error al revisar pagos vencidos:", error);
    }
}

/**
 * Muestra el historial de pagos para un inmueble específico en un modal.
 * @param {string} inmuebleId - ID del inmueble para el cual mostrar el historial.
 * @param {string} inmuebleNombre - Nombre del inmueble.
 */
export async function mostrarHistorialPagosInmueble(inmuebleId, inmuebleNombre) {
    try {
        const inmuebleDoc = await getDoc(doc(db, "inmuebles", inmuebleId));
        if (!inmuebleDoc.exists()) {
            mostrarNotificacion("Inmueble no encontrado.", 'error');
            return;
        }

        const pagosQuery = query(collection(db, "pagos"), where("inmuebleId", "==", inmuebleId));
        const pagosSnap = await getDocs(pagosQuery);

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            inquilinosMap.set(doc.id, doc.data().nombre);
        });

        let pagosList = [];
        let totalPagado = 0;
        let totalPendiente = 0;

        pagosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInquilino = inquilinosMap.get(data.inquilinoId) || 'Inquilino Desconocido';
            pagosList.push({ id: doc.id, ...data, nombreInquilino });
            totalPagado += parseFloat(data.montoPagado || 0);
            totalPendiente += parseFloat(data.saldoPendiente || 0);
        });

        // Ordenar por fecha (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let tablaHistorialHtml = "";
        if (pagosList.length === 0) {
            tablaHistorialHtml = `<tr><td colspan=\"6\" class=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center\">No hay pagos registrados para este inmueble.</td></tr>`;
        } else {
            tablaHistorialHtml = pagosList.map(pago => {
                const estadoClass = pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : 
                                   pago.estado === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 
                                   pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600';

                return `
                    <tr class=\"hover:bg-gray-50\">
                        <td class=\"px-4 py-2 text-sm text-gray-900\">${pago.nombreInquilino}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-700\">${pago.mesCorrespondiente} ${pago.anioCorrespondiente}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.montoTotal).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.montoPagado || 0).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.saldoPendiente || 0).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm\">
                            <span class=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoClass}\">
                                ${pago.estado}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const modalContentHtml = `
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    Historial de Pagos
                </h3>
                <p class="text-center text-indigo-100 mt-1 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    Para: <span class="font-semibold">${inmuebleNombre}</span>
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl shadow-md text-center border border-green-200">
                    <p class="text-sm font-semibold text-green-700 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Total Pagado:
                    </p>
                    <p class="text-2xl font-extrabold text-green-900 mt-1">$${totalPagado.toFixed(2)}</p>
                </div>
                <div class="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl shadow-md text-center border border-red-200">
                    <p class="text-sm font-semibold text-red-700 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Total Pendiente:
                    </p>
                    <p class="text-2xl font-extrabold text-red-900 mt-1">$${totalPendiente.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inquilino</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tablaHistorialHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cerrar
                </button>
            </div>
        `;
        mostrarModal(modalContentHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos:", error);
        mostrarNotificacion("Error al cargar el historial de pagos.", 'error');
    }
}

/**
 * Muestra el historial de pagos para un inquilino específico en un modal.
 * @param {string} inquilinoId - ID del inquilino para el cual mostrar el historial.
 * @param {string} inquilinoNombre - Nombre del inquilino.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId, inquilinoNombre) {
    try {
        const inquilinoDoc = await getDoc(doc(db, "inquilinos", inquilinoId));
        if (!inquilinoDoc.exists()) {
            mostrarNotificacion("Inquilino no encontrado.", 'error');
            return;
        }

        const pagosQuery = query(collection(db, "pagos"), where("inquilinoId", "==", inquilinoId));
        const pagosSnap = await getDocs(pagosQuery);

        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        let pagosList = [];
        let totalPagado = 0;
        let totalPendiente = 0;

        pagosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = inmueblesMap.get(data.inmuebleId) || 'Inmueble Desconocido';
            pagosList.push({ id: doc.id, ...data, nombreInmueble });
            totalPagado += parseFloat(data.montoPagado || 0);
            totalPendiente += parseFloat(data.saldoPendiente || 0);
        });

        // Ordenar por fecha (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        let tablaHistorialHtml = "";
        if (pagosList.length === 0) {
            tablaHistorialHtml = `<tr><td colspan=\"6\" class=\"px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center\">No hay pagos registrados para este inquilino.</td></tr>`;
        } else {
            tablaHistorialHtml = pagosList.map(pago => {
                const estadoClass = pago.estado === 'pagado' ? 'bg-green-100 text-green-800' : 
                                   pago.estado === 'parcial' ? 'bg-yellow-100 text-yellow-800' : 
                                   pago.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600';

                return `
                    <tr class=\"hover:bg-gray-50\">
                        <td class=\"px-4 py-2 text-sm text-gray-900\">${pago.nombreInmueble}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-700\">${pago.mesCorrespondiente} ${pago.anioCorrespondiente}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.montoTotal).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.montoPagado || 0).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm text-gray-900\">$${parseFloat(pago.saldoPendiente || 0).toFixed(2)}</td>
                        <td class=\"px-4 py-2 text-sm\">
                            <span class=\"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoClass}\">
                                ${pago.estado}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        const modalContentHtml = `
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    Historial de Pagos
                </h3>
                <p class="text-center text-indigo-100 mt-1 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Para: <span class="font-semibold">${inquilinoNombre}</span>
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl shadow-md text-center border border-green-200">
                    <p class="text-sm font-semibold text-green-700 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Total Pagado:
                    </p>
                    <p class="text-2xl font-extrabold text-green-900 mt-1">$${totalPagado.toFixed(2)}</p>
                </div>
                <div class="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl shadow-md text-center border border-red-200">
                    <p class="text-sm font-semibold text-red-700 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Total Pendiente:
                    </p>
                    <p class="text-2xl font-extrabold text-red-900 mt-1">$${totalPendiente.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inmueble</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                                <th scope="col" class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tablaHistorialHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" 
                    class="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cerrar
                </button>
            </div>
        `;
        mostrarModal(modalContentHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos:", error);
        mostrarNotificacion("Error al cargar el historial de pagos.", 'error');
    }
}

// Función auxiliar para eliminar documentos, exportada para uso en main.js
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