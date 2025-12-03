// js/desperfectos.js
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from './firebaseConfig.js';
import { mostrarModal, ocultarModal, mostrarNotificacion, mostrarLoader, ocultarLoader } from './ui.js';

/**
 * Muestra la lista de desperfectos agrupados por inquilino en formato de tarjetas.
 */
export async function mostrarDesperfectos() {
    const contenedor = document.getElementById("contenido");
    if (!contenedor) {
        console.error("Contenedor 'contenido' no encontrado.");
        mostrarNotificacion("Error: No se pudo cargar la sección de desperfectos.", 'error');
        return;
    }

    mostrarLoader();

    try {
        const desperfectosSnap = await getDocs(collection(db, "desperfectos"));
        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));

        const inmueblesMap = new Map();
        inmueblesSnap.forEach(doc => {
            inmueblesMap.set(doc.id, doc.data().nombre);
        });

        const inquilinosMap = new Map();
        inquilinosSnap.forEach(doc => {
            const data = doc.data();
            const inmuebleNombre = data.inmuebleAsociadoId ? inmueblesMap.get(data.inmuebleAsociadoId) || 'Inmueble Desconocido' : 'No Asignado';
            inquilinosMap.set(doc.id, { id: doc.id, ...data, inmuebleNombre, inmuebleAsociadoId: data.inmuebleAsociadoId }); // Added inmuebleAsociadoId
        });

        const desperfectosPorInquilino = new Map();
        desperfectosSnap.forEach(doc => {
            const data = doc.data();
            const inquilinoId = data.inquilinoId;
            if (inquilinoId) {
                if (!desperfectosPorInquilino.has(inquilinoId)) {
                    desperfectosPorInquilino.set(inquilinoId, {
                        totalCosto: 0,
                        cantidadDesperfectos: 0,
                        inquilino: inquilinosMap.get(inquilinoId) || { nombre: 'Inquilino Desconocido', inmuebleNombre: 'N/A' }
                    });
                }
                const inquilinoDesperfectos = desperfectosPorInquilino.get(inquilinoId);
                inquilinoDesperfectos.totalCosto += Number(data.costoReparacion) || 0;
                inquilinoDesperfectos.cantidadDesperfectos++;
            }
        });

        let tarjetasDesperfectosHtml = "";
        const inquilinosConDesperfectos = Array.from(desperfectosPorInquilino.values());

        if (inquilinosConDesperfectos.length === 0) {
            tarjetasDesperfectosHtml = `
                <div class="col-span-full">
                    <div class="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <p class="text-gray-500 text-lg mb-6">No hay desperfectos registrados para ningún inquilino.</p>
                        <button onclick="mostrarFormularioNuevoDesperfecto()"
                            class="bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                            text-white font-medium px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                            flex items-center justify-center mx-auto border border-indigo-400/30">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Registrar Nuevo Desperfecto
                        </button>
                    </div>
                </div>`;
        } else {
            tarjetasDesperfectosHtml = inquilinosConDesperfectos.map(data => {
                const inquilino = data.inquilino;
                const inquilinoId = inquilino.id; // Assuming inquilino object has an id
                const inmuebleAsociadoId = inquilino.inmuebleAsociadoId; // Get the associated inmueble ID
                const totalCosto = data.totalCosto;
                const cantidadDesperfectos = data.cantidadDesperfectos;

                return `
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100">
                        <div class="p-4 sm:p-5 md:p-6">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-1">${inquilino.nombre}</h3>
                                    <p class="text-sm text-indigo-600 font-medium mb-2">${inquilino.inmuebleNombre !== 'No Asignado' ? inquilino.inmuebleNombre : 'Inmueble: No asignado'}</p>
                                    <div class="flex items-center space-x-2 mb-3">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            ${cantidadDesperfectos} Desperfecto${cantidadDesperfectos !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm text-gray-600">Costo Total</div>
                                    <div class="text-lg font-semibold text-gray-800">$${totalCosto.toFixed(2)}</div>
                                </div>
                            </div>

                            <div class="mt-4 flex flex-wrap gap-2 sm:gap-3">
                                <button onclick="mostrarFormularioNuevoDesperfecto(null, '${inquilinoId}', '${inmuebleAsociadoId}')"
                                        class="flex-1 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-indigo-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                    Registrar
                                </button>
                                <button onclick="mostrarTotalDesperfectosInquilino('${inquilinoId}')"
                                        class="flex-1 bg-gradient-to-br from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700
                                        text-white text-sm font-medium px-3 py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                                        flex items-center justify-center gap-1.5 border border-red-400/30">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    Ver Detalles
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
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        Gestión de Desperfectos por Inquilino
                    </h2>
                    <button onclick="mostrarFormularioNuevoDesperfecto()"
                            class="mt-4 sm:mt-0 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700
                            text-white font-medium px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                            flex items-center justify-center border border-indigo-400/30">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Registrar Nuevo Desperfecto
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    ${tarjetasDesperfectosHtml}
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Error al obtener desperfectos:", error);
        mostrarNotificacion("Error al cargar los desperfectos.", 'error');
    } finally {
        ocultarLoader();
    }
}

/**
 * Muestra el formulario para registrar un nuevo desperfecto o editar uno existente.
 * @param {string} [id] - ID del desperfecto a editar (opcional).
 * @param {string} [inquilinoIdPreseleccionado] - ID del inquilino a preseleccionar en el formulario (opcional).
 * @param {string} [inmuebleIdPreseleccionado] - ID del inmueble a preseleccionar en el formulario (opcional).
 */
export async function mostrarFormularioNuevoDesperfecto(id = null, inquilinoIdPreseleccionado = null, inmuebleIdPreseleccionado = null) {
    let desperfecto = null;
    let inmueblesList = [];
    let inquilinosList = [];
    let inmueblesMap = new Map(); // Map to store inmueble data for quick lookup

    try {
        const inmueblesSnap = await getDocs(collection(db, "inmuebles"));
        inmueblesSnap.forEach(doc => {
            const data = doc.data();
            inmueblesList.push({ id: doc.id, ...data });
            inmueblesMap.set(doc.id, { id: doc.id, ...data }); // Populate inmueblesMap with full data
        });

        const inquilinosSnap = await getDocs(collection(db, "inquilinos"));
        inquilinosSnap.forEach(doc => {
            inquilinosList.push({ id: doc.id, ...doc.data() });
        });

        if (id) {
            const docSnap = await getDoc(doc(db, "desperfectos", id));
            if (docSnap.exists()) {
                desperfecto = { id: docSnap.id, ...docSnap.data() };
            }
        }

        // NEW LOGIC: If no desperfecto is being edited and no inquilino is preselected,
        // try to pre-select if there's only one occupied inmueble.
        if (!id && !inquilinoIdPreseleccionado && !inmuebleIdPreseleccionado) { // Added !inmuebleIdPreseleccionado
            const occupiedInmuebles = inmueblesList.filter(inmueble =>
                inmueble.estado === 'Ocupado' && inmueble.inquilinoActualId
            );

            if (occupiedInmuebles.length === 1) {
                const singleOccupiedInmueble = occupiedInmuebles[0];
                desperfecto = { // Temporarily set desperfecto to pre-select values
                    inmuebleId: singleOccupiedInmueble.id,
                    inquilinoId: singleOccupiedInmueble.inquilinoActualId
                };
                inquilinoIdPreseleccionado = singleOccupiedInmueble.inquilinoActualId; // Ensure it's treated as preselected
                inmuebleIdPreseleccionado = singleOccupiedInmueble.id; // Ensure it's treated as preselected
            }
        }

    } catch (error) {
        console.error("Error al cargar datos para el formulario de desperfecto:", error);
        mostrarNotificacion("Error al cargar datos para el formulario de desperfecto.", 'error');
        return;
    }

    const tituloModal = id ? "Editar Desperfecto" : "Registrar Nuevo Desperfecto";

    const inmueblesOptions = inmueblesList.map(inmueble => `
        <option value="${inmueble.id}" ${desperfecto?.inmuebleId === inmueble.id || inmuebleIdPreseleccionado === inmueble.id ? 'selected' : ''}>
            ${inmueble.nombre}
        </option>
    `).join('');

    // Determine initial selected inquilino and if the field should be disabled
    let initialInquilinoId = desperfecto?.inquilinoId || inquilinoIdPreseleccionado || '';
    let isInquilinoFieldDisabled = false;
    let isInmuebleFieldDisabled = false; // New variable for inmueble field

    if (desperfecto?.inmuebleId) {
        const associatedInmueble = inmueblesMap.get(desperfecto.inmuebleId);
        if (associatedInmueble && associatedInmueble.inquilinoActualId) {
            initialInquilinoId = associatedInmueble.inquilinoActualId;
            isInquilinoFieldDisabled = true;
        }
    } else if (inquilinoIdPreseleccionado) {
        // If preselected from a card, disable it
        isInquilinoFieldDisabled = true;
    }

    // If inmuebleIdPreseleccionado is provided, disable the inmueble field
    if (inmuebleIdPreseleccionado) {
        isInmuebleFieldDisabled = true;
    }

    const inquilinosOptions = inquilinosList.map(inquilino => `
        <option value="${inquilino.id}" ${initialInquilinoId === inquilino.id ? 'selected' : ''}>
            ${inquilino.nombre}
        </option>
    `).join('');

    const estados = ["Pendiente", "Reparado", "Pagado"];
    const estadoOptions = estados.map(est => `
        <option value="${est}" ${desperfecto?.estado === est ? 'selected' : ''}>
            ${est}
        </option>
    `).join('');

    const modalContent = `
        <div class="relative">
            <button type="button" onclick="ocultarModal()"
                class="absolute top-2 right-2 z-20 bg-white/80 hover:bg-red-100 text-red-600 rounded-full p-2 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Cerrar">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            <div class="px-6 py-5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-t-2xl -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="flex items-center justify-center mb-2">
                    <svg class="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <h3 class="text-2xl font-extrabold text-center tracking-tight">${tituloModal}</h3>
                </div>
                <p class="text-center text-red-100 text-sm font-medium">Registro y seguimiento de daños</p>
            </div>
            <form id="formDesperfecto" class="space-y-5 px-4">
                <div class="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label for="inmuebleId" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                                Inmueble
                            </label>
                            <select id="inmuebleId" name="inmuebleId" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" ${isInmuebleFieldDisabled ? 'disabled' : ''} required>
                                <option value="">Selecciona un inmueble</option>
                                ${inmueblesOptions}
                            </select>
                        </div>
                        <div>
                            <label for="inquilinoId" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                Inquilino
                            </label>
                            <select id="inquilinoId" name="inquilinoId" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" ${isInquilinoFieldDisabled ? 'disabled' : ''} required>
                                <option value="">Selecciona un inquilino</option>
                                ${inquilinosOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
                    <div>
                        <label for="descripcion" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
                            </svg>
                            Descripción del Desperfecto
                        </label>
                        <textarea id="descripcion" name="descripcion" rows="3" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" placeholder="Describe detalladamente el desperfecto..." required>${desperfecto?.descripcion ?? ''}</textarea>
                    </div>
                </div>
                <div class="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label for="costoReparacion" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Costo de Reparación
                            </label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-medium">$</span>
                                <input type="number" id="costoReparacion" name="costoReparacion" step="0.01" class="block w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" value="${desperfecto?.costoReparacion ?? ''}" placeholder="0.00" required>
                            </div>
                        </div>
                        <div>
                            <label for="fechaReporte" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                Fecha del Reporte
                            </label>
                            <input type="date" id="fechaReporte" name="fechaReporte" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" value="${desperfecto?.fechaReporte ?? ''}" required>
                        </div>
                    </div>
                </div>
                <div class="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
                    <div>
                        <label for="estado" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Estado del Desperfecto
                        </label>
                        <select id="estado" name="estado" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 transition-all duration-200" required>
                            <option value="">Selecciona un estado</option>
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200/50">
                    <button type="button" onclick="ocultarModal()" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cancelar
                    </button>
                    <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        ${id ? "Actualizar" : "Registrar"} Desperfecto
                    </button>
                </div>
            </form>
        </div>
    `;

    mostrarModal(modalContent);

    // Add event listener for inmuebleId change
    const inmuebleSelect = document.getElementById('inmuebleId');
    const inquilinoSelect = document.getElementById('inquilinoId');

    inmuebleSelect.addEventListener('change', () => {
        const selectedInmuebleId = inmuebleSelect.value;
        let foundInquilinoId = '';

        if (selectedInmuebleId) {
            const associatedInmueble = inmueblesMap.get(selectedInmuebleId);
            if (associatedInmueble && associatedInmueble.inquilinoActualId) {
                foundInquilinoId = associatedInmueble.inquilinoActualId;
                inquilinoSelect.value = foundInquilinoId;
                inquilinoSelect.disabled = true;
            } else {
                inquilinoSelect.value = '';
                inquilinoSelect.disabled = false;
            }
        } else {
            inquilinoSelect.value = '';
            inquilinoSelect.disabled = false;
        }
    });

    // Trigger change event on load if an inmueble is already selected (for editing or preselection)
    if (desperfecto?.inmuebleId || inquilinoIdPreseleccionado || inmuebleIdPreseleccionado) {
        inmuebleSelect.dispatchEvent(new Event('change'));
    }


    document.getElementById('formDesperfecto').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // If inquilinoSelect was disabled, its value won't be in formData.
        // Manually add it from the disabled select element.
        if (inquilinoSelect.disabled) {
            data.inquilinoId = inquilinoSelect.value;
        }
        // If inmuebleSelect was disabled, its value won't be in formData.
        // Manually add it from the disabled select element.
        if (inmuebleSelect.disabled) {
            data.inmuebleId = inmuebleSelect.value;
        }

        data.costoReparacion = parseFloat(data.costoReparacion);

        try {
            if (id) {
                await updateDoc(doc(db, "desperfectos", id), data);
                mostrarNotificacion("Desperfecto actualizado con éxito.", 'success');
            } else {
                await addDoc(collection(db, "desperfectos"), data);
                mostrarNotificacion("Desperfecto registrado con éxito.", 'success');
            }
            ocultarModal();
            mostrarDesperfectos();
        } catch (err) {
            console.error("Error al guardar el desperfecto:", err);
            mostrarNotificacion("Error al guardar el desperfecto.", 'error');
        }
    });
}

export async function editarDesperfecto(id) {
    mostrarFormularioNuevoDesperfecto(id);
}

/**
 * Permite cambiar el estado de un desperfecto individual.
 * @param {string} desperfectoId - ID del desperfecto a actualizar.
 * @param {string} currentStatus - Estado actual del desperfecto.
 * @param {string} inquilinoId - ID del inquilino al que pertenece el desperfecto (para refrescar la vista).
 */
window.cambiarEstadoDesperfecto = async function (desperfectoId, currentStatus, inquilinoId) {
    const estados = ["Pendiente", "Reparado", "Pagado"];
    const estadoOptions = estados.map(est => `
        <option value="${est}" ${currentStatus === est ? 'selected' : ''}>
            ${est}
        </option>
    `).join('');

    const modalContent = `
        <div class="relative">
            <button type="button" onclick="ocultarModal()"
                class="absolute top-2 right-2 z-20 bg-white/80 hover:bg-red-100 text-red-600 rounded-full p-2 shadow transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Cerrar">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
            <div class="px-6 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-2xl -mx-6 -mt-6 mb-6 shadow-lg">
                <div class="flex items-center justify-center mb-2">
                    <svg class="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 class="text-2xl font-extrabold text-center tracking-tight">Cambiar Estado del Desperfecto</h3>
                </div>
                <p class="text-center text-blue-100 text-sm font-medium">Actualiza el estado de reparación</p>
            </div>
            <form id="formCambiarEstadoDesperfecto" class="space-y-5 px-4">
                <div class="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-gray-200/50 shadow-sm">
                    <div>
                        <label for="nuevoEstado" class="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Nuevo Estado
                        </label>
                        <select id="nuevoEstado" name="nuevoEstado" class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 transition-all duration-200" required>
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200/50">
                    <button type="button" onclick="ocultarModal()" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Cancelar
                    </button>
                    <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Actualizar Estado
                    </button>
                </div>
            </form>
        </div>
    `;

    mostrarModal(modalContent);

    document.getElementById('formCambiarEstadoDesperfecto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoEstado = document.getElementById('nuevoEstado').value;

        try {
            await updateDoc(doc(db, "desperfectos", desperfectoId), { estado: nuevoEstado });
            mostrarNotificacion("Estado del desperfecto actualizado con éxito.", 'success');
            ocultarModal();
            mostrarTotalDesperfectosInquilino(inquilinoId); // Refresh the details modal
        } catch (error) {
            console.error("Error al actualizar el estado del desperfecto:", error);
            mostrarNotificacion("Error al actualizar el estado del desperfecto.", 'error');
        }
    });
}

/**
 * Función para eliminar un desperfecto.
 * @param {string} coleccion - Nombre de la colección (debería ser 'desperfectos').
 * @param {string} id - ID del documento a eliminar.
 * @param {function} callbackRefresh - Función a llamar para refrescar la tabla después de la eliminación.
 */
window.eliminarDocumento = async function (coleccion, id, callbackRefresh) {
    if (confirm('¿Estás seguro de que quieres eliminar este desperfecto? Esta acción es irreversible.')) {
        try {
            await deleteDoc(doc(db, coleccion, id));
            mostrarNotificacion('Desperfecto eliminado con éxito.', 'success');
            if (callbackRefresh) callbackRefresh();
        } catch (error) {
            console.error('Error al eliminar el desperfecto:', error);
            mostrarNotificacion('Error al eliminar el desperfecto.', 'error');
        }
    }
}

/**
 * Muestra el total de desperfectos de un inquilino en un modal.
 * @param {string} inquilinoId - ID del inquilino.
 */
export async function mostrarTotalDesperfectosInquilino(inquilinoId) {
    try {
        const desperfectosSnap = await getDocs(query(collection(db, "desperfectos"), where("inquilinoId", "==", inquilinoId)));
        const inquilinoSnap = await getDoc(doc(db, "inquilinos", inquilinoId));

        if (!inquilinoSnap.exists()) {
            mostrarNotificacion("Inquilino no encontrado.", "error");
            return;
        }

        const inquilinoNombre = inquilinoSnap.data().nombre;

        let totalCosto = 0;
        let desperfectosList = [];
        desperfectosSnap.forEach(doc => {
            const data = doc.data();
            totalCosto += Number(data.costoReparacion) || 0;
            desperfectosList.push({ id: doc.id, ...data });
        });

        let tablaHtml = '';
        if (desperfectosList.length > 0) {
            tablaHtml = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${desperfectosList.map((d, index) => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-800">${d.descripcion || 'Sin descripción'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-800">$${(Number(d.costoReparacion) || 0).toFixed(2)}</td>
                                    <td class="px-4 py-2 text-sm"><span class="px-2 py-0.5 text-xs rounded-full font-semibold ${d.estado === 'Pendiente' ? 'bg-red-100 text-red-800' : d.estado === 'Reparado' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${d.estado || 'N/A'}</span></td>
                                    <td class="px-4 py-2 text-sm">
                                        <div class="pill-menu-container">
                                            <button class="pill-menu-button bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 shadow-md transition-all duration-200">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                                </svg>
                                            </button>
                                            <div class="pill-menu-actions">
                                                <a href="#" 
                                                    onclick="event.preventDefault(); cambiarEstadoDesperfecto('${d.id}', '${d.estado}', '${inquilinoId}')"
                                                    class="text-blue-600 hover:text-white"
                                                    style="--icon-color: #3b82f6;"
                                                    title="Cambiar Estado">
                                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    <span class="pill-menu-text">Estado</span>
                                                </a>
                                                <a href="#" 
                                                    onclick="event.preventDefault(); editarDesperfecto('${d.id}')"
                                                    class="text-yellow-600 hover:text-white"
                                                    style="--icon-color: #eab308;"
                                                    title="Editar">
                                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                    </svg>
                                                    <span class="pill-menu-text">Editar</span>
                                                </a>
                                                <a href="#" 
                                                    onclick="event.preventDefault(); eliminarDocumento('desperfectos', '${d.id}', () => mostrarTotalDesperfectosInquilino('${inquilinoId}'))"
                                                    class="text-red-600 hover:text-white"
                                                    style="--icon-color: #ef4444;"
                                                    title="Eliminar">
                                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                    <span class="pill-menu-text">Eliminar</span>
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-end items-center mt-4 px-4 py-2 bg-gray-50 rounded-lg">
                    <span class="text-lg font-bold text-gray-800">Total:</span>
                    <span class="text-xl font-bold text-red-600 ml-2">$${totalCosto.toFixed(2)} MXN</span>
                </div>
            `;
        } else {
            tablaHtml = `<p class="text-gray-500 text-center py-6">No hay desperfectos registrados para este inquilino.</p>`;
        }

        const modalContent = `
            <div class="px-4 py-3 bg-red-500 text-white rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3 class="text-xl sm:text-2xl font-bold text-center">Desperfectos de ${inquilinoNombre}</h3>
            </div>
            <div class="py-2">
                ${tablaHtml}
            </div>
            <div class="flex justify-end mt-6">
                <button type="button" onclick="ocultarModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-5 py-2 rounded-md shadow-sm transition-colors duration-200">Cerrar</button>
            </div>
        `;

        mostrarModal(modalContent);

        // Attach pill menu listeners
        setTimeout(() => {
            document.querySelectorAll('.pill-menu-container').forEach(container => {
                const button = container.querySelector('.pill-menu-button');
                if (button && !button.dataset.pillMenuAttached) {
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

            // Close pill menus when clicking outside
            document.addEventListener('click', function closePillMenus(e) {
                if (!e.target.closest('.pill-menu-container')) {
                    document.querySelectorAll('.pill-menu-container.active').forEach(container => {
                        container.classList.remove('active');
                    });
                }
            });
        }, 100);

    } catch (error) {
        console.error("Error al mostrar total de desperfectos:", error);
        mostrarNotificacion("Error al cargar el total de desperfectos del inquilino.", 'error');
    }
}
