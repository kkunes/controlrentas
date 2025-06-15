// js/inquilinos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion } from './ui.js';
import { updateDoc as updateDocInmueble } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"; // Alias para evitar conflicto
import { obtenerMesesAdeudadosHistorico } from './pagos.js';
/**
 * Muestra la lista de inquilinos en forma de tarjetas.
 */
export async function mostrarInquilinos(filtroActivo = "Todos") {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de inquilinos.", 'error');
        return;
    }

    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles")); // Para mapear nombres de inmuebles
        
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            const nombreInmueble = data.inmuebleAsociadoId ? inmueblesMap.get(data.inmuebleAsociadoId) || 'Inmueble Desconocido' : 'No Asignado';
            inquilinosList.push({ id: doc.id, ...data, nombreInmueble });
        });

        // Ordenar los inquilinos para que los activos salgan primero
        inquilinosList.sort((a, b) => (b.activo - a.activo) || a.nombre.localeCompare(b.nombre));

        // Filtrar por estado si se solicita
        if (filtroActivo === "Activos") {
            inquilinosList = inquilinosList.filter(i => i.activo);
        } else if (filtroActivo === "Inactivos") {
            inquilinosList = inquilinosList.filter(i => !i.activo);
        }

        // Obtén todos los pagos una sola vez
        const pagosSnap = await getDocs(collection(db, "pagos"));
        let pagosDepositoMap = new Map();
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.tipo === "deposito" && pago.inquilinoId) {
                pagosDepositoMap.set(pago.inquilinoId, { monto: pago.montoTotal, fecha: pago.fechaRegistro });
            }
        });

        let tarjetasInquilinosHtml = "";
        if (inquilinosList.length === 0) {
            tarjetasInquilinosHtml = `<p class="text-gray-500 text-center py-8">No hay inquilinos registrados.</p>`;
        } else {
            tarjetasInquilinosHtml = inquilinosList.map(inquilino => {
                // Busca el depósito de este inquilino
                const deposito = pagosDepositoMap.get(inquilino.id);

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${inquilino.activo ? 'border-green-500' : 'border-red-500'} overflow-hidden transform hover:-translate-y-1" data-id="${inquilino.id}">
                        <div class="p-4 sm:p-6">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors duration-200">${inquilino.nombre}</h3>
                                </div>
                                <span class="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm ${inquilino.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${inquilino.activo ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'}" />
                                    </svg>
                                    ${inquilino.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>

                            <div class="space-y-3 mb-6">
                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span class="text-sm font-medium">${inquilino.telefono}</span>
                                </div>

                                <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span class="text-sm font-medium">${inquilino.nombreInmueble}</span>
                                </div>

                                ${inquilino.depositoRecibido && inquilino.montoDeposito && inquilino.fechaDeposito ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span class="text-sm font-medium">Depósito: $${parseFloat(inquilino.montoDeposito).toFixed(2)} (${inquilino.fechaDeposito})</span>
                                    </div>
                                ` : ''}

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    ${inquilino.fechaOcupacion ? `
                                        <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span class="text-sm font-medium">Inicio Pagos: ${inquilino.fechaOcupacion}</span>
                                        </div>
                                    ` : ''}
                                    ${inquilino.fechaLlegada ? `
                                        <div class="flex items-center hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span class="text-sm font-medium">Firma: ${inquilino.fechaLlegada}</span>
                                        </div>
                                    ` : ''}
                                </div>

                                ${inquilino.urlIdentificacion ? `
                                    <div class="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-gray-50 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <a href="${inquilino.urlIdentificacion}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">Ver Identificación</a>
                                    </div>
                                ` : ''}
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                <button onclick="mostrarHistorialPagosInquilino('${inquilino.id}')" 
                                    title="Ver historial de pagos del inquilino"
                                    class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Pagos</span>
                                </button>
                                ${inquilino.activo ? 
                                    `<button onclick="confirmarDesocupacionInquilino('${inquilino.id}')" 
                                        title="Marcar inquilino como desocupado"
                                        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        <span>Desocupar</span>
                                    </button>` :
                                    `<button onclick="confirmarReactivacionInquilino('${inquilino.id}')" 
                                        title="Reactivar inquilino inactivo"
                                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Reactivar</span>
                                    </button>`
                                }
                                <button onclick="editarInquilino('${inquilino.id}')" 
                                    title="Editar información del inquilino"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Editar</span>
                                </button>
                                <button onclick="eliminarDocumento('inquilinos', '${inquilino.id}', mostrarInquilinos)" 
                                    title="Eliminar este inquilino"
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Eliminar</span>
                                </button>
                                <button onclick="mostrarHistorialAbonosInquilino('${inquilino.id}')" 
                                    title="Ver historial de abonos del inquilino"
                                    class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Abonos</span>
                                </button>
                                <button onclick="mostrarSaldoFavorInquilino('${inquilino.id}')" 
                                    title="Ver saldo a favor del inquilino"
                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Saldo</span>
                                </button>
                                <button onclick="mostrarMobiliarioAsignadoInquilino('${inquilino.id}', '${inquilino.nombre}')" 
                                    title="Ver mobiliario asignado al inquilino"
                                    class="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span class="hidden sm:inline">Mobiliario</span>
                                    <span class="sm:hidden">Mob.</span>
                                </button>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="handle-move cursor-move text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors duration-200" title="Arrastrar para reordenar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                <span class="text-xs">Reordenar</span>
                            </span>
                            <span id="badge-adeudos-${inquilino.id}" class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">Cargando adeudos...</span>
                        </div>
                    </div>
                `;
        }).join('');
        
        }

        contenedor.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Inquilinos</h2>
                    <p class="text-sm text-gray-600 mt-1">Administra los inquilinos y sus contratos</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3">
                    <select id="filtroActivo" class="border-gray-300 rounded-lg px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200">
                        <option value="Todos" ${filtroActivo === "Todos" ? "selected" : ""}>Todos los inquilinos</option>
                        <option value="Activos" ${filtroActivo === "Activos" ? "selected" : ""}>Inquilinos activos</option>
                        <option value="Inactivos" ${filtroActivo === "Inactivos" ? "selected" : ""}>Inquilinos inactivos</option>
                    </select>
                    <button onclick="mostrarFormularioNuevoInquilino()" 
                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 hover:shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Nuevo Inquilino
                    </button>
                </div>
            </div>
            <div id="listaInquilinos" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${tarjetasInquilinosHtml}
            </div>
        `;

        // Agrega el event listener después de asignar el innerHTML
        document.getElementById('filtroActivo').addEventListener('change', function () {
            mostrarInquilinos(this.value);
        });

        const lista = document.getElementById('listaInquilinos');
        if (lista) {
            Sortable.create(lista, {
                animation: 150,
                handle: '.handle-move', // <-- Solo se puede arrastrar desde el handle
                onEnd: async function (evt) {
                    const ids = Array.from(lista.children).map(card => card.dataset.id);
                    for (let i = 0; i < ids.length; i++) {
                        await updateDoc(doc(db, "inquilinos", ids[i]), { orden: i });
                    }
                    mostrarNotificacion("Orden de inquilinos actualizado.", "success");
                }
            });
        }

        // Actualizar badges de adeudos
        for (const inquilino of inquilinosList) {
            if (!inquilino.fechaOcupacion || !inquilino.inmuebleAsociadoId) continue;
            const mesesAdeudados = await obtenerMesesAdeudadosHistorico(
                inquilino.id,
                inquilino.inmuebleAsociadoId,
                new Date(inquilino.fechaOcupacion)
            );
            const badge = document.getElementById(`badge-adeudos-${inquilino.id}`);
            if (badge) {
                // Limpia listeners previos
                const newBadge = badge.cloneNode(true);
                badge.parentNode.replaceChild(newBadge, badge);

                if (mesesAdeudados.length > 0) {
                    newBadge.textContent = `${mesesAdeudados.length} adeudo${mesesAdeudados.length > 1 ? 's' : ''}`;
                    newBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors duration-200";
                    newBadge.title = "Haz clic para ver los meses adeudados";
                    newBadge.addEventListener('click', async () => {
                        const mesesActualizados = await obtenerMesesAdeudadosHistorico(
                            inquilino.id,
                            inquilino.inmuebleAsociadoId,
                            new Date(inquilino.fechaOcupacion)
                        );
                        mostrarModal(`
                            <div class="px-4 py-3 bg-red-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                                <h3 class="text-xl font-bold text-center">Adeudos de ${inquilino.nombre}</h3>
                            </div>
                            <div class="space-y-4">
                                <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                                    <div class="flex items-center justify-between mb-4">
                                        <h4 class="text-lg font-semibold text-gray-800 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Resumen de Adeudos
                                        </h4>
                                        <span class="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                                            ${mesesActualizados.length} mes${mesesActualizados.length > 1 ? 'es' : ''} adeudado${mesesActualizados.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div class="space-y-3">
                                        ${mesesActualizados.map(m => `
                                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                                <div class="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span class="font-medium text-gray-800">${m.mes} ${m.anio}</span>
                                                </div>
                                                <span class="text-sm text-gray-500">Pendiente de pago</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                                    <div class="flex">
                                        <div class="flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div class="ml-3">
                                            <p class="text-sm text-yellow-700">
                                                Se recomienda contactar al inquilino para regularizar los pagos pendientes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-end mt-6 pt-4 border-t border-gray-200">
                                <button onclick="ocultarModal()" 
                                    class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors duration-200">
                                    Cerrar
                                </button>
                            </div>
                        `);
                    });
                } else {
                    newBadge.textContent = "Sin adeudos";
                    newBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
                    newBadge.title = "El inquilino está al corriente";
                }
            }
        }
    } catch (error) {
        console.error("Error al obtener inquilinos:", error);
        mostrarNotificacion("Error al cargar los inquilinos.", 'error');
    }
}

