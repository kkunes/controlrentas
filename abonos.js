// js/abonos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';

/**
 * Muestra la sección principal de abonos/saldos a favor.
 */
export async function mostrarAbonos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        mostrarNotificacion("Error: No se pudo cargar la sección de saldos a favor.", 'error');
        return;
    }

    try {
        const abonosSnap = await getDocs(query(collection(db, "abonosSaldoFavor"), orderBy("fechaAbono", "desc")));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const pagosMap = new Map();

        pagosSnap.forEach(doc => {
            const data = doc.data();
            pagosMap.set(doc.id, {
                mes: data.mesCorrespondiente,
                anio: data.anioCorrespondiente
            });
        });

        // Obtener inmuebles para mostrar junto a los inquilinos
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre || 'Inmueble sin nombre');
        });
        
        // Crear un mapa para buscar inmuebles por nombre también
        const inmueblesNombreMap = new Map();
        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            if (data.nombre) {
                inmueblesNombreMap.set(data.nombre.toLowerCase(), data.nombre);
            }
        });
        
        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            const inquilino = doc.data();
            
            // Verificar todos los posibles campos donde podría estar el ID del inmueble
            let inmuebleId = inquilino.inmuebleId || inquilino.inmuebleAsociadoId || inquilino.idInmueble;
            let inmuebleNombre = null;
            
            // 1. Intentar obtener por ID
            if (inmuebleId && inmueblesMap.has(inmuebleId)) {
                inmuebleNombre = inmueblesMap.get(inmuebleId);
            } 
            // 2. Intentar obtener por campo nombreInmueble
            else if (inquilino.nombreInmueble) {
                inmuebleNombre = inquilino.nombreInmueble;
            }
            // 3. Intentar buscar por coincidencia de nombre
            else if (inquilino.inmueble && typeof inquilino.inmueble === 'string') {
                const nombreLower = inquilino.inmueble.toLowerCase();
                if (inmueblesNombreMap.has(nombreLower)) {
                    inmuebleNombre = inmueblesNombreMap.get(nombreLower);
                } else {
                    inmuebleNombre = inquilino.inmueble; // Usar el nombre directamente
                }
            }
            
            // Si no se encontró de ninguna forma
            if (!inmuebleNombre) {
                inmuebleNombre = 'Sin inmueble asignado';
            }
            
            inquilinosMap.set(doc.id, {
                nombre: inquilino.nombre,
                inmuebleNombre: inmuebleNombre
            });
        });

        let abonosList = [];
        abonosSnap.forEach(doc => {
            const data = doc.data();
            const inquilinoInfo = inquilinosMap.get(data.inquilinoId) || { nombre: 'Inquilino Desconocido', inmuebleNombre: 'Sin inmueble' };
            
            // Si el inmueble aparece como "Sin inmueble asignado", intentar obtenerlo directamente
            let inmuebleNombre = inquilinoInfo.inmuebleNombre;
            if (inmuebleNombre === 'Sin inmueble asignado' || inmuebleNombre === 'Inmueble no encontrado') {
                // Buscar el inquilino directamente para verificar su inmueble
                const inquilinoDoc = inquilinosSnap.docs.find(d => d.id === data.inquilinoId);
                if (inquilinoDoc) {
                    const inquilinoData = inquilinoDoc.data();
                    
                    // 1. Intentar obtener por ID
                    const inmuebleId = inquilinoData.inmuebleId || inquilinoData.inmuebleAsociadoId || inquilinoData.idInmueble;
                    if (inmuebleId && inmueblesMap.has(inmuebleId)) {
                        inmuebleNombre = inmueblesMap.get(inmuebleId);
                    } 
                    // 2. Intentar obtener por campo nombreInmueble
                    else if (inquilinoData.nombreInmueble) {
                        inmuebleNombre = inquilinoData.nombreInmueble;
                    }
                    // 3. Intentar buscar por coincidencia de nombre
                    else if (inquilinoData.inmueble && typeof inquilinoData.inmueble === 'string') {
                        // Buscar por nombre en el mapa de inmuebles
                        for (const [id, nombre] of inmueblesMap.entries()) {
                            if (nombre.toLowerCase() === inquilinoData.inmueble.toLowerCase()) {
                                inmuebleNombre = nombre;
                                break;
                            }
                        }
                        // Si no se encontró, usar el nombre directamente
                        if (inmuebleNombre === 'Sin inmueble asignado' || inmuebleNombre === 'Inmueble no encontrado') {
                            inmuebleNombre = inquilinoData.inmueble;
                        }
                    }
                    
                    // 4. Verificar si hay un campo de inmueble en formato diferente
                    if ((inmuebleNombre === 'Sin inmueble asignado' || inmuebleNombre === 'Inmueble no encontrado') && 
                        inquilinoData.inmuebleAsociado && typeof inquilinoData.inmuebleAsociado === 'object') {
                        // A veces el inmueble está como objeto con nombre
                        if (inquilinoData.inmuebleAsociado.nombre) {
                            inmuebleNombre = inquilinoData.inmuebleAsociado.nombre;
                        }
                    }
                }
            }
            
            abonosList.push({
                id: doc.id,
                ...data,
                nombreInquilino: inquilinoInfo.nombre,
                inmuebleNombre: inmuebleNombre
            });
        });

        // Agrupar abonos por inquilinoId y guardar el id del abono activo más reciente
        const abonosPorInquilino = new Map();
        abonosList.forEach(abono => {
            if (!abonosPorInquilino.has(abono.inquilinoId)) {
                abonosPorInquilino.set(abono.inquilinoId, {
                    id: null, // Aquí guardaremos el id real del abono activo
                    inquilinoId: abono.inquilinoId,
                    nombreInquilino: abono.nombreInquilino,
                    inmuebleNombre: abono.inmuebleNombre,
                    montoOriginal: 0,
                    saldoRestante: 0,
                    descripcion: '',
                    fechaAbono: '',
                    aplicaciones: []
                });
            }
            const agrupado = abonosPorInquilino.get(abono.inquilinoId);
            agrupado.montoOriginal += parseFloat(abono.montoOriginal) || 0;
            agrupado.saldoRestante += parseFloat(abono.saldoRestante) || 0;
            agrupado.descripcion += abono.descripcion ? (agrupado.descripcion ? ' | ' : '') + abono.descripcion : '';
            agrupado.fechaAbono = abono.fechaAbono; // toma la última fecha registrada
            if (Array.isArray(abono.aplicaciones)) {
                agrupado.aplicaciones = agrupado.aplicaciones.concat(abono.aplicaciones);
            }
            // Si este abono tiene saldoRestante > 0 y es el más reciente, guarda su id
            if (abono.saldoRestante > 0 && (!agrupado.id || new Date(abono.fechaAbono) > new Date(agrupado.fechaAbono))) {
                agrupado.id = abono.id;
                agrupado.fechaAbono = abono.fechaAbono;
            }
        });

        // Ahora genera las tarjetas solo por inquilino
        let tarjetasAbonosHtml = "";
        const abonosUnicos = Array.from(abonosPorInquilino.values());
        if (abonosUnicos.length === 0) {
            tarjetasAbonosHtml = `
                <div class="col-span-full">
                    <div class="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-gray-500 text-lg mb-6">No hay saldos a favor registrados.</p>
                        <button onclick="mostrarFormularioNuevoAbono()"
                            class="bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700
                            text-white font-medium px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 
                            flex items-center justify-center mx-auto border border-emerald-400/30">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Registrar Nuevo Abono
                        </button>
                    </div>
                </div>`;
        } else {
            tarjetasAbonosHtml = abonosUnicos.map(abono => {
                const estadoClass = abono.saldoRestante > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
                const estadoText = abono.saldoRestante > 0 ? 'Activo' : 'Consumido';

                // Historial de aplicaciones
                let historialAplicacionesHtml = '';
                if (abono.aplicaciones && abono.aplicaciones.length > 0) {
                    abono.aplicaciones.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
                    historialAplicacionesHtml = `
                        <div class="mt-4 border-t border-gray-200 pt-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-semibold text-sm text-gray-700 flex items-center">
                                    <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                    </svg>
                                    Historial de aplicaciones
                                </h4>
                                <span class="text-xs text-gray-500">${abono.aplicaciones.length} aplicación(es)</span>
                            </div>
                            <div class="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                                ${abono.aplicaciones.map(app => {
                                    const pagoInfo = pagosMap.get(app.pagoId);
                                    const pagoLabel = pagoInfo ? `${pagoInfo.mes || ''} ${pagoInfo.anio || ''}` : 'Pago desconocido';
                                    return `
                                        <div class="bg-gray-50 rounded-lg p-2.5 text-xs border border-gray-100">
                                            <div class="flex justify-between items-center">
                                                <span class="font-medium text-gray-700">${pagoLabel}</span>
                                                <span class="text-green-600 font-semibold">$${parseFloat(app.montoAplicado).toFixed(2)}</span>
                                            </div>
                                            <div class="text-gray-500 text-xs mt-1">${app.fecha}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100">
                        <div class="p-4 sm:p-5 md:p-6">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-1">${abono.nombreInquilino}</h3>
                                    <p class="text-sm text-indigo-600 font-medium mb-2">${abono.inmuebleNombre !== 'Sin inmueble asignado' && abono.inmuebleNombre !== 'Inmueble no encontrado' ? abono.inmuebleNombre : 'Inmueble: No asignado'}</p>
                                    <div class="flex items-center space-x-2 mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoClass}">
                                            ${estadoText}
                                        </span>
                                        <span class="text-sm text-gray-500">${abono.fechaAbono}</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm text-gray-600">Monto Original</div>
                                    <div class="text-lg font-semibold text-gray-800">$${parseFloat(abono.montoOriginal).toFixed(2)}</div>
                                </div>
                            </div>

                            <div class="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Saldo Restante</span>
                                    <span class="text-xl font-bold ${
    abono.saldoRestante > 0 ? 'text-green-600' : abono.saldoRestante < 0 ? 'text-red-600' : 'text-gray-500'
}">
    $${parseFloat(abono.saldoRestante).toFixed(2)}
</span>
                                </div>
                            </div>

                            <div class="mt-4 flex flex-wrap gap-2 sm:gap-3">
                                <button onclick="mostrarFormularioNuevoAbono('${abono.id}')"
                                        class="flex-1 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-indigo-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                    Actualizar
                                </button>
                                <button onclick="mostrarHistorialDescripciones('${abono.descripcion?.replace(/'/g, "\\'").replace(/"/g, '&quot;') || ''}', '${abono.nombreInquilino}', '${abono.inmuebleNombre}')"
                                        class="flex-1 bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-yellow-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17l4 4 4-4m0-5V3"/>
                                    </svg>
                                    Historial
                                </button>
                                ${abono.saldoRestante > 0 ? `
                                    <button onclick="aplicarSaldoFavorManual('${abono.id}', '${abono.inquilinoId}')"
                                            class="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                                            text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                            flex items-center justify-center gap-1.5 border border-emerald-400/30">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        Aplicar Saldo
                                    </button>
                                ` : ''}
                                <button onclick="eliminarAbono('${abono.id}', '${abono.inquilinoId}')"
                                        class="flex-1 bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-rose-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    Eliminar
                                </button>
                            </div>

                            ${historialAplicacionesHtml}
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
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Gestión de Saldos a Favor
                    </h2>
                    <button onclick="mostrarFormularioNuevoAbono()"
                            class="mt-4 sm:mt-0 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700
                            text-white font-medium px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 
                            flex items-center justify-center border border-emerald-400/30">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Registrar Nuevo Abono
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    ${tarjetasAbonosHtml}
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error al cargar los abonos a favor:", error);
        mostrarNotificacion("Error al cargar los saldos a favor.", 'error');
        contenedor.innerHTML = `<p class="text-red-500 text-center py-8">Error al cargar los saldos a favor: ${error.message}</p>`;
    }
}

