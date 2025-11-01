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
            <div class="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-t-xl -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 sm:mb-6">
                <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    ${tituloModal}
                </h3>
            </div>
            <form id="formDesperfecto" class="space-y-4 sm:space-y-6 px-4">
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label for="inmuebleId" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Inmueble</label>
                            <select id="inmuebleId" name="inmuebleId" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" ${isInmuebleFieldDisabled ? 'disabled' : ''} required>
                                <option value="">Selecciona un inmueble</option>
                                ${inmueblesOptions}
                            </select>
                        </div>
                        <div>
                            <label for="inquilinoId" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Inquilino</label>
                            <select id="inquilinoId" name="inquilinoId" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" ${isInquilinoFieldDisabled ? 'disabled' : ''} required>
                                <option value="">Selecciona un inquilino</option>
                                ${inquilinosOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div>
                        <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Descripción</label>
                        <textarea id="descripcion" name="descripcion" rows="3" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" placeholder="Breve descripción del desperfecto." required>${desperfecto?.descripcion ?? ''}</textarea>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label for="costoReparacion" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Costo de Reparación</label>
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center text-gray-500">$</span>
                                <input type="number" id="costoReparacion" name="costoReparacion" step="0.01" class="block w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" value="${desperfecto?.costoReparacion ?? ''}" placeholder="0.00" required>
                            </div>
                        </div>
                        <div>
                            <label for="fechaReporte" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Fecha del Reporte</label>
                            <input type="date" id="fechaReporte" name="fechaReporte" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" value="${desperfecto?.fechaReporte ?? ''}" required>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div>
                        <label for="estado" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Estado</label>
                        <select id="estado" name="estado" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" required>
                            <option value="">Selecciona un estado</option>
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <button type="button" onclick="ocultarModal()" class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">Cancelar</button>
                    <button type="submit" class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center justify-center">${id ? "Actualizar" : "Registrar"} Desperfecto</button>
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

window.editarDesperfecto = async function(id) {
    mostrarFormularioNuevoDesperfecto(id);
}

/**
 * Permite cambiar el estado de un desperfecto individual.
 * @param {string} desperfectoId - ID del desperfecto a actualizar.
 * @param {string} currentStatus - Estado actual del desperfecto.
 * @param {string} inquilinoId - ID del inquilino al que pertenece el desperfecto (para refrescar la vista).
 */
window.cambiarEstadoDesperfecto = async function(desperfectoId, currentStatus, inquilinoId) {
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
            <div class="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-xl -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 sm:mb-6">
                <h3 class="text-xl sm:text-2xl font-bold text-center flex items-center justify-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3 3 7-7"/>
                    </svg>
                    Cambiar Estado del Desperfecto
                </h3>
            </div>
            <form id="formCambiarEstadoDesperfecto" class="space-y-4 sm:space-y-6 px-4">
                <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <div>
                        <label for="nuevoEstado" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">Nuevo Estado</label>
                        <select id="nuevoEstado" name="nuevoEstado" class="block w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-200" required>
                            ${estadoOptions}
                        </select>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                    <button type="button" onclick="ocultarModal()" class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center">Cancelar</button>
                    <button type="submit" class="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center justify-center">Actualizar Estado</button>
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
window.eliminarDocumento = async function(coleccion, id, callbackRefresh) {
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
                            ${desperfectosList.map(d => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-800">${d.descripcion || 'Sin descripción'}</td>
                                    <td class="px-4 py-2 text-sm text-gray-800">${(Number(d.costoReparacion) || 0).toFixed(2)}</td>
                                    <td class="px-4 py-2 text-sm"><span class="px-2 py-0.5 text-xs rounded-full font-semibold ${d.estado === 'Pendiente' ? 'bg-red-100 text-red-800' : d.estado === 'Reparado' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${d.estado || 'N/A'}</span></td>
                                    <td class="px-4 py-2 text-sm">
                                        <div class="flex items-center space-x-2">
                                            <button onclick="cambiarEstadoDesperfecto('${d.id}', '${d.estado}', '${inquilinoId}')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium px-2 py-1 rounded-md text-xs">Estado</button>
                                            <button onclick="editarDesperfecto('${d.id}')" class="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium px-2 py-1 rounded-md text-xs">Editar</button>
                                            <button onclick="eliminarDocumento('desperfectos', '${d.id}', () => mostrarTotalDesperfectosInquilino('${inquilinoId}'))" class="bg-red-100 hover:bg-red-200 text-red-800 font-medium px-2 py-1 rounded-md text-xs">Eliminar</button>
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

    } catch (error) {
        console.error("Error al mostrar total de desperfectos:", error);
        mostrarNotificacion("Error al cargar el total de desperfectos del inquilino.", 'error');
    }
}