/**
 * Muestra el formulario para registrar un nuevo inquilino o editar uno existente.
 * @param {string} [id] - ID del inquilino a editar (opcional).
 */
export async function mostrarFormularioNuevoInquilino(id = null) {
    let inquilino = null;
    let inmueblesDisponibles = [];
    let inmuebleAnteriorId = null; // Para guardar el ID del inmueble antes de la edición

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const todosInmuebles = [];
        inmueblesSnap.forEach(doc => {
            todosInmuebles.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "inquilinos", id));
            if (docSnap.exists()) {
                inquilino = { id: docSnap.id, ...docSnap.data() };
                inmuebleAnteriorId = inquilino.inmuebleAsociadoId; // Guardar el ID actual del inmueble del inquilino
            }
        }

        // Filtrar inmuebles: solo los disponibles o el que ya está asignado a este inquilino (si existe)
        inmueblesDisponibles = todosInmuebles.filter(inmueble => 
            inmueble.estado === 'Disponible' || (inquilino && inmueble.id === inquilino.inmuebleAsociadoId)
        );

    } catch (error) {
        console.error("Error al cargar datos para el formulario de inquilino:", error);
        mostrarNotificacion("Error al cargar datos para el formulario de inquilino.", 'error');
        return;
    }

    const tituloModal = id ? "Editar Inquilino" : "Registrar Nuevo Inquilino";

    const inmueblesOptions = inmueblesDisponibles.map(inmueble => {
        // Si el inmueble está ocupado por otro inquilino (no el actual en edición), deshabilitarlo
        const isDisabled = inmueble.estado === 'Ocupado' && (!inquilino || inmueble.id !== inquilino.inmuebleAsociadoId);
        const rentaFormateada = inmueble.rentaMensual ? `$${parseFloat(inmueble.rentaMensual).toFixed(2)}` : '';
        return `
            <option value="${inmueble.id}" 
                    ${inquilino && inquilino.inmuebleAsociadoId === inmueble.id ? 'selected' : ''}
                    ${isDisabled ? 'disabled' : ''}>
                ${inmueble.nombre} ${rentaFormateada ? `(${rentaFormateada}/mes)` : ''} ${isDisabled ? '(Ocupado)' : ''}
            </option>
        `;
    }).join('');

    const recibioDepositoChecked = inquilino && inquilino.depositoRecibido ? 'checked' : '';
    const campoDepositoDisplay = inquilino && inquilino.depositoRecibido ? 'block' : 'none';
    const montoDepositoValue = inquilino && inquilino.montoDeposito ? inquilino.montoDeposito : '';
    const fechaDepositoValue = inquilino && inquilino.fechaDeposito ? inquilino.fechaDeposito : '';

    const modalContent = `
        <div class="px-4 py-3 bg-green-600 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 class="text-xl sm:text-2xl font-bold text-center">${tituloModal}</h3>
        </div>
        <form id="formInquilino" class="space-y-6 max-h-[80vh] overflow-y-auto px-2">
            <!-- Sección de Información Personal -->
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Información Personal
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label for="nombre" class="block text-base font-medium text-gray-700 mb-2">Nombre Completo</label>
                        <input type="text" id="nombre" name="nombre" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" value="${inquilino ? inquilino.nombre : ''}" placeholder="Ej: Juan Pérez" required>
                    </div>
                    <div>
                        <label for="telefono" class="block text-base font-medium text-gray-700 mb-2">Teléfono</label>
                        <input type="tel" id="telefono" name="telefono" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" value="${inquilino ? inquilino.telefono : ''}" placeholder="Ej: +52 123 456 7890" required>
                    </div>
                </div>
            </div>

            <!-- Sección de Fechas -->
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Fechas Importantes
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label for="fechaLlegada" class="block text-base font-medium text-gray-700 mb-2">Fecha de Llegada</label>
                        <input type="date" id="fechaLlegada" name="fechaLlegada" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                            value="${inquilino && inquilino.fechaLlegada ? inquilino.fechaLlegada : ''}" required>
                    </div>
                    <div>
                        <label for="fechaOcupacion" class="block text-base font-medium text-gray-700 mb-2">Fecha de Ocupación</label>
                        <input type="date" id="fechaOcupacion" name="fechaOcupacion" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                            value="${inquilino && inquilino.fechaOcupacion ? inquilino.fechaOcupacion : ''}" required>
                    </div>
                </div>
            </div>

            <!-- Sección de Documentación -->
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentación
                </h4>
                <div>
                    <label for="urlIdentificacion" class="block text-base font-medium text-gray-700 mb-2">URL de Identificación</label>
                    <input type="url" id="urlIdentificacion" name="urlIdentificacion" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" value="${inquilino && inquilino.urlIdentificacion ? inquilino.urlIdentificacion : ''}" placeholder="Ej: https://docs.google.com/d/abc123xyz">
                    <p class="mt-2 text-sm text-gray-500">Enlace a Google Drive, Dropbox, u otro servicio de almacenamiento.</p>
                </div>
            </div>

            <!-- Sección de Asignación de Inmueble -->
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Asignación de Inmueble
                </h4>
                <div>
                    <label for="inmuebleAsociadoId" class="block text-base font-medium text-gray-700 mb-2">Inmueble Asociado</label>
                    <select id="inmuebleAsociadoId" name="inmuebleAsociadoId" class="mt-1 block w-full pl-4 pr-10 py-3 text-base border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">Ninguno</option>
                        ${inmueblesOptions}
                    </select>
                    <p class="mt-2 text-sm text-gray-500">Solo se muestran inmuebles disponibles o el actualmente asignado.</p>
                </div>
            </div>

            <!-- Sección de Estado y Depósito -->
            <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estado y Depósito
                </h4>
                <div class="space-y-6">
                    <div class="flex items-center space-x-6">
                        <div class="flex items-center">
                            <input type="checkbox" id="activo" name="activo" class="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" ${inquilino === null || inquilino.activo ? 'checked' : ''}>
                            <label for="activo" class="ml-3 block text-base text-gray-900">Inquilino Activo</label>
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" id="recibioDeposito" name="recibioDeposito" class="h-5 w-5 text-indigo-600 border-gray-300 rounded" ${recibioDepositoChecked}>
                            <label for="recibioDeposito" class="ml-3 text-base text-gray-900">Recibió depósito</label>
                        </div>
                    </div>

                    <div id="campoDeposito" style="display:${campoDepositoDisplay};" class="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                        <div>
                            <label for="montoDeposito" class="block text-base font-medium text-gray-700 mb-2">Monto del depósito</label>
                            <input type="number" id="montoDeposito" name="montoDeposito" min="0" step="0.01" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" value="${montoDepositoValue}">
                        </div>
                        <div>
                            <label for="fechaDeposito" class="block text-base font-medium text-gray-700 mb-2">Fecha del depósito</label>
                            <input type="date" id="fechaDeposito" name="fechaDeposito" class="mt-1 block w-full shadow-sm text-base border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" value="${fechaDepositoValue}">
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors duration-200 text-base">Cancelar</button>
                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors duration-200 text-base">${id ? "Actualizar" : "Registrar"} Inquilino</button>
            </div>
        </form>
    `;

    mostrarModal(modalContent);

    document.getElementById('formInquilino').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Convertir el checkbox a booleano
        data.activo = data.activo === 'on';
        data.depositoRecibido = data.recibioDeposito === 'on';
        if (!data.depositoRecibido) {
            data.montoDeposito = null;
            data.fechaDeposito = null;
        }

        // Si no se seleccionó inmueble, el valor será una cadena vacía, lo convertimos a null
        if (data.inmuebleAsociadoId === "") {
            data.inmuebleAsociadoId = null;
        }

        try {
            let inquilinoId = id; // El ID del inquilino que estamos creando/editando
            let docRef;

            if (id) {
                // Actualizar inquilino existente
                docRef = doc(db, "inquilinos", id);
                await updateDoc(docRef, data);
                mostrarNotificacion("Inquilino actualizado con éxito.", 'success');
            } else {
                // Agregar nuevo inquilino
                docRef = await addDoc(collection(db, "inquilinos"), data);
                inquilinoId = docRef.id; // Obtener el ID del nuevo documento
                mostrarNotificacion("Inquilino registrado con éxito.", 'success');
            }

            // --- Lógica para actualizar el estado del inmueble asociado ---
            const nuevoInmuebleId = data.inmuebleAsociadoId;
            const inquilinoNombre = data.nombre;

            if (inmuebleAnteriorId && inmuebleAnteriorId !== nuevoInmuebleId) {
                // El inquilino se ha movido o desocupado su inmueble anterior
                await updateDocInmueble(doc(db, "inmuebles", inmuebleAnteriorId), {
                    estado: 'Disponible',
                    inquilinoActualId: null,
                    inquilinoActualNombre: null
                });
                mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === inmuebleAnteriorId)?.nombre || 'anterior'} marcado como Disponible.`, 'info');
            }

            if (nuevoInmuebleId) {
                // Asignar el inmueble al inquilino (o actualizar si cambió)
                await updateDocInmueble(doc(db, "inmuebles", nuevoInmuebleId), {
                    estado: 'Ocupado',
                    inquilinoActualId: inquilinoId,
                    inquilinoActualNombre: inquilinoNombre
                });
                // También actualizar el inquilino con el nombre del inmueble si es relevante para el dashboard
                await updateDoc(doc(db, "inquilinos", inquilinoId), {
                    inmuebleAsociadoNombre: inmueblesDisponibles.find(i => i.id === nuevoInmuebleId)?.nombre || 'Desconocido'
                });
                mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === nuevoInmuebleId)?.nombre || 'seleccionado'} marcado como Ocupado.`, 'info');
            } else if (!nuevoInmuebleId && id) {
                // Si se eliminó la asociación de inmueble de un inquilino existente
                if (inmuebleAnteriorId) {
                    await updateDocInmueble(doc(db, "inmuebles", inmuebleAnteriorId), {
                        estado: 'Disponible',
                        inquilinoActualId: null,
                        inquilinoActualNombre: null
                    });
                    mostrarNotificacion(`Inmueble ${inmueblesDisponibles.find(i => i.id === inmuebleAnteriorId)?.nombre || 'anterior'} marcado como Disponible.`, 'info');
                }
                // Actualizar el inquilino sin nombre de inmueble
                await updateDoc(doc(db, "inquilinos", inquilinoId), {
                    inmuebleAsociadoNombre: 'No Asignado'
                });
            }

            ocultarModal();
            mostrarInquilinos(); // Recargar la lista de inquilinos

            // Si es un nuevo inquilino y recibió depósito, registrar el depósito
            if (data.recibioDeposito === 'on' && data.montoDeposito && data.fechaDeposito) {
                await addDoc(collection(db, "pagos"), {
                    tipo: "deposito",
                    montoTotal: parseFloat(data.montoDeposito),
                    fechaRegistro: data.fechaDeposito,
                    inquilinoId: inquilinoId,
                    inmuebleId: data.inmuebleAsociadoId || null,
                    observaciones: "Depósito inicial"
                });
            }
           
        } catch (err) {
            console.error("Error al guardar el inquilino:", err);
            mostrarNotificacion("Error al guardar el inquilino.", 'error');
        }
    });
}