/**
 * Aplica manualmente el saldo a favor a un pago pendiente/parcial del inquilino.
 * @param {string} abonoId
 * @param {string} inquilinoId
 */
export async function aplicarSaldoFavorManual(abonoId, inquilinoId) {
    try {
        const abonoDoc = await getDoc(doc(db, "abonosSaldoFavor", abonoId));
        if (!abonoDoc.exists()) {
            mostrarNotificacion('No se encontró el saldo a favor.', 'error');
            return;
        }
        const abono = abonoDoc.data();
        if (abono.saldoRestante <= 0) {
            mostrarNotificacion('Este saldo a favor ya fue consumido.', 'warning');
            return;
        }

        // Buscar el primer pago pendiente/parcial del inquilino
        const pagosQuery = query(
            collection(db, "pagos"),
            where("inquilinoId", "==", inquilinoId),
            where("estado", "in", ["pendiente", "parcial", "vencido"])
        );
        const pagosSnap = await getDocs(pagosQuery);

        let pagoAplicado = false;
        for (const pagoDoc of pagosSnap.docs) {
            const pago = pagoDoc.data();
            if (pago.saldoPendiente > 0) {
                const aplicar = Math.min(abono.saldoRestante, pago.saldoPendiente);
                // Actualizar pago
                const nuevoMontoPagado = (pago.montoPagado || 0) + aplicar;
                const nuevoSaldoPendiente = (pago.saldoPendiente || 0) - aplicar;
                let nuevoEstado = 'pendiente';
                if (nuevoMontoPagado >= pago.montoTotal) {
                    nuevoEstado = 'pagado';
                } else if (nuevoMontoPagado > 0) {
                    nuevoEstado = 'parcial';
                }
                // Actualizar abonos del pago
                const abonosActuales = pago.abonos || [];
                abonosActuales.push({
                    montoAbonado: aplicar,
                    fechaAbono: new Date().toISOString().split('T')[0],
                    origen: 'saldo a favor'
                });
                await updateDoc(doc(db, "pagos", pagoDoc.id), {
                    montoPagado: nuevoMontoPagado,
                    saldoPendiente: nuevoSaldoPendiente,
                    estado: nuevoEstado,
                    abonos: abonosActuales
                });
                // Actualizar saldo a favor y guardar historial de aplicaciones
                const nuevoSaldoRestante = abono.saldoRestante - aplicar;
                const aplicaciones = abono.aplicaciones || [];
                aplicaciones.push({
                    pagoId: pagoDoc.id,
                    montoAplicado: aplicar,
                    fecha: new Date().toISOString().split('T')[0]
                });
                await updateDoc(doc(db, "abonosSaldoFavor", abonoId), {
                    saldoRestante: nuevoSaldoRestante,
                    aplicaciones: aplicaciones
                });
                mostrarNotificacion('Saldo a favor aplicado correctamente.', 'success');
                pagoAplicado = true;
                break; // Solo aplicar a un pago a la vez
            }
        }
        if (!pagoAplicado) {
            mostrarNotificacion('No hay pagos pendientes para aplicar el saldo a favor.', 'info');
        }
        mostrarAbonos();

    } catch (error) {
        mostrarNotificacion('Error al aplicar el saldo a favor.', 'error');
    }
}