/**
 * Función para editar un inquilino, mostrando el formulario.
 * @param {string} id - ID del inquilino a editar.
 */
export async function editarInquilino(id) {
    mostrarFormularioNuevoInquilino(id);
}

/**
 * Confirma la desocupación de un inquilino y actualiza su estado.
 * También marca el inmueble asociado como 'Disponible'.
 * @param {string} inquilinoId - ID del inquilino a desocupar.
 */
export async function confirmarDesocupacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres desocupar a este inquilino? Se marcará como inactivo y su inmueble asociado como disponible.')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            const inquilinoSnap = await getDoc(inquilinoRef);
            
            if (inquilinoSnap.exists()) {
                const inquilinoData = inquilinoSnap.data();
                const inmuebleId = inquilinoData.inmuebleAsociadoId;

                await updateDoc(inquilinoRef, {
                    activo: false,
                    inmuebleAsociadoId: null,
                    inmuebleAsociadoNombre: 'No Asignado',
                    fechaDesocupacion: new Date().toISOString().split('T')[0] // <-- Nueva línea
                });
                mostrarNotificacion("Inquilino desocupado con éxito.", 'success');

                if (inmuebleId) {
                    await updateDocInmueble(doc(db, "inmuebles", inmuebleId), {
                        estado: 'Disponible',
                        inquilinoActualId: null, // Limpiar inquilino actual del inmueble
                        inquilinoActualNombre: null
                    });
                    mostrarNotificacion(`Inmueble asociado marcado como Disponible.`, 'info');
                }
            } else {
                mostrarNotificacion("Inquilino no encontrado.", 'error');
            }
            mostrarInquilinos();
            
        } catch (error) {
            console.error("Error al desocupar inquilino:", error);
            mostrarNotificacion("Error al desocupar inquilino.", "error");
        }
    }
}