/**
 * Muestra el formulario para añadir o editar un abono/saldo a favor en un modal.
 * @param {string} [id=null] - ID del abono a editar. Si es null, es un nuevo abono.
 */
export async function mostrarFormularioNuevoAbono(id = null) {
    let titulo = "Registrar Nuevo Saldo a Favor";
    let abono = { inquilinoId: '', montoOriginal: '', saldoRestante: '', fechaAbono: '', descripcion: '' };
    let inquilinosList = [];

    try {
        // Obtener inmuebles para mostrar junto a los inquilinos
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre || 'Inmueble sin nombre');
        });
        
        // Crear un mapa para buscar inmuebles por nombre también
        const inmueblesNombreMap = new Map();
        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            if (data.nombre) {
                inmueblesNombreMap.set(data.nombre.toLowerCase(), data.nombre);
            }
        });
        
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            const inquilino = doc.data();
            
            // Verificar todos los posibles campos donde podría estar el ID del inmueble
            let inmuebleId = inquilino.inmuebleId || inquilino.inmuebleAsociadoId || inquilino.idInmueble;
            let inmuebleNombre = null;
            
            // 1. Intentar obtener por ID
            if (inmuebleId && inmueblesMap.has(inmuebleId)) {
                inmuebleNombre = inmueblesMap.get(inmuebleId);
            } 
            // 2. Intentar obtener por campo nombreInmueble
            else if (inquilino.nombreInmueble) {
                inmuebleNombre = inquilino.nombreInmueble;
            }
            // 3. Intentar buscar por coincidencia de nombre
            else if (inquilino.inmueble && typeof inquilino.inmueble === 'string') {
                const nombreLower = inquilino.inmueble.toLowerCase();
                if (inmueblesNombreMap.has(nombreLower)) {
                    inmuebleNombre = inmueblesNombreMap.get(nombreLower);
                } else {
                    inmuebleNombre = inquilino.inmueble; // Usar el nombre directamente
                }
            }
            
            // Si no se encontró de ninguna forma
            if (!inmuebleNombre) {
                inmuebleNombre = 'Sin inmueble asignado';
            }
            
            inquilinosList.push({ 
                id: doc.id, 
                ...inquilino,
                inmuebleNombre: inmuebleNombre
            });
        });
    } catch (error) {
        mostrarNotificacion("Error al cargar inquilinos disponibles.", 'error');
        return;
    }

    if (id) {
        titulo = "Editar Saldo a Favor";
        try {
            const docSnap = await getDoc(doc(db, "abonosSaldoFavor", id));
            if (docSnap.exists()) {
                abono = { id: docSnap.id, ...docSnap.data() };
            } else {
                mostrarNotificacion("Saldo a favor no encontrado.", 'error');
                return;
            }
        } catch (error) {
            mostrarNotificacion("Error al cargar datos del saldo a favor para editar.", 'error');
            return;
        }
    }

    const inquilinosOptions = inquilinosList.map(inc => {
        const inmuebleText = (inc.inmuebleNombre !== 'Sin inmueble asignado' && inc.inmuebleNombre !== 'Inmueble no encontrado') 
            ? inc.inmuebleNombre 
            : 'Sin inmueble';
        return `<option value="${inc.id}" ${inc.id === abono.inquilinoId ? 'selected' : ''}>${inc.nombre} - ${inmuebleText}</option>`;
    }).join('');

    const formHtml = `
        <div class="px-6 py-5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-t-xl -mx-6 -mt-6 mb-6 shadow-md">
            <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${titulo}
            </h3>
        </div>
        <form id="formAbonoSaldoFavor" class="space-y-5 max-w-lg mx-auto px-4">
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="space-y-4">
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
                        <label for="montoOriginal" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Monto del Abono:
                        </label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">$</span>
                            <input type="number"
                                 id="montoOriginal"
                                 value="${abono.montoOriginal}"
                                class="w-full pl-8 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                step="0.01"
                                required
                                placeholder="0.00">
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div class="space-y-4">
                    <div>
                        <label for="descripcionAbono" class="block text-gray-700 text-sm font-medium mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                            </svg>
                            Descripción (Opcional):
                        </label>
                        <textarea id="descripcionAbono"
                                  class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  rows="2"
                                  placeholder="Ingrese una descripción del abono...">${abono.descripcion || ''}</textarea>
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
                               value="${abono.fechaAbono}"
                               class="w-full px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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

    const formAbonoSaldoFavor = document.getElementById('formAbonoSaldoFavor');
    if (formAbonoSaldoFavor) {
        formAbonoSaldoFavor.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inquilinoId = document.getElementById('inquilinoId').value;
            const montoNuevo = parseFloat(document.getElementById('montoOriginal').value);
            const descripcion = document.getElementById('descripcionAbono').value;
            const fechaAbono = document.getElementById('fechaAbono').value;
            const fechaRegistro = id ? abono.fechaRegistro : new Date().toISOString().split('T')[0];

            if (id) {
                // Editar abono existente (sin cambios)
                try {
                    if (montoNuevo !== abono.montoOriginal) {
                        abono.saldoRestante = montoNuevo;
                        abono.montoOriginal = montoNuevo;
                        mostrarNotificacion("El saldo restante se ha restablecido al monto original.", 'info');
                    }
                    abono.descripcion = descripcion;
                    abono.fechaAbono = fechaAbono;
                    await updateDoc(doc(db, "abonosSaldoFavor", id), abono);
                    mostrarNotificacion("Saldo a favor actualizado con éxito.", 'success');
                } catch (err) {
                    mostrarNotificacion("Error al actualizar el saldo a favor.", 'error');
                }
            } else {
                // Registrar nuevo abono: buscar si ya existe uno activo para el inquilino
                try {
                    const abonosSnap = await getDocs(query(
                        collection(db, "abonosSaldoFavor"),
                        where("inquilinoId", "==", inquilinoId)
                    ));
                    const abonosActivos = abonosSnap.docs.filter(doc => (doc.data().saldoRestante || 0) > 0);
                    if (abonosActivos.length > 0) {
                        // Ya existe un saldo a favor activo, sumamos
                        const abonoExistenteDoc = abonosActivos[0];
                        const abonoExistente = abonoExistenteDoc.data();
                        const nuevoMontoOriginal = (abonoExistente.montoOriginal || 0) + montoNuevo;
                        const nuevoSaldoRestante = (abonoExistente.saldoRestante || 0) + montoNuevo;
                        const nuevaDescripcion = abonoExistente.descripcion
                            ? abonoExistente.descripcion + ` | +${montoNuevo} el ${fechaAbono}${descripcion ? ' (' + descripcion + ')' : ''}`
                            : `+${montoNuevo} el ${fechaAbono}${descripcion ? ' (' + descripcion + ')' : ''}`;
                        await updateDoc(doc(db, "abonosSaldoFavor", abonoExistenteDoc.id), {
                            montoOriginal: nuevoMontoOriginal,
                            saldoRestante: nuevoSaldoRestante,
                            descripcion: nuevaDescripcion,
                            fechaAbono: fechaAbono // opcional: puedes guardar la última fecha
                        });
                        mostrarNotificacion("Saldo a favor sumado al existente.", 'success');
                    } else {
                        // No existe, creamos uno nuevo
                        await addDoc(collection(db, "abonosSaldoFavor"), {
                            inquilinoId,
                            montoOriginal: montoNuevo,
                            saldoRestante: montoNuevo,
                            descripcion,
                            fechaAbono,
                            fechaRegistro,
                            aplicaciones: []
                        });
                        mostrarNotificacion("Saldo a favor registrado con éxito.", 'success');
                    }
                } catch (err) {
                    mostrarNotificacion("Error al registrar el saldo a favor.", 'error');
                }
            }
            ocultarModal();
            mostrarAbonos();
        });
    }
}

/**
 * Función para editar un abono a favor, mostrando el formulario.
 * @param {string} id - ID del abono a editar.
 */
export async function editarAbono(id) {
    mostrarFormularioNuevoAbono(id);
}

/**
 * Elimina un abono a favor con doble confirmación.
 * @param {string} id - ID del abono a eliminar.
 * @param {string} inquilinoId - ID del inquilino asociado (opcional).
 */
export async function eliminarAbono(id, inquilinoId = null) {
    try {
        // Preguntar si desea eliminar todos los abonos del inquilino
        const eliminarTodo = inquilinoId && confirm('¿Deseas eliminar TODOS los saldos a favor de este inquilino?');
        
        // Primera confirmación
        const mensaje = eliminarTodo 
            ? '¿Estás seguro de que quieres eliminar TODOS los saldos a favor de este inquilino? Esta acción es irreversible.'
            : '¿Estás seguro de que quieres eliminar este saldo a favor? Esta acción es irreversible.';
            
        if (confirm(mensaje)) {
            // Segunda confirmación
            const mensaje2 = eliminarTodo
                ? 'REALMENTE deseas eliminar TODOS los saldos a favor de este inquilino? No se podrán recuperar.'
                : 'REALMENTE deseas eliminar este saldo a favor? No se podrá recuperar.';
                
            if (confirm(mensaje2)) {
                if (eliminarTodo) {
                    // Eliminar todos los abonos asociados al inquilino
                    const abonosQuery = query(
                        collection(db, "abonosSaldoFavor"),
                        where("inquilinoId", "==", inquilinoId)
                    );
                    const abonosSnap = await getDocs(abonosQuery);
                    
                    // Eliminar cada documento encontrado
                    const batch = writeBatch(db);
                    abonosSnap.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    
                    mostrarNotificacion('Todos los saldos a favor del inquilino han sido eliminados.', 'success');
                } else {
                    // Eliminar solo el abono específico
                    await deleteDoc(doc(db, "abonosSaldoFavor", id));
                    mostrarNotificacion('Saldo a favor eliminado con éxito.', 'success');
                }
                
                mostrarAbonos();
            } else {
                mostrarNotificacion('Eliminación cancelada.', 'info');
            }
        } else {
            mostrarNotificacion('Eliminación cancelada.', 'info');
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
        mostrarNotificacion('Error al eliminar el saldo a favor.', 'error');
    }
}

// Agrega esta función para mostrar el historial de descripciones en un modal elegante
function mostrarHistorialDescripciones(descripciones, nombreInquilino, inmuebleNombre) {
    // Separar las descripciones por el separador " | "
    const historial = descripciones.split(' | ').filter(d => d.trim() !== '');
    const historialHtml = historial.length > 0
        ? historial.map((desc, idx) => `
            <div class="bg-white rounded-lg shadow p-3 mb-2 border border-gray-100 flex items-start gap-2">
                <span class="text-indigo-500 font-bold">${idx + 1}.</span>
                <span class="text-gray-700">${desc}</span>
            </div>
        `).join('')
        : `<div class="text-gray-500 text-center py-4">No hay historial de descripciones.</div>`;

    const modalHtml = `
        <div class="max-w-lg w-full mx-auto">
            <div class="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-xl px-6 py-4 flex items-center justify-between">
                <div>
                    <div class="font-bold text-lg">Historial de Descripciones</div>
                    <div class="text-sm opacity-80">${nombreInquilino} <span class="text-xs">|</span> <span class="italic">${inmuebleNombre}</span></div>
                </div>
                <button onclick="ocultarModal()" class="text-white hover:bg-red-100 hover:text-red-600 rounded-full p-2 transition-all" aria-label="Cerrar">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="bg-white rounded-b-xl px-6 py-5 max-h-96 overflow-y-auto">
                ${historialHtml}
            </div>
        </div>
    `;
    mostrarModal(modalHtml);
}

// Hacer la función global para que se pueda llamar desde los botones
window.mostrarHistorialDescripciones = mostrarHistorialDescripciones;

// Hacer funciones globales para los botones en HTML
window.mostrarAbonos = mostrarAbonos;
window.mostrarFormularioNuevoAbono = mostrarFormularioNuevoAbono;
window.editarAbono = editarAbono;
window.eliminarAbono = eliminarAbono;
window.aplicarSaldoFavorManual = aplicarSaldoFavorManual;

// Asegurarse de que las funciones estén disponibles cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de abonos cargado correctamente');
    // Verificar que las funciones estén disponibles globalmente
    if (typeof window.mostrarAbonos === 'function') {
        console.log('Función mostrarAbonos disponible');
    }
});