/**
 * Confirma la reactivación de un inquilino.
 * @param {string} inquilinoId - ID del inquilino a reactivar.
 */
export async function confirmarReactivacionInquilino(inquilinoId) {
    if (confirm('¿Estás seguro de que quieres reactivar a este inquilino?')) {
        try {
            const inquilinoRef = doc(db, "inquilinos", inquilinoId);
            await updateDoc(inquilinoRef, {
                activo: true,
                fechaDesocupacion: null
            });
            mostrarNotificacion("Inquilino reactivado con éxito.", 'success');
            mostrarInquilinos();
           
        } catch (error) {
            console.error("Error al reactivar inquilino:", error);
            mostrarNotificacion("Error al reactivar inquilino.", "error");
        }
    }
}

/**
 * Muestra el historial de pagos de un inquilino en un modal.
 * @param {string} inquilinoId - ID del inquilino cuyo historial de pagos se desea mostrar.
 */
export async function mostrarHistorialPagosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        const inquilinoSnap = await getDoc(doc(db, "inquilinos", inquilinoId));

        if (!inquilinoSnap.exists()) {
            mostrarNotificacion("Inquilino no encontrado.", "error");
            return;
        }

        const inquilino = inquilinoSnap.data();
        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        // Filtrar pagos de este inquilino
        let pagosList = [];
        pagosSnap.forEach(doc => {
            const data = doc.data();
            if (data.inquilinoId === inquilinoId) {
                pagosList.push({ id: doc.id, ...data });
            }
        });

        // Ordenar por fecha (más reciente primero)
        pagosList.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        // Ejemplo de integración en mostrarHistorialPagosInquilino
        const mesesAdeudados = await obtenerMesesAdeudadosHistorico(inquilinoId, inmuebleId, fechaOcupacion);
        let adeudosHtml = '';
        if (mesesAdeudados.length > 0) {
            adeudosHtml = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                    <strong>Meses adeudados:</strong>
                    <ul class="list-disc list-inside">
                        ${mesesAdeudados.map(m => `<li>${m.mes} ${m.anio}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            adeudosHtml = `
                <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
                    <strong>¡Sin adeudos!</strong>
                </div>
            `;
        }

        let historialHtml = `
            <div class="px-4 py-3 bg-purple-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Pagos de ${inquilino.nombre}</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inmueble</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mes/Año</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Abonos</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (pagosList.length === 0) {
            historialHtml += `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">No hay pagos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            pagosList.forEach(pago => {
                // Estado visual
                let estadoClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                switch (pago.estado) {
                    case "pagado":
                        estadoClass += "bg-green-100 text-green-800";
                        break;
                    case "parcial":
                        estadoClass += "bg-yellow-100 text-yellow-800";
                        break;
                    case "pendiente":
                        estadoClass += "bg-red-100 text-red-800";
                        break;
                    case "vencido":
                        estadoClass += "bg-purple-100 text-purple-800";
                        break;
                    default:
                        estadoClass += "bg-gray-100 text-gray-800";
                        break;
                }

                // Abonos detalle
                let abonosDetalleHtml = "";
                if (pago.abonos && pago.abonos.length > 0) {
                    abonosDetalleHtml = pago.abonos.map(abono => `
                        <div class="mb-1">
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold mr-1">$${parseFloat(abono.montoAbonado).toFixed(2)}</span>
                            <span class="text-xs text-gray-500">${abono.fechaAbono}</span>
                            ${abono.origen ? `<span class="ml-1 text-xs text-cyan-700">(${abono.origen})</span>` : ""}
                        </div>
                    `).join('');
                } else {
                    abonosDetalleHtml = `<span class="text-xs text-gray-400">Sin abonos</span>`;
                }

                historialHtml += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">${inmueblesMap.get(pago.inmuebleId) || 'Desconocido'}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${pago.mesCorrespondiente || ''} / ${pago.anioCorrespondiente || ''}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoTotal || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.montoPagado || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-800">$${(pago.saldoPendiente || 0).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm"><span class="${estadoClass}">${pago.estado || 'N/A'}</span></td>
                        <td class="px-4 py-2 text-sm">${abonosDetalleHtml}</td>
                    </tr>
                `;
            });
        }

        historialHtml += `
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;

        mostrarModal(historialHtml);

    } catch (error) {
        console.error("Error al mostrar historial de pagos de inquilino:", error);
        mostrarNotificacion("Error al cargar el historial de pagos del inquilino.", 'error');
    }
}

// Historial de abonos elegante
export async function mostrarHistorialAbonosInquilino(inquilinoId) {
    try {
        const pagosSnap = await getDocs(collection(db, "pagos"));
        let abonosList = [];
        pagosSnap.forEach(doc => {
            const pago = doc.data();
            if (pago.inquilinoId === inquilinoId && pago.abonos && pago.abonos.length > 0) {
                pago.abonos.forEach(abono => {
                    abonosList.push({
                        monto: abono.montoAbonado,
                        fecha: abono.fechaAbono,
                        origen: abono.origen || "manual",
                        pagoId: doc.id,
                        mes: pago.mesCorrespondiente,
                        anio: pago.anioCorrespondiente
                    });
                });
            }
        });

        let html = `
            <div class="px-4 py-3 bg-indigo-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-2xl font-bold text-center">Historial de Abonos</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 rounded-lg shadow">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pago (Mes/Año)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (abonosList.length === 0) {
            html += `
                <tr>
                    <td colspan="4" class="text-center py-8 text-gray-500">No hay abonos registrados para este inquilino.</td>
                </tr>
            `;
        } else {
            abonosList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            abonosList.forEach(a => {
                let origenClass = "px-2 py-0.5 text-xs rounded-full font-semibold ";
                origenClass += a.origen === "saldo a favor" ? "bg-cyan-100 text-cyan-800" : "bg-green-100 text-green-800";
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm text-gray-800">$${parseFloat(a.monto).toFixed(2)}</td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.fecha}</td>
                        <td class="px-4 py-2 text-sm"><span class="${origenClass}">${a.origen}</span></td>
                        <td class="px-4 py-2 text-sm text-gray-700">${a.mes || ''} / ${a.anio || ''}</td>
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
    } catch (error) {
        mostrarNotificacion("Error al cargar abonos.", "error");
    }
}

// Saldo a favor elegante
export async function mostrarSaldoFavorInquilino(inquilinoId) {
    try {
        const abonosSnap = await getDocs(collection(db, "abonosSaldoFavor"));
        let saldoTotal = 0;
        let abonos = [];
        abonosSnap.forEach(doc => {
            const abono = doc.data();
            if (abono.inquilinoId === inquilinoId && abono.saldoRestante > 0) {
                saldoTotal += abono.saldoRestante;
                abonos.push({
                    monto: abono.saldoRestante,
                    fecha: abono.fechaAbono,
                    descripcion: abono.descripcion || ""
                });
            }
        });

        let tabla = '';
        if (abonos.length > 0) {
            tabla = `
            <div class="w-full max-w-md mx-auto">
                <div class="divide-y divide-cyan-100 rounded-lg shadow bg-white">
                    ${abonos.map(a => `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2">
                            <div class="flex-1">
                                <div class="font-semibold text-cyan-800">$${parseFloat(a.monto).toFixed(2)}</div>
                                ${a.descripcion ? `<div class="text-xs text-gray-400">${a.descripcion}</div>` : ''}
                            </div>
                            <div class="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 text-sm text-right">
                                <span class="inline-block text-gray-600">${a.fecha}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="flex justify-between items-center px-3 py-3 bg-cyan-50 rounded-b-lg">
                        <span class="font-bold text-cyan-800">Total disponible</span>
                        <span class="font-bold text-lg text-cyan-700">$${saldoTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            `;
        } else {
            tabla = `<div class="text-gray-500 text-center py-6">No hay saldo a favor disponible.</div>`;
        }

        mostrarModal(`
            <div class="px-4 py-3 bg-green-500 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
                <h3 class="text-lg font-bold text-center">Saldo a Favor Actual</h3>
            </div>
            <div class="py-2">${tabla}</div>
            <div class="flex justify-end mt-2">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
            </div>
        `);
    } catch (error) {
        mostrarNotificacion("Error al cargar saldo a favor.", "error");
    }
}

// Función auxiliar para eliminar documentos (probablemente ya la tienes en ui.js o utilities.js)
// Si no la tienes, aquí una versión simple para inquilinos:
export async function eliminarDocumento(coleccion, id, callbackRefresh, callbackDashboard) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento? Esta acción es irreversible.')) {
        try {
            const docSnap = await getDoc(doc(db, coleccion, id));
            const data = docSnap.data();

            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Elemento eliminado con éxito.', 'success');

            // Si el inquilino eliminado estaba asociado a un inmueble, liberar el inmueble
            if (coleccion === 'inquilinos' && data && data.inmuebleAsociadoId) {
                await updateDocInmueble(doc(db, "inmuebles", data.inmuebleAsociadoId), {
                    estado: 'Disponible',
                    inquilinoActualId: null,
                    inquilinoActualNombre: null
                });
                mostrarNotificacion(`Inmueble ${data.inmuebleAsociadoNombre || 'anterior'} ha sido marcado como Disponible tras la eliminación del inquilino.`, 'info');
            }

            if (callbackRefresh) callbackRefresh();
            if (callbackDashboard) callbackDashboard();
        } catch (error) {
            console.error('Error al eliminar el documento:', error);
            mostrarNotificacion('Error al eliminar el elemento.', 'error');
        }
    }
}

// Al cargar los inquilinos, también cargar y asignar el orden correspondiente
window.addEventListener('load', async () => {
    try {
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        let inquilinosList = [];
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            inquilinosList.push({ id: doc.id, ...data });
        });

        // Ordenar inquilinos por el campo 'orden' (si existe)
        inquilinosList.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        // Asignar el orden a cada inquilino en la interfaz (puedes tener un contenedor específico para esto)
        const contenedorOrden = document.getElementById("contenidoOrden");
        if (contenedorOrden) {
            contenedorOrden.innerHTML = inquilinosList.map((inquilino, index) => `
                <div class="flex items-center py-2 ${index % 2 === 0 ? 'bg-gray-50' : ''}">
                    <span class="text-gray-700 font-semibold">${index + 1}.</span>
                    <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">${inquilino.nombre}</div>
                        <div class="text-xs text-gray-500">${inquilino.telefono}</div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Error al cargar inquilinos para orden:", error);
    }
});

import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm";

document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'recibioDeposito') {
        document.getElementById('campoDeposito').style.display = e.target.checked ? 'block' : 'none';
    }
});

// Nueva funcionalidad: Filtrar inquilinos con adeudos
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'filtroAdeudos') {
        const mostrarConAdeudos = e.target.checked;
        const listaInquilinos = document.getElementById('listaInquilinos');
        
        if (listaInquilinos) {
            listaInquilinos.querySelectorAll('.bg-white').forEach(card => {
                const inquilinoId = card.dataset.id;
                const badge = document.getElementById(`badge-adeudos-${inquilinoId}`);
                
                if (badge) {
                    const tieneAdeudos = badge.textContent !== "Sin adeudos";
                    card.style.display = mostrarConAdeudos && !tieneAdeudos ? 'none' : 'block';
                }
            });
        }
    }
});

// Agregar checkbox de filtro en la interfaz
const contenedorFiltros = document.getElementById("filtrosInquilinos");
if (contenedorFiltros) {
    contenedorFiltros.innerHTML += `
        <label class="inline-flex items-center">
            <input type="checkbox" id="filtroAdeudos" class="form-checkbox h-4 w-4 text-red-600">
            <span class="ml-2 text-sm text-red-700">Mostrar solo inquilinos con adeudos</span>
        </label>
    `;
}

// Nueva funcionalidad: Mostrar mobiliario asignado a inquilinos
window.mostrarMobiliarioAsignadoInquilino = async function(inquilinoId, inquilinoNombre) {
    const mobiliarioSnap = await getDocs(collection(db, "mobiliario"));
    let mobiliarioAsignado = [];
    mobiliarioSnap.forEach(doc => {
        const mob = doc.data();
        if (Array.isArray(mob.asignaciones)) {
            // Solo considerar asignaciones activas (activa !== false y cantidad > 0)
            const asignacion = mob.asignaciones.find(a => a.inquilinoId === inquilinoId && a.cantidad > 0 && a.activa !== false);
            if (asignacion) {
                mobiliarioAsignado.push({
                    nombre: mob.nombre,
                    descripcion: mob.descripcion || "",
                    costoRenta: mob.costoRenta || 0,
                    cantidad: asignacion.cantidad
                });
            }
        }
    });

    if (mobiliarioAsignado.length === 0) {
        mostrarModal(`
            <div class="px-4 py-3 bg-teal-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
                <h3 class="text-lg font-bold text-center">Mobiliario asignado a ${inquilinoNombre}</h3>
            </div>
            <div class="py-6 text-center text-gray-500 text-lg">No hay mobiliario asignado actualmente a este inquilino.</div>
            <div class="flex justify-end mt-2">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
            </div>
        `);
        return;
    }

    let total = 0;
    let tabla = `
        <div class="w-full max-w-md mx-auto">
            <div class="divide-y divide-teal-100 rounded-lg shadow bg-white">
                ${mobiliarioAsignado.map(mob => {
                    const subtotal = mob.cantidad * mob.costoRenta;
                    total += subtotal;
                    return `
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2">
                            <div class="flex-1">
                                <div class="font-semibold text-teal-800">${mob.nombre}</div>
                                ${mob.descripcion ? `<div class="text-xs text-gray-400">${mob.descripcion}</div>` : ''}
                            </div>
                            <div class="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 text-sm text-right">
                                <span class="inline-block bg-teal-50 text-teal-700 px-2 py-0.5 rounded">x${mob.cantidad}</span>
                                <span class="inline-block text-gray-600">$${mob.costoRenta.toFixed(2)} c/u</span>
                                <span class="inline-block font-bold text-teal-700">$${subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
                <div class="flex justify-between items-center px-3 py-3 bg-teal-50 rounded-b-lg">
                    <span class="font-bold text-teal-800">Total mobiliario</span>
                    <span class="font-bold text-lg text-teal-700">$${total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;

    mostrarModal(`
        <div class="px-4 py-3 bg-teal-600 text-white rounded-t-lg -mx-6 -mt-6 mb-4 shadow">
            <h3 class="text-lg font-bold text-center">Mobiliario asignado a ${inquilinoNombre}</h3>
        </div>
        <div class="py-2">${tabla}</div>
        <div class="flex justify-end mt-2">
            <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded shadow-sm transition-colors duration-200 w-full sm:w-auto">Cerrar</button>
        </div>
    `);
};